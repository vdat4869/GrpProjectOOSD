# ai-service/main.py
from __future__ import annotations

import json, os, logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any, Literal
import threading

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel, Field, model_validator
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis
from prometheus_fastapi_instrumentator import Instrumentator
from rabbitmq_consumer import RabbitMQConsumer

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("ai-service")

app = FastAPI(
    title="EV Co-ownership AI Service",
    description="AI service for fair scheduling, cost optimization, and group decision suggestions",
    version="1.3.0",
    default_response_class=ORJSONResponse,
    openapi_tags=[
        {"name": "health", "description": "Service health & readiness"},
        {"name": "suggestions", "description": "AI suggestions endpoints"},
    ],
)

# ---- Config qua ENV
ALPHA = float(os.getenv("FAIRNESS_ALPHA", "0.6"))
BETA = float(os.getenv("FAIRNESS_BETA", "0.4"))
# chuẩn hoá để ALPHA + BETA = 1 (tránh cấu hình sai)
_total = max(ALPHA + BETA, 1e-9)
ALPHA, BETA = ALPHA / _total, BETA / _total

RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "0") == "1"

# CORS (tránh * + credentials)
origins_env = os.getenv("CORS_ALLOW_ORIGINS", "*")
allow_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "0") == "1" and "*" not in allow_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Clients
mongodb_client: Optional[AsyncIOMotorClient] = None
mongodb_db = None
redis_client: Optional[redis.Redis] = None
rabbitmq_consumer: Optional[RabbitMQConsumer] = None
rabbitmq_thread: Optional[threading.Thread] = None


