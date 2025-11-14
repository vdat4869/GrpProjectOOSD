# ai-service/main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timedelta
import json, os, logging

import pymongo  # đảm bảo dependency
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis  # dùng client ASYNC

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

app = FastAPI(
    title="EV Co-ownership AI Service",
    description="AI service for fair scheduling, cost optimization, and group decision suggestions",
    version="1.2.0",
    openapi_tags=[
        {"name": "health", "description": "Service health & readiness"},
        {"name": "suggestions", "description": "AI suggestions endpoints"},
    ],
)

# ---- Config qua ENV
ALPHA = float(os.getenv("FAIRNESS_ALPHA", "0.6"))
BETA = float(os.getenv("FAIRNESS_BETA", "0.4"))
RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "0") == "1"

# CORS
allow_origins = [o for o in os.getenv("CORS_ALLOW_ORIGINS", "*").split(",") if o]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Clients
mongodb_client: Optional[AsyncIOMotorClient] = None
mongodb_db = None
redis_client: Optional[redis.Redis] = None

# ---- Models
class BookingSuggestionRequest(BaseModel):
    vehicle_group_id: str
    requested_start: datetime
    requested_end: datetime
    co_owner_id: str
    ownership_percentage: float = Field(ge=0, le=1)
    usage_history: Optional[List[Dict[str, Any]]] = None

    @field_validator("requested_end")
    @classmethod
    def _end_after_start(cls, v, info):
        start = info.data.get("requested_start")
        if start and v <= start:
            raise ValueError("requested_end must be greater than requested_start")
        return v

class BookingSuggestionResponse(BaseModel):
    suggested_start: datetime
    suggested_end: datetime
    fairness_score: float
    reason: str
    alternative_slots: Optional[List[Dict[str, datetime]]] = None
    explain: Optional[Dict[str, Any]] = None

CostType = Literal["maintenance", "insurance", "charging", "cleaning", "inspection"]

class CostSharingSuggestionRequest(BaseModel):
    vehicle_group_id: str
    total_cost: float = Field(gt=0)
    cost_type: CostType
    co_owners: List[Dict[str, Any]]

    @field_validator("co_owners")
    @classmethod
    def _not_empty(cls, v):
        if not v:
            raise ValueError("co_owners must not be empty")
        return v

class CostSharingSuggestionResponse(BaseModel):
    suggestions: List[Dict[str, Any]]
    total_suggested: float
    method: str  # "ownership_based", "usage_based", "hybrid"

ProposalType = Literal["upgrade_battery", "repair", "sell_vehicle", "insurance_change"]

class VotingSuggestionRequest(BaseModel):
    vehicle_group_id: str
    proposal_type: ProposalType
    proposal_details: Dict[str, Any]

class VotingSuggestionResponse(BaseModel):
    recommendation: str
    reasoning: str
    suggested_modifications: Optional[Dict[str, Any]] = None
    risk_assessment: Optional[Dict[str, Any]] = None

# ---- Error handler
@app.exception_handler(Exception)
async def unhandled_exc(_: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"error": "internal_error", "message": str(exc)})

# ---- (tuỳ chọn) Rate limit bằng Redis
@app.middleware("http")
async def ratelimit(request: Request, call_next):
    if RATE_LIMIT_ENABLED and redis_client:
        try:
            key = f"rl:{request.client.host}"
            count = await redis_client.incr(key)
            if count == 1:
                await redis_client.expire(key, 60)
            if count > RATE_LIMIT:
                return JSONResponse({"detail": "Too Many Requests"}, status_code=429)
        except Exception as e:
            logger.warning("Rate limit failed (ignored): %s", e)
    return await call_next(request)

# ---- Lifecycle
@app.on_event("startup")
async def startup_event():
    global mongodb_client, mongodb_db, redis_client

    # MongoDB
    mongodb_uri = os.getenv(
        "MONGODB_URI",
        "mongodb://mongoadmin:mongopass123@mongodb:27017/ai_db?authSource=admin",
    )
    try:
        mongodb_client = AsyncIOMotorClient(mongodb_uri)
        mongodb_db = mongodb_client.ai_db
        await mongodb_client.admin.command("ping")
        logger.info("Connected to MongoDB")
    except Exception:
        logger.exception("Failed to connect to MongoDB")

    # Redis (async)
    try:
        redis_host = os.getenv("REDIS_HOST", "redis")
        redis_port = int(os.getenv("REDIS_PORT", "6379"))
        redis_client = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        pong = await redis_client.ping()
        logger.info(f"Connected to Redis (ping={pong})")
    except Exception:
        logger.exception("Failed to connect to Redis")

@app.on_event("shutdown")
async def shutdown_event():
    if mongodb_client:
        mongodb_client.close()
    if redis_client:
        try:
            await redis_client.close()
        except Exception:
            pass

