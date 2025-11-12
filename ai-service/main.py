from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pymongo
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis
import os
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="EV Co-ownership AI Service",
    description="AI service for fair scheduling, cost optimization, and group decision suggestions",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
mongodb_client: Optional[AsyncIOMotorClient] = None
mongodb_db = None

# Redis connection
redis_client: Optional[redis.Redis] = None

# Request/Response models
class BookingSuggestionRequest(BaseModel):
    vehicle_group_id: str
    requested_start: datetime
    requested_end: datetime
    co_owner_id: str
    ownership_percentage: float
    usage_history: Optional[List[Dict[str, Any]]] = None

class BookingSuggestionResponse(BaseModel):
    suggested_start: datetime
    suggested_end: datetime
    fairness_score: float
    reason: str
    alternative_slots: Optional[List[Dict[str, datetime]]] = None

class CostSharingSuggestionRequest(BaseModel):
    vehicle_group_id: str
    total_cost: float
    cost_type: str  # "maintenance", "insurance", "charging", "cleaning", "inspection"
    co_owners: List[Dict[str, Any]]  # [{id, ownership_percentage, usage_hours}]

class CostSharingSuggestionResponse(BaseModel):
    suggestions: List[Dict[str, Any]]  # [{co_owner_id, suggested_amount, reason}]
    total_suggested: float
    method: str  # "ownership_based", "usage_based", "hybrid"

class VotingSuggestionRequest(BaseModel):
    vehicle_group_id: str
    proposal_type: str  # "upgrade_battery", "repair", "sell_vehicle", "insurance_change"
    proposal_details: Dict[str, Any]

