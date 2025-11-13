# ai-service/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from redis.asyncio import Redis
import os, json, logging
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

app = FastAPI(
    title="EV Co-ownership AI Service",
    description="AI service for fair scheduling, cost optimization, and group decision suggestions",
    version="1.0.0"
)

# CORS middleware (có thể cấu hình qua ENV)
allow_origins = os.getenv("CORS_ALLOW_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB & Redis connection
mongodb_client: Optional[AsyncIOMotorClient] = None
mongodb_db = None
redis_client: Optional[Redis] = None

# Request/Response models (giữ hợp đồng cũ để không phá client)
class BookingSuggestionRequest(BaseModel):
    vehicle_group_id: str
    requested_start: datetime
    requested_end: datetime
    co_owner_id: str
    # chấp nhận cả 0..1 lẫn 0..100 (sẽ normalize)
    ownership_percentage: float = Field(ge=0)
    usage_history: Optional[List[Dict[str, Any]]] = None

class BookingSuggestionResponse(BaseModel):
    suggested_start: datetime
    suggested_end: datetime
    fairness_score: float = Field(ge=0, le=1)
    reason: str
    alternative_slots: Optional[List[Dict[str, datetime]]] = None

class CostSharingSuggestionRequest(BaseModel):
    vehicle_group_id: str
    total_cost: float = Field(ge=0)
    # giữ kiểu str như cũ để không phá client: "maintenance" | "insurance" | "charging" | "cleaning" | "inspection"
    cost_type: str
    # [{id, ownership_percentage, usage_hours}]
    co_owners: List[Dict[str, Any]]

class CostSharingSuggestionResponse(BaseModel):
    # [{co_owner_id, suggested_amount, reason}]
    suggestions: List[Dict[str, Any]]
    total_suggested: float
    # "ownership_based" | "usage_based" | "hybrid"
    method: str

class VotingSuggestionRequest(BaseModel):
    vehicle_group_id: str
    # "upgrade_battery" | "repair" | "sell_vehicle" | "insurance_change"
    proposal_type: str
    proposal_details: Dict[str, Any]

class VotingSuggestionResponse(BaseModel):
    # "approve" | "reject" | "modify"
    recommendation: str
    reasoning: str
    suggested_modifications: Optional[Dict[str, Any]] = None
    risk_assessment: Optional[Dict[str, Any]] = None

@app.on_event("startup")
async def startup_event():
    """Initialize database connections"""
    global mongodb_client, mongodb_db, redis_client

    # MongoDB connection
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://mongoadmin:mongopass123@mongodb:27017/ai_db?authSource=admin")
    try:
        mongodb_client = AsyncIOMotorClient(mongodb_uri, serverSelectionTimeoutMS=3000)
        await mongodb_client.admin.command('ping')
        mongodb_db = mongodb_client.get_default_database() or mongodb_client["ai_db"]
        logger.info("Connected to MongoDB")
    except Exception:
        logger.exception("Failed to connect to MongoDB")

    # Redis connection
    redis_host = os.getenv("REDIS_HOST", "redis")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    try:
        redis_client = Redis(host=redis_host, port=redis_port, decode_responses=True)
        await redis_client.ping()
        logger.info("Connected to Redis")
    except Exception:
        logger.exception("Failed to connect to Redis")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections"""
    if mongodb_client:
        mongodb_client.close()
    if redis_client:
        try:
            await redis_client.aclose()  # redis-py asyncio close
        except Exception:
            pass

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-service",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/ai/suggestions/booking", response_model=BookingSuggestionResponse)
async def suggest_booking_fairness(request: BookingSuggestionRequest):
    """
    Suggest fair booking slots based on ownership percentage and usage history
    """
    try:
        # Validate window
        if request.requested_end <= request.requested_start:
            raise HTTPException(status_code=400, detail="requested_end must be greater than requested_start")

        # Normalize ownership percentage: chấp nhận cả 0..1 và 0..100
        ownership_weight = request.ownership_percentage
        if ownership_weight > 1.0:
            ownership_weight = ownership_weight / 100.0
        ownership_weight = max(0.0, min(1.0, ownership_weight))

        # Get usage history from cache or provided payload
        cache_key = f"usage_history:{request.vehicle_group_id}"
        usage_history = request.usage_history

        if not usage_history and redis_client:
            cached = await redis_client.get(cache_key)
            if cached:
                try:
                    usage_history = json.loads(cached)
                except Exception:
                    usage_history = None

        # Calculate fairness
        usage_penalty = 0.0
        recent_usage_hours = 0.0

        if usage_history:
            # Sum usage hours của co-owner trong 30 ngày gần (giả định input đã là recent)
            recent_usage_hours = sum(
                float(item.get("hours", 0)) for item in usage_history
                if item.get("co_owner_id") == request.co_owner_id
            )

        # expected hours (30d * 24h * share)
        expected_hours = max(ownership_weight * 720.0, 1e-6)
        if recent_usage_hours > expected_hours:
            usage_penalty = (recent_usage_hours - expected_hours) / expected_hours

        fairness_score = max(0.0, min(1.0, ownership_weight - usage_penalty * 0.2))

        suggested_start = request.requested_start
        suggested_end = request.requested_end

        # Alternative slots nếu fairness thấp
        alternative_slots = None
        if fairness_score < 0.5:
            # Đề xuất rút ngắn thời lượng & lùi 2h (off-peak demo)
            duration = (request.requested_end - request.requested_start)
            shrink = duration * 0.2
            alt_start = request.requested_start + timedelta(hours=2)
            alt_end = request.requested_end - shrink
            if alt_end > alt_start:
                alternative_slots = [
                    {
                        "start": alt_start,
                        "end": alt_end
                    }
                ]
            reason = "Lower priority due to usage history. Suggested shorter/off-peak duration."
        else:
            reason = f"Fair booking slot based on {ownership_weight*100:.1f}% ownership"

        # Cache usage_history nếu client vừa gửi mới
        if redis_client and request.usage_history:
            try:
                await redis_client.set(cache_key, json.dumps(request.usage_history, default=str), ex=300)
            except Exception:
                pass

        return BookingSuggestionResponse(
            suggested_start=suggested_start,
            suggested_end=suggested_end,
            fairness_score=fairness_score,
            reason=reason,
            alternative_slots=alternative_slots
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in booking suggestion")
        raise HTTPException(status_code=500, detail="internal_error")

@app.post("/api/ai/suggestions/cost-sharing", response_model=CostSharingSuggestionResponse)
async def suggest_cost_sharing(request: CostSharingSuggestionRequest):
    """
    Suggest fair cost sharing based on ownership percentage and usage
    """
    try:
        # Chuẩn hoá input co_owners (id, ownership_percentage 0..1, usage_hours)
        owners = []
        for co in request.co_owners:
            oid = str(co.get("id"))
            share = float(co.get("ownership_percentage", 0))
            if share > 1.0:  # chấp nhận 0..100
                share = share / 100.0
            share = max(0.0, min(1.0, share))
            usage_h = float(co.get("usage_hours", 0))
            owners.append({"id": oid, "share": share, "usage": usage_h})

        total_ownership = sum(o["share"] for o in owners)
        total_usage_hours = sum(o["usage"] for o in owners)

        suggestions: List[Dict[str, Any]] = []
        total_suggested = 0.0

        cost_type = (request.cost_type or "").lower().strip()
        method = ""

        def add(co_id: str, amount: float, reason: str):
            nonlocal total_suggested, suggestions
            amt = round(float(amount), 2)
            total_suggested += amt
            suggestions.append({"co_owner_id": co_id, "suggested_amount": amt, "reason": reason})

        if cost_type in {"maintenance", "insurance", "inspection"}:
            # Ownership-based cho fixed cost
            method = "ownership_based"
            denom = total_ownership if total_ownership > 0 else 1e-6
            for o in owners:
                add(o["id"], request.total_cost * (o["share"] / denom),
                    f"Based on {o['share']*100:.1f}% ownership")

        elif cost_type in {"charging", "cleaning"}:
            # Usage-based cho variable cost
            method = "usage_based"
            if total_usage_hours > 0:
                for o in owners:
                    ratio = o["usage"] / total_usage_hours
                    add(o["id"], request.total_cost * ratio,
                        f"Based on {o['usage']}h usage ({ratio*100:.1f}%)")
            else:
                # Fallback: ownership
                method = "ownership_based"
                denom = total_ownership if total_ownership > 0 else 1e-6
                for o in owners:
                    add(o["id"], request.total_cost * (o["share"] / denom),
                        f"Based on {o['share']*100:.1f}% ownership (no usage data)")

        else:
            # Hybrid
            method = "hybrid"
            own_denom = total_ownership if total_ownership > 0 else 1e-6
            use_denom = total_usage_hours if total_usage_hours > 0 else 1.0
            for o in owners:
                ownership_weight = (o["share"] / own_denom) if own_denom > 0 else 0.0
                usage_weight = (o["usage"] / use_denom) if use_denom > 0 else 0.0
                combined_weight = (ownership_weight * 0.6) + (usage_weight * 0.4)
                add(o["id"], request.total_cost * combined_weight,
                    f"Hybrid: {o['share']*100:.1f}% ownership + {o['usage']}h usage")

        return CostSharingSuggestionResponse(
            suggestions=suggestions,
            total_suggested=round(total_suggested, 2),
            method=method
        )

    except Exception:
        logger.exception("Error in cost sharing suggestion")
        raise HTTPException(status_code=500, detail="internal_error")

@app.post("/api/ai/suggestions/voting", response_model=VotingSuggestionResponse)
async def suggest_voting_decision(request: VotingSuggestionRequest):
    """
    Suggest voting decision based on proposal type and details
    """
    try:
        proposal_type = (request.proposal_type or "").lower().strip()
        details = request.proposal_details or {}

        recommendation = "approve"
        reasoning = ""
        suggested_modifications = None
        risk_assessment = None

        if proposal_type == "upgrade_battery":
            cost = float(details.get("cost", 0))
            if cost > 100_000_000:  # > 100M VND
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
            elif cost > 50_000_000:  # > 50M VND
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
            risk_assessment=risk_assessment
        )

    except Exception:
        logger.exception("Error in voting suggestion")
        raise HTTPException(status_code=500, detail="internal_error")

@app.get("/api/ai/suggestions/fairness-check")
async def check_usage_fairness(vehicle_group_id: str, days: int = 30):
    """
    Check if usage is fair among co-owners
    """
    try:
        # Placeholder: sau này kéo dữ liệu thực từ Mongo
        return {
            "vehicle_group_id": vehicle_group_id,
            "period_days": days,
            "fairness_score": 0.85,
            "recommendations": [
                "Usage is generally fair",
                "Consider rotating priority for peak hours"
            ],
            "co_owner_usage": []
        }
    except Exception:
        logger.exception("Error in fairness check")
        raise HTTPException(status_code=500, detail="internal_error")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