# ---- Health
@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "healthy", "service": "ai-service", "timestamp": datetime.utcnow().isoformat()}

@app.get("/ready", tags=["health"])
async def ready_check():
    mongo_ok = False
    redis_ok = False
    if mongodb_client:
        try:
            await mongodb_client.admin.command("ping")
            mongo_ok = True
        except Exception:
            mongo_ok = False
    if redis_client:
        try:
            await redis_client.ping()
            redis_ok = True
        except Exception:
            redis_ok = False
    return {"mongo": mongo_ok, "redis": redis_ok, "ready": mongo_ok and redis_ok}

# ---- Suggestions
@app.post("/api/ai/suggestions/booking", response_model=BookingSuggestionResponse, tags=["suggestions"])
async def suggest_booking_fairness(request: BookingSuggestionRequest):
    try:
        cache_key = f"usage_history:{request.vehicle_group_id}"
        usage_history = request.usage_history
        if not usage_history and redis_client:
            cached = await redis_client.get(cache_key)
            if cached:
                try: usage_history = json.loads(cached)
                except Exception: usage_history = None

        ownership_weight = request.ownership_percentage
        recent_usage_hours = 0.0
        if usage_history:
            recent_usage_hours = sum(
                float(item.get("hours", 0))
                for item in usage_history
                if item.get("co_owner_id") == request.co_owner_id
            )

        expected_hours = ownership_weight * 24 * 30
        over_ratio = (recent_usage_hours / expected_hours) if expected_hours > 0 else 0.0
        usage_penalty = max(0.0, (over_ratio - 1.0) * 0.3)
        fairness_score = max(0.0, min(1.0, ownership_weight - usage_penalty))

        suggested_start = request.requested_start
        suggested_end = request.requested_end

        alternative_slots = None
        if fairness_score < 0.5:
            req_dur = (request.requested_end - request.requested_start)
            min_dur = max(timedelta(minutes=30), req_dur * 0.5)
            candidates = [
                (request.requested_start + timedelta(hours=1),
                 request.requested_start + timedelta(hours=1) + min_dur),
                (request.requested_start.replace(hour=22, minute=0, second=0, microsecond=0),
                 request.requested_start.replace(hour=22, minute=0, second=0, microsecond=0) + min_dur),
                (request.requested_start + timedelta(days=1),
                 request.requested_start + timedelta(days=1) + req_dur),
            ]
            alternative_slots = [{"start": s, "end": e} for s, e in candidates if e > s]
            reason = "Lower priority due to usage history. Suggested shorter/off-peak duration."
        else:
            reason = f"Fair booking slot based on {ownership_weight*100:.1f}% ownership"

        if redis_client and request.usage_history:
            try: await redis_client.setex(cache_key, 300, json.dumps(request.usage_history))
            except Exception: pass

        return BookingSuggestionResponse(
            suggested_start=suggested_start,
            suggested_end=suggested_end,
            fairness_score=fairness_score,
            reason=reason,
            alternative_slots=alternative_slots,
            explain={
                "ownership_percent": ownership_weight,
                "recent_usage_hours_30d": recent_usage_hours,
                "expected_hours_30d": expected_hours,
            },
        )
    except Exception as e:
        logger.error(f"Error in booking suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/suggestions/cost-sharing", response_model=CostSharingSuggestionResponse, tags=["suggestions"])