class VotingSuggestionResponse(BaseModel):
    recommendation: str  # "approve", "reject", "modify"
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
        mongodb_client = AsyncIOMotorClient(mongodb_uri)
        mongodb_db = mongodb_client.ai_db
        await mongodb_client.admin.command('ping')
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
    
    # Redis connection
    redis_host = os.getenv("REDIS_HOST", "redis")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    try:
        redis_client = await redis.Redis(host=redis_host, port=redis_port, decode_responses=True)
        await redis_client.ping()
        logger.info("Connected to Redis")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections"""
    if mongodb_client:
        mongodb_client.close()
    if redis_client:
        await redis_client.close()

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
        # Get usage history from cache or database
        cache_key = f"usage_history:{request.vehicle_group_id}"
        usage_history = request.usage_history
        
        if not usage_history and redis_client:
            cached = await redis_client.get(cache_key)
            if cached:
                # Parse cached data (simplified)
                usage_history = []
        
        # Calculate fairness score based on ownership percentage and usage
        ownership_weight = request.ownership_percentage
        usage_penalty = 0.0
        
        if usage_history:
            # Calculate recent usage (last 30 days)
            recent_usage_hours = sum(
                item.get("hours", 0) for item in usage_history
                if item.get("co_owner_id") == request.co_owner_id
            )
            # Penalty if over-usage (more than ownership percentage suggests)
            expected_hours = ownership_weight * 720  # 30 days * 24 hours
            if recent_usage_hours > expected_hours:
                usage_penalty = (recent_usage_hours - expected_hours) / expected_hours
        
        fairness_score = max(0.0, min(1.0, ownership_weight - usage_penalty * 0.2))
        
        # Suggest the requested time if fairness score is good
        suggested_start = request.requested_start
        suggested_end = request.requested_end
        
        # If fairness score is low, suggest alternative times
        alternative_slots = None
        if fairness_score < 0.5:
            # Suggest off-peak times or shorter durations
            alternative_slots = [
                {
                    "start": request.requested_start + timedelta(hours=2),
                    "end": request.requested_end - timedelta(hours=2)
                }
            ]
            reason = f"Lower priority due to usage history. Suggested shorter duration."
        else:
            reason = f"Fair booking slot based on {ownership_weight*100:.1f}% ownership"
        
        return BookingSuggestionResponse(
            suggested_start=suggested_start,
            suggested_end=suggested_end,
            fairness_score=fairness_score,
            reason=reason,
            alternative_slots=alternative_slots
        )
    
    except Exception as e:
        logger.error(f"Error in booking suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/suggestions/cost-sharing", response_model=CostSharingSuggestionResponse)
async def suggest_cost_sharing(request: CostSharingSuggestionRequest):
    """
    Suggest fair cost sharing based on ownership percentage and usage
    """
    try:
        total_ownership = sum(co["ownership_percentage"] for co in request.co_owners)
        total_usage_hours = sum(co.get("usage_hours", 0) for co in request.co_owners)
        
        suggestions = []
        total_suggested = 0.0
        
        if request.cost_type in ["maintenance", "insurance", "inspection"]:
            # Ownership-based for fixed costs
            method = "ownership_based"
            for co_owner in request.co_owners:
                amount = request.total_cost * (co_owner["ownership_percentage"] / total_ownership)
                suggestions.append({
                    "co_owner_id": co_owner["id"],
                    "suggested_amount": round(amount, 2),
                    "reason": f"Based on {co_owner['ownership_percentage']*100:.1f}% ownership"
                })
                total_suggested += amount
        
        elif request.cost_type in ["charging", "cleaning"]:
            # Usage-based for variable costs
            method = "usage_based"
            if total_usage_hours > 0:
                for co_owner in request.co_owners:
                    usage_ratio = co_owner.get("usage_hours", 0) / total_usage_hours
                    amount = request.total_cost * usage_ratio
                    suggestions.append({
                        "co_owner_id": co_owner["id"],
                        "suggested_amount": round(amount, 2),
                        "reason": f"Based on {co_owner.get('usage_hours', 0)} hours of usage ({usage_ratio*100:.1f}%)"
                    })
                    total_suggested += amount
            else:
                # Fallback to ownership-based if no usage data
                method = "ownership_based"
                for co_owner in request.co_owners:
                    amount = request.total_cost * (co_owner["ownership_percentage"] / total_ownership)
                    suggestions.append({
                        "co_owner_id": co_owner["id"],
                        "suggested_amount": round(amount, 2),
                        "reason": f"Based on {co_owner['ownership_percentage']*100:.1f}% ownership (no usage data)"
                    })
                    total_suggested += amount
        
        else:
            # Hybrid approach for other costs
            method = "hybrid"
            for co_owner in request.co_owners:
                ownership_weight = co_owner["ownership_percentage"] / total_ownership
                usage_weight = co_owner.get("usage_hours", 0) / max(total_usage_hours, 1)
                combined_weight = (ownership_weight * 0.6) + (usage_weight * 0.4)
                amount = request.total_cost * combined_weight
                suggestions.append({
                    "co_owner_id": co_owner["id"],
                    "suggested_amount": round(amount, 2),
                    "reason": f"Hybrid: {co_owner['ownership_percentage']*100:.1f}% ownership + {co_owner.get('usage_hours', 0)}h usage"
                })
                total_suggested += amount
        
        return CostSharingSuggestionResponse(
            suggestions=suggestions,
            total_suggested=round(total_suggested, 2),
            method=method
        )
    
    except Exception as e:
        logger.error(f"Error in cost sharing suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/suggestions/voting", response_model=VotingSuggestionResponse)
async def suggest_voting_decision(request: VotingSuggestionRequest):
    """
    Suggest voting decision based on proposal type and details
    """
    try:
        proposal_type = request.proposal_type
        details = request.proposal_details
        
        recommendation = "approve"
        reasoning = ""
        suggested_modifications = None
        risk_assessment = None
        
        if proposal_type == "upgrade_battery":
            cost = details.get("cost", 0)
            if cost > 100000000:  # > 100M VND
                recommendation = "modify"
                reasoning = "High cost upgrade. Consider phased approach or group discussion."
                suggested_modifications = {
                    "phased_approach": True,
                    "discuss_financing": True
                }
                risk_assessment = {
                    "financial_risk": "high",
                    "benefit_risk": "medium"
                }
            else:
                reasoning = "Reasonable battery upgrade cost. Benefits all co-owners."
                risk_assessment = {
                    "financial_risk": "low",
                    "benefit_risk": "low"
                }
        
        elif proposal_type == "repair":
            cost = details.get("cost", 0)
            urgency = details.get("urgency", "low")
            if urgency == "high":
                recommendation = "approve"
                reasoning = "Urgent repair needed for vehicle safety and functionality."
            elif cost > 50000000:  # > 50M VND
                recommendation = "modify"
                reasoning = "High repair cost. Get multiple quotes before approval."
                suggested_modifications = {
                    "get_quotes": True,
                    "minimum_quotes": 3
                }
            else:
                reasoning = "Standard repair cost. Proceed with approval."
        
        elif proposal_type == "sell_vehicle":
            recommendation = "modify"
            reasoning = "Major decision. Ensure all co-owners agree and understand terms."
            suggested_modifications = {
                "require_unanimous_vote": True,
                "legal_review": True
            }
            risk_assessment = {
                "legal_risk": "high",
                "financial_risk": "medium"
            }
        
        elif proposal_type == "insurance_change":
            new_provider = details.get("provider")
            cost_change = details.get("cost_change_percentage", 0)
            if abs(cost_change) > 20:
                recommendation = "modify"
                reasoning = f"Significant cost change ({cost_change}%). Review coverage details."
                suggested_modifications = {
                    "compare_coverage": True,
                    "review_terms": True
                }
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
    
    except Exception as e:
        logger.error(f"Error in voting suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/suggestions/fairness-check")
async def check_usage_fairness(vehicle_group_id: str, days: int = 30):
    """
    Check if usage is fair among co-owners
    """
    try:
        # This would query actual usage data from database
        # For now, return a placeholder response
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
    except Exception as e:
        logger.error(f"Error in fairness check: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