# ---- Helpers
def _utc(dt: datetime) -> datetime:
    """Đảm bảo datetime có tzinfo UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def _client_ip(req: Request) -> str:
    xfwd = req.headers.get("x-forwarded-for")
    if xfwd:
        return xfwd.split(",")[0].strip()
    return req.headers.get("x-real-ip", req.client.host or "unknown")


# ---- Models
class AlternativeSlot(BaseModel):
    start: datetime
    end: datetime

class BookingSuggestionRequest(BaseModel):
    vehicle_group_id: str
    requested_start: datetime
    requested_end: datetime
    co_owner_id: str
    ownership_percentage: float = Field(ge=0, le=1)
    usage_history: Optional[List[Dict[str, Any]]] = None

    @model_validator(mode="after")
    def _time_window_valid(self):
        if self.requested_end <= self.requested_start:
            raise ValueError("requested_end must be greater than requested_start")
        return self

class BookingSuggestionResponse(BaseModel):
    suggested_start: datetime
    suggested_end: datetime
    fairness_score: float
    reason: str
    alternative_slots: Optional[List[AlternativeSlot]] = None
    explain: Optional[Dict[str, Any]] = None

CostType = Literal["maintenance", "insurance", "charging", "cleaning", "inspection"]

class CostSharingSuggestionRequest(BaseModel):
    vehicle_group_id: str
    total_cost: float = Field(gt=0)
    cost_type: CostType
    co_owners: List[Dict[str, Any]]

    @model_validator(mode="after")
    def _validate_coowners(self):
        if not self.co_owners:
            raise ValueError("co_owners must not be empty")
        return self

class CostSharingSuggestionResponse(BaseModel):
    suggestions: List[Dict[str, Any]]
    total_suggested: float
    method: str  # "ownership_based", "usage_based", "hybrid"

ProposalType = Literal["upgrade_battery", "repair", "sell_vehicle", "insurance_change", "maintenance", "other"]

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
            ip = _client_ip(request)
            key = f"rl:{ip}"
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

    # Prometheus /metrics
    if os.getenv("METRICS_ENABLED", "1") == "1":
        try:
            Instrumentator().instrument(app).expose(app, include_in_schema=False)
            logger.info("Prometheus metrics enabled at /metrics")
        except Exception:
            logger.exception("Failed to enable Prometheus metrics")

    # MongoDB
    mongodb_uri = os.getenv(
        "MONGODB_URI",
        "mongodb://mongoadmin:mongopass123@mongodb:27017/ai_db?authSource=admin",
    )
    try:
        mongodb_client = AsyncIOMotorClient(
            mongodb_uri, serverSelectionTimeoutMS=2000, uuidRepresentation="standard"
        )
        mongodb_db = mongodb_client.get_default_database() or mongodb_client.ai_db
        await mongodb_client.admin.command("ping")
        sanitized = mongodb_uri.replace(os.getenv("MONGO_PASSWORD", "mongopass123"), "***")
        logger.info("Connected to MongoDB (%s)", sanitized)
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
    
    # RabbitMQ Consumer (in background thread)
    global rabbitmq_consumer, rabbitmq_thread
    try:
        rabbitmq_consumer = RabbitMQConsumer(mongodb_client, redis_client, mongodb_db)
        if rabbitmq_consumer.connect():
            rabbitmq_thread = threading.Thread(
                target=rabbitmq_consumer.start_consuming,
                daemon=True,
                name="RabbitMQConsumer"
            )
            rabbitmq_thread.start()
            logger.info("RabbitMQ consumer started in background thread")
        else:
            logger.warning("Failed to connect to RabbitMQ. Consumer not started.")
    except Exception:
        logger.exception("Failed to start RabbitMQ consumer")


@app.on_event("shutdown")
async def shutdown_event():
    global rabbitmq_consumer
    if rabbitmq_consumer:
        try:
            rabbitmq_consumer.close()
            logger.info("RabbitMQ consumer stopped")
        except Exception:
            logger.exception("Error closing RabbitMQ consumer")
    
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
    return {"status": "healthy", "service": "ai-service", "timestamp": datetime.now(timezone.utc).isoformat()}

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

@app.get("/version", tags=["health"])
async def version():
    return {"version": app.version}


# ---- Suggestions
@app.post("/api/ai/suggestions/booking", response_model=BookingSuggestionResponse, tags=["suggestions"])
async def suggest_booking_fairness(req: BookingSuggestionRequest):
    try:
        # Chuẩn hoá về UTC
        req_start = _utc(req.requested_start)
        req_end = _utc(req.requested_end)

        # Lấy usage_history từ cache
        cache_key = f"usage_history:{req.vehicle_group_id}"
        usage_history = req.usage_history
        if not usage_history and redis_client:
            cached = await redis_client.get(cache_key)
            if cached:
                try:
                    usage_history = json.loads(cached)
                except Exception:
                    usage_history = None

        ownership_weight = req.ownership_percentage

        recent_usage_hours = 0.0
        if usage_history:
            recent_usage_hours = sum(
                float(item.get("hours", 0))
                for item in usage_history
                if item.get("co_owner_id") == req.co_owner_id
            )

        # Kỳ vọng trong 30 ngày ~ 720h * ownership
        expected_hours = ownership_weight * 24 * 30
        over_ratio = (recent_usage_hours / expected_hours) if expected_hours > 0 else 0.0
        usage_penalty = max(0.0, (over_ratio - 1.0) * 0.3)  # penalty tăng khi dùng > kỳ vọng
        fairness_score = max(0.0, min(1.0, ownership_weight - usage_penalty))

        suggested_start, suggested_end = req_start, req_end

        alternative_slots: Optional[List[AlternativeSlot]] = None
        if fairness_score < 0.5:
            req_dur = (req_end - req_start)
            min_dur = max(timedelta(minutes=30), req_dur * 0.5)
            candidates = [
                (req_start + timedelta(hours=1), (req_start + timedelta(hours=1)) + min_dur),
                (req_start.replace(hour=22, minute=0, second=0, microsecond=0), 
                 req_start.replace(hour=22, minute=0, second=0, microsecond=0) + min_dur),
                (req_start + timedelta(days=1), (req_start + timedelta(days=1)) + req_dur),
            ]
            alternative_slots = [
                AlternativeSlot(start=s, end=e) for s, e in candidates if e > s
            ]
            reason = "Lower priority due to usage history. Suggested shorter/off-peak duration."
        else:
            reason = f"Fair booking slot based on {ownership_weight*100:.1f}% ownership"

        # Cache lại usage_history nếu client gửi kèm
        if redis_client and req.usage_history:
            try:
                await redis_client.setex(cache_key, 300, json.dumps(req.usage_history))
            except Exception:
                pass

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
async def suggest_cost_sharing(req: CostSharingSuggestionRequest):
    try:
        total_ownership = sum(float(co["ownership_percentage"]) for co in req.co_owners) or 1.0
        total_usage_hours = sum(float(co.get("usage_hours", 0)) for co in req.co_owners)

        suggestions: List[Dict[str, Any]] = []
        unrounded: List[float] = []
        method = "hybrid"

        def _append(co_id: str, amount: float, reason: str):
            unrounded.append(amount)
            suggestions.append({"co_owner_id": co_id, "suggested_amount": None, "reason": reason})

        if req.cost_type in ["maintenance", "insurance", "inspection"]:
            method = "ownership_based"
            for co in req.co_owners:
                weight = float(co["ownership_percentage"]) / total_ownership
                _append(co["id"], req.total_cost * weight, f"Based on {float(co['ownership_percentage'])*100:.1f}% ownership")

        elif req.cost_type in ["charging", "cleaning"]:
            method = "usage_based"
            if total_usage_hours > 0:
                for co in req.co_owners:
                    usage_ratio = float(co.get("usage_hours", 0)) / total_usage_hours
                    _append(co["id"], req.total_cost * usage_ratio,
                            f"Based on {float(co.get('usage_hours', 0)):.1f}h usage ({usage_ratio*100:.1f}%)")
            else:
                method = "ownership_based"
                for co in req.co_owners:
                    weight = float(co["ownership_percentage"]) / total_ownership
                    _append(co["id"], req.total_cost * weight,
                            f"Based on {float(co['ownership_percentage'])*100:.1f}% ownership (no usage data)")

        else:
            # hybrid
            if total_usage_hours <= 0:
                for co in req.co_owners:
                    weight = float(co["ownership_percentage"]) / total_ownership
                    _append(co["id"], req.total_cost * weight, "Hybrid degenerated to ownership (no usage data)")
            else:
                for co in req.co_owners:
                    ownership_weight = float(co["ownership_percentage"]) / total_ownership
                    usage_weight = float(co.get("usage_hours", 0)) / total_usage_hours
                    combined_weight = ownership_weight * ALPHA + usage_weight * BETA
                    _append(co["id"], req.total_cost * combined_weight,
                            f"Hybrid: {ownership_weight*100:.1f}% *{ALPHA} + {usage_weight*100:.1f}% *{BETA}")

        # --- Làm tròn + cân bằng để tổng = total_cost ---
        rounded = [round(x, 2) for x in unrounded]
        diff = round(req.total_cost - sum(rounded), 2)
        if abs(diff) >= 0.01:
            # điều chỉnh vào item có phần lẻ lớn nhất theo dấu diff
            idx = max(range(len(unrounded)), key=lambda i: (unrounded[i] - rounded[i]))
            rounded[idx] = round(rounded[idx] + diff, 2)

        for i, amt in enumerate(rounded):
            suggestions[i]["suggested_amount"] = amt

        return CostSharingSuggestionResponse(
            suggestions=suggestions,
            total_suggested=round(sum(rounded), 2),
            method=method,
        )
    except Exception as e:
        logger.error(f"Error in cost sharing suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/suggestions/voting", response_model=VotingSuggestionResponse, tags=["suggestions"])
async def suggest_voting_decision(req: VotingSuggestionRequest):
    try:
        proposal_type = req.proposal_type
        details = req.proposal_details

        recommendation = "approve"
        reasoning = ""
        suggested_modifications = None
        risk_assessment = {}

        if proposal_type == "upgrade_battery":
            cost = float(details.get("cost", 0))
            if cost > 100_000_000:
                recommendation = "modify"
                reasoning = "High cost upgrade. Consider phased approach or group discussion."
                suggested_modifications = {"phased_approach": True, "discuss_financing": True}
                risk_assessment.update({"financial_risk": "high", "benefit_risk": "medium"})
            else:
                reasoning = "Reasonable battery upgrade cost. Benefits all co-owners."
                risk_assessment.update({"financial_risk": "low", "benefit_risk": "low"})

        elif proposal_type == "repair":
            cost = float(details.get("cost", 0))
            urgency = str(details.get("urgency", "low")).lower()
            if urgency == "high":
                recommendation = "approve"
                reasoning = "Urgent repair needed for vehicle safety and functionality."
                risk_assessment.update({"operational_risk": "high"})
            elif cost > 50_000_000:
                recommendation = "modify"
                reasoning = "High repair cost. Get multiple quotes before approval."
                suggested_modifications = {"get_quotes": True, "minimum_quotes": 3}
                risk_assessment.update({"financial_risk": "medium"})
            else:
                reasoning = "Standard repair cost. Proceed with approval."
                risk_assessment.update({"financial_risk": "low"})

        elif proposal_type == "sell_vehicle":
            recommendation = "modify"
            reasoning = "Major decision. Ensure all co-owners agree and understand terms."
            suggested_modifications = {"require_unanimous_vote": True, "legal_review": True}
            risk_assessment.update({"legal_risk": "high", "financial_risk": "medium"})

        elif proposal_type == "insurance_change":
            cost_change = float(details.get("cost_change_percentage", 0))
            if abs(cost_change) > 20:
                recommendation = "modify"
                reasoning = f"Significant cost change ({cost_change}%). Review coverage details."
                suggested_modifications = {"compare_coverage": True, "review_terms": True}
                risk_assessment.update({"financial_risk": "medium"})
            else:
                reasoning = f"Reasonable insurance change. Cost impact: {cost_change}%"
                risk_assessment.update({"financial_risk": "low"})
        
        elif proposal_type == "maintenance":
            cost = float(details.get("cost", 0))
            if cost > 30_000_000:
                recommendation = "modify"
                reasoning = "High maintenance cost. Verify necessity and compare with alternatives."
                suggested_modifications = {"verify_necessity": True, "compare_alternatives": True}
                risk_assessment.update({"financial_risk": "medium", "operational_risk": "low"})
            else:
                recommendation = "approve"
                reasoning = "Standard maintenance cost. Essential for vehicle longevity."
                risk_assessment.update({"financial_risk": "low", "operational_risk": "low"})
        
        else:  # "other" or unknown types
            recommendation = "approve"
            reasoning = "Proposal appears reasonable. Review details with co-owners."
            risk_assessment.update({"residual_risk": "low"})

        return VotingSuggestionResponse(
            recommendation=recommendation,
            reasoning=reasoning,
            suggested_modifications=suggested_modifications,
            risk_assessment=risk_assessment or None,
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