async def suggest_cost_sharing(request: CostSharingSuggestionRequest):
    try:
        total_ownership = sum(float(co["ownership_percentage"]) for co in request.co_owners) or 1.0
        total_usage_hours = sum(float(co.get("usage_hours", 0)) for co in request.co_owners)

        suggestions: List[Dict[str, Any]] = []
        total_suggested = 0.0

        if request.cost_type in ["maintenance", "insurance", "inspection"]:
            method = "ownership_based"
            for co in request.co_owners:
                amount = request.total_cost * (float(co["ownership_percentage"]) / total_ownership)
                suggestions.append({
                    "co_owner_id": co["id"],
                    "suggested_amount": round(amount, 2),
                    "reason": f"Based on {float(co['ownership_percentage'])*100:.1f}% ownership",
                })
                total_suggested += amount

        elif request.cost_type in ["charging", "cleaning"]:
            method = "usage_based"
            if total_usage_hours > 0:
                for co in request.co_owners:
                    usage_ratio = float(co.get("usage_hours", 0)) / total_usage_hours
                    amount = request.total_cost * usage_ratio
                    suggestions.append({
                        "co_owner_id": co["id"],
                        "suggested_amount": round(amount, 2),
                        "reason": f"Based on {float(co.get('usage_hours', 0)):.1f}h usage ({usage_ratio*100:.1f}%)",
                    })
                    total_suggested += amount
            else:
                method = "ownership_based"
                for co in request.co_owners:
                    amount = request.total_cost * (float(co["ownership_percentage"]) / total_ownership)
                    suggestions.append({
                        "co_owner_id": co["id"],
                        "suggested_amount": round(amount, 2),
                        "reason": f"Based on {float(co['ownership_percentage'])*100:.1f}% ownership (no usage data)",
                    })
                    total_suggested += amount

        else:
            method = "hybrid"
            if total_usage_hours <= 0:
                for co in request.co_owners:
                    ownership_weight = float(co["ownership_percentage"]) / total_ownership
                    amount = request.total_cost * ownership_weight
                    suggestions.append({
                        "co_owner_id": co["id"],
                        "suggested_amount": round(amount, 2),
                        "reason": "Hybrid degenerated to ownership (no usage data)",
                    })
                    total_suggested += amount
            else:
                for co in request.co_owners:
                    ownership_weight = float(co["ownership_percentage"]) / total_ownership
                    usage_weight = float(co.get("usage_hours", 0)) / total_usage_hours
                    combined_weight = ownership_weight * ALPHA + usage_weight * BETA
                    amount = request.total_cost * combined_weight
                    suggestions.append({
                        "co_owner_id": co["id"],
                        "suggested_amount": round(amount, 2),
                        "reason": f"Hybrid: {ownership_weight*100:.1f}% *{ALPHA} + {usage_weight*100:.1f}% *{BETA}",
                    })
                    total_suggested += amount

        return CostSharingSuggestionResponse(
            suggestions=suggestions,
            total_suggested=round(total_suggested, 2),
            method=method,
        )
    except Exception as e:
        logger.error(f"Error in cost sharing suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/suggestions/voting", response_model=VotingSuggestionResponse, tags=["suggestions"])
async def suggest_voting_decision(request: VotingSuggestionRequest):
    try:
        proposal_type = request.proposal_type
        details = request.proposal_details

        recommendation = "approve"
        reasoning = ""
        suggested_modifications = None
        risk_assessment = None

        if proposal_type == "upgrade_battery":
            cost = float(details.get("cost", 0))
            if cost > 100_000_000:
                recommendation = "modify"
                reasoning = "High cost upgrade. Consider phased approach or group discussion."
                suggested_modifications = {"phased_approach": True, "discuss_financing": True}
                risk_assessment = {"financial_risk": "high", "benefit_risk": "medium"}
            else:
                reasoning = "Reasonable battery upgrade cost. Benefits all co-owners."
                risk_assessment = {"financial_risk": "low", "benefit_risk": "low"}

        elif proposal_type == "repair":
            cost = float(details.get("cost", 0))
            urgency = str(details.get("urgency", "low")).lower()
            if urgency == "high":
                recommendation = "approve"
                reasoning = "Urgent repair needed for vehicle safety and functionality."
            elif cost > 50_000_000:
                recommendation = "modify"
                reasoning = "High repair cost. Get multiple quotes before approval."
                suggested_modifications = {"get_quotes": True, "minimum_quotes": 3}
            else:
                reasoning = "Standard repair cost. Proceed with approval."

        elif proposal_type == "sell_vehicle":
            recommendation = "modify"
            reasoning = "Major decision. Ensure all co-owners agree and understand terms."
            suggested_modifications = {"require_unanimous_vote": True, "legal_review": True}
            risk_assessment = {"legal_risk": "high", "financial_risk": "medium"}

        elif proposal_type == "insurance_change":
            cost_change = float(details.get("cost_change_percentage", 0))
            if abs(cost_change) > 20:
                recommendation = "modify"
                reasoning = f"Significant cost change ({cost_change}%). Review coverage details."
                suggested_modifications = {"compare_coverage": True, "review_terms": True}
            else:
                reasoning = f"Reasonable insurance change. Cost impact: {cost_change}%"
        else:
            recommendation = "approve"
            reasoning = "Proposal appears reasonable. Review details with co-owners."

        return VotingSuggestionResponse(
            recommendation=recommendation,
            reasoning=reasoning,
            suggested_modifications=suggested_modifications,
            risk_assessment=risk_assessment,
        )
    except Exception as e:
        logger.error(f"Error in voting suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/suggestions/fairness-check")
async def check_usage_fairness(vehicle_group_id: str, days: int = 30):
    try:
        return {
            "vehicle_group_id": vehicle_group_id,
            "period_days": days,
            "fairness_score": 0.85,
            "recommendations": [
                "Usage is generally fair",
                "Consider rotating priority for peak hours",
            ],
            "co_owner_usage": [],
        }
    except Exception:
        logger.exception("Error in fairness check")
        raise HTTPException(status_code=500, detail="internal_error")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
