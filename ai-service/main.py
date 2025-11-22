# ai-service/main.py
"""
AI Service - Dịch vụ AI cho hệ thống đồng sở hữu xe điện
Chức năng chính:
- Gợi ý lịch đặt xe công bằng dựa trên tỷ lệ sở hữu và lịch sử sử dụng
- Gợi ý chia chi phí hợp lý giữa các đồng sở hữu
- Gợi ý quyết định nhóm (voting suggestions)
- Phát hiện bất công bằng trong việc sử dụng xe
"""

from __future__ import annotations

# Import các thư viện cần thiết
import json, os, logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any, Literal
import threading

# FastAPI và các middleware
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.responses import ORJSONResponse

# Pydantic cho validation dữ liệu
from pydantic import BaseModel, Field, model_validator

# MongoDB async client
from motor.motor_asyncio import AsyncIOMotorClient

# Redis async client
import redis.asyncio as redis

# Prometheus metrics
from prometheus_fastapi_instrumentator import Instrumentator

# RabbitMQ consumer để nhận events từ các service khác
from rabbitmq_consumer import RabbitMQConsumer

# Cấu hình logging
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("ai-service")

# Khởi tạo FastAPI application
app = FastAPI(
    title="EV Co-ownership AI Service",
    description="AI service for fair scheduling, cost optimization, and group decision suggestions",
    version="1.3.0",
    default_response_class=ORJSONResponse,  # Sử dụng ORJSON để tăng hiệu suất JSON serialization
    openapi_tags=[
        {"name": "health", "description": "Service health & readiness"},
        {"name": "suggestions", "description": "AI suggestions endpoints"},
    ],
)

# ---- Cấu hình qua Environment Variables ----

# ALPHA và BETA: Trọng số cho phương pháp hybrid chia chi phí
# ALPHA: Trọng số cho tỷ lệ sở hữu (ownership percentage)
# BETA: Trọng số cho thời gian sử dụng (usage time)
# Mặc định: 60% dựa trên sở hữu, 40% dựa trên sử dụng
ALPHA = float(os.getenv("FAIRNESS_ALPHA", "0.6"))
BETA = float(os.getenv("FAIRNESS_BETA", "0.4"))

# Chuẩn hóa để ALPHA + BETA = 1 (tránh cấu hình sai)
# Đảm bảo tổng trọng số luôn bằng 1
_total = max(ALPHA + BETA, 1e-9)
ALPHA, BETA = ALPHA / _total, BETA / _total

# Rate limiting: Giới hạn số request mỗi phút từ một IP
RATE_LIMIT = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "0") == "1"

# CORS (Cross-Origin Resource Sharing) configuration
# Tránh dùng * với credentials để bảo mật tốt hơn
origins_env = os.getenv("CORS_ALLOW_ORIGINS", "*")
allow_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "0") == "1" and "*" not in allow_origins

# Thêm CORS middleware để cho phép frontend gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],  # Cho phép tất cả HTTP methods
    allow_headers=["*"],  # Cho phép tất cả headers
)

# ---- Global Clients (được khởi tạo khi service start) ----
# MongoDB client async để kết nối với MongoDB server
# Sử dụng AsyncIOMotorClient từ thư viện motor để hỗ trợ async/await
# Client này được khởi tạo khi service startup và đóng khi service shutdown
mongodb_client: Optional[AsyncIOMotorClient] = None  # MongoDB client để lưu trữ dữ liệu events

# MongoDB database instance - đại diện cho database "ai_db" trong MongoDB
# Database này chứa các collections để lưu trữ events từ các service khác:
# - user_events: Lưu các sự kiện liên quan đến người dùng (tạo, cập nhật)
# - vehicle_group_events: Lưu các sự kiện về nhóm xe
# - ownership_events: Lưu các sự kiện về quyền sở hữu
# - booking_events: Lưu các sự kiện về đặt xe
# - payment_events: Lưu các sự kiện về thanh toán
# - costshare_events: Lưu các sự kiện về chia sẻ chi phí
# - voting_events: Lưu các sự kiện về bỏ phiếu
# Dữ liệu này được sử dụng cho phân tích AI và machine learning
mongodb_db = None  # MongoDB database instance
redis_client: Optional[redis.Redis] = None  # Redis client để cache dữ liệu
rabbitmq_consumer: Optional[RabbitMQConsumer] = None  # RabbitMQ consumer để nhận events
rabbitmq_thread: Optional[threading.Thread] = None  # Thread chạy RabbitMQ consumer


# ---- Helper Functions ----

def _utc(dt: datetime) -> datetime:
    """
    Chuyển đổi datetime về UTC timezone.
    
    Args:
        dt: Datetime object (có thể có hoặc không có timezone)
    
    Returns:
        Datetime object với UTC timezone
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def _client_ip(req: Request) -> str:
    """
    Lấy IP address của client từ request.
    Ưu tiên lấy từ x-forwarded-for header (khi có reverse proxy).
    
    Args:
        req: FastAPI Request object
    
    Returns:
        IP address của client dưới dạng string
    """
    xfwd = req.headers.get("x-forwarded-for")
    if xfwd:
        # Lấy IP đầu tiên trong danh sách (IP thực của client)
        return xfwd.split(",")[0].strip()
    return req.headers.get("x-real-ip", req.client.host or "unknown")


# ---- Pydantic Models (Data Validation) ----

class AlternativeSlot(BaseModel):
    """
    Model cho slot thời gian thay thế khi booking request không công bằng.
    """
    start: datetime  # Thời gian bắt đầu
    end: datetime    # Thời gian kết thúc

class BookingSuggestionRequest(BaseModel):
    """
    Request model cho API gợi ý booking công bằng.
    """
    vehicle_group_id: str  # ID của nhóm xe
    requested_start: datetime  # Thời gian bắt đầu yêu cầu
    requested_end: datetime  # Thời gian kết thúc yêu cầu
    co_owner_id: str  # ID của người đồng sở hữu đặt lịch
    ownership_percentage: float = Field(ge=0, le=1)  # Tỷ lệ sở hữu (0-1)
    usage_history: Optional[List[Dict[str, Any]]] = None  # Lịch sử sử dụng (optional)

    @model_validator(mode="after")
    def _time_window_valid(self):
        """Validate: thời gian kết thúc phải lớn hơn thời gian bắt đầu"""
        if self.requested_end <= self.requested_start:
            raise ValueError("requested_end must be greater than requested_start")
        return self

class BookingSuggestionResponse(BaseModel):
    """
    Response model cho API gợi ý booking.
    """
    suggested_start: datetime  # Thời gian bắt đầu được gợi ý
    suggested_end: datetime  # Thời gian kết thúc được gợi ý
    fairness_score: float  # Điểm công bằng (0-1), càng cao càng công bằng
    reason: str  # Lý do gợi ý
    alternative_slots: Optional[List[AlternativeSlot]] = None  # Các slot thay thế nếu score thấp
    explain: Optional[Dict[str, Any]] = None  # Giải thích chi tiết về tính toán

# Loại chi phí có thể chia sẻ
CostType = Literal["maintenance", "insurance", "charging", "cleaning", "inspection"]

class CostSharingSuggestionRequest(BaseModel):
    """
    Request model cho API gợi ý chia chi phí.
    """
    vehicle_group_id: str  # ID của nhóm xe
    total_cost: float = Field(gt=0)  # Tổng chi phí (phải > 0)
    cost_type: CostType  # Loại chi phí
    co_owners: List[Dict[str, Any]]  # Danh sách đồng sở hữu với thông tin sở hữu và sử dụng

    @model_validator(mode="after")
    def _validate_coowners(self):
        """Validate: phải có ít nhất một đồng sở hữu"""
        if not self.co_owners:
            raise ValueError("co_owners must not be empty")
        return self

class CostSharingSuggestionResponse(BaseModel):
    """
    Response model cho API gợi ý chia chi phí.
    """
    suggestions: List[Dict[str, Any]]  # Danh sách gợi ý số tiền mỗi người phải trả
    total_suggested: float  # Tổng số tiền được gợi ý (nên bằng total_cost)
    method: str  # Phương pháp chia: "ownership_based", "usage_based", "hybrid"

# Loại đề xuất có thể bỏ phiếu
ProposalType = Literal["upgrade_battery", "repair", "sell_vehicle", "insurance_change", "maintenance", "other"]

class VotingSuggestionRequest(BaseModel):
    """
    Request model cho API gợi ý quyết định bỏ phiếu.
    """
    vehicle_group_id: str  # ID của nhóm xe
    proposal_type: ProposalType  # Loại đề xuất
    proposal_details: Dict[str, Any]  # Chi tiết đề xuất (cost, urgency, etc.)

class VotingSuggestionResponse(BaseModel):
    """
    Response model cho API gợi ý quyết định bỏ phiếu.
    """
    recommendation: str  # Gợi ý: "approve", "modify", "reject"
    reasoning: str  # Lý do gợi ý
    suggested_modifications: Optional[Dict[str, Any]] = None  # Các thay đổi đề xuất
    risk_assessment: Optional[Dict[str, Any]] = None  # Đánh giá rủi ro


# ---- Error Handler ----
@app.exception_handler(Exception)
async def unhandled_exc(_: Request, exc: Exception):
    """
    Xử lý tất cả các exception chưa được xử lý.
    Trả về lỗi 500 với thông báo lỗi.
    """
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(status_code=500, content={"error": "internal_error", "message": str(exc)})


# ---- Rate Limiting Middleware (tùy chọn) ----
@app.middleware("http")
async def ratelimit(request: Request, call_next):
    """
    Middleware để giới hạn số request mỗi phút từ một IP.
    Sử dụng Redis để đếm số request.
    
    Logic:
    - Mỗi IP có một key trong Redis: "rl:{ip}"
    - Tăng counter mỗi request
    - Nếu counter > RATE_LIMIT trong 60 giây → trả về 429 Too Many Requests
    """
    if RATE_LIMIT_ENABLED and redis_client:
        try:
            ip = _client_ip(request)
            key = f"rl:{ip}"
            count = await redis_client.incr(key)  # Tăng counter
            if count == 1:
                # Set TTL = 60 giây cho key đầu tiên
                await redis_client.expire(key, 60)
            if count > RATE_LIMIT:
                # Vượt quá giới hạn → trả về 429
                return JSONResponse({"detail": "Too Many Requests"}, status_code=429)
        except Exception as e:
            # Nếu rate limit fail, bỏ qua (không chặn request)
            logger.warning("Rate limit failed (ignored): %s", e)
    return await call_next(request)


# ---- Application Lifecycle Events ----

@app.on_event("startup")
async def startup_event():
    """
    Hàm được gọi khi service khởi động.
    Khởi tạo kết nối đến MongoDB, Redis, và RabbitMQ Consumer.
    """
    global mongodb_client, mongodb_db, redis_client

    # Khởi tạo Prometheus metrics (nếu được bật)
    # Metrics có thể được truy cập tại /metrics endpoint
    if os.getenv("METRICS_ENABLED", "1") == "1":
        try:
            Instrumentator().instrument(app).expose(app, include_in_schema=False)
            logger.info("Prometheus metrics enabled at /metrics")
        except Exception:
            logger.exception("Failed to enable Prometheus metrics")

    # ===== KHỞI TẠO KẾT NỐI MONGODB =====
    # MongoDB được sử dụng để lưu trữ tất cả các events từ các microservices
    # Mục đích: Thu thập dữ liệu để phân tích AI, machine learning và báo cáo
    
    # Lấy MongoDB connection string từ biến môi trường
    # Format: mongodb://username:password@host:port/database?authSource=admin
    # Mặc định kết nối đến MongoDB container với database "ai_db"
    mongodb_uri = os.getenv(
        "MONGODB_URI",
        "mongodb://mongoadmin:mongopass123@mongodb:27017/ai_db?authSource=admin",
    )
    try:
        # Tạo MongoDB async client với các cấu hình:
        # - serverSelectionTimeoutMS=2000: Timeout 2 giây khi chọn server
        #   Nếu không kết nối được trong 2 giây sẽ throw exception
        # - uuidRepresentation="standard": Sử dụng standard UUID format
        #   Đảm bảo UUID được lưu và đọc đúng format
        mongodb_client = AsyncIOMotorClient(
            mongodb_uri, 
            serverSelectionTimeoutMS=2000,  # Timeout 2 giây
            uuidRepresentation="standard"
        )
        
        # Lấy database instance từ connection string hoặc sử dụng database "ai_db"
        # get_default_database() lấy database từ URI, nếu không có thì dùng ai_db
        mongodb_db = mongodb_client.get_default_database() or mongodb_client.ai_db
        
        # Test kết nối bằng lệnh ping đến admin database
        # Nếu kết nối thành công, MongoDB sẽ trả về response
        # Nếu thất bại sẽ throw exception và được catch ở dưới
        await mongodb_client.admin.command("ping")  # Test connection
        
        # Ẩn password trong log để bảo mật
        # Thay thế password thực tế bằng "***" khi log ra console
        sanitized = mongodb_uri.replace(os.getenv("MONGO_PASSWORD", "mongopass123"), "***")
        logger.info("Connected to MongoDB (%s)", sanitized)
    except Exception:
        # Nếu kết nối thất bại, log lỗi nhưng không crash service
        # Service vẫn có thể chạy nhưng sẽ không lưu được events vào MongoDB
        logger.exception("Failed to connect to MongoDB")

    # Kết nối Redis để cache dữ liệu (usage history, user info, etc.)
    try:
        redis_host = os.getenv("REDIS_HOST", "redis")
        redis_port = int(os.getenv("REDIS_PORT", "6379"))
        redis_client = redis.Redis(
            host=redis_host, 
            port=redis_port, 
            decode_responses=True  # Tự động decode response thành string
        )
        pong = await redis_client.ping()  # Test connection
        logger.info(f"Connected to Redis (ping={pong})")
    except Exception:
        logger.exception("Failed to connect to Redis")
    
    # Khởi động RabbitMQ Consumer trong background thread
    # Consumer sẽ lắng nghe events từ các service khác và cập nhật dữ liệu
    global rabbitmq_consumer, rabbitmq_thread
    try:
        rabbitmq_consumer = RabbitMQConsumer(mongodb_client, redis_client, mongodb_db)
        if rabbitmq_consumer.connect():
            # Tạo daemon thread để chạy consumer (tự động dừng khi main thread dừng)
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
    """
    Hàm được gọi khi service tắt.
    Đóng tất cả các kết nối một cách an toàn.
    """
    global rabbitmq_consumer
    if rabbitmq_consumer:
        try:
            rabbitmq_consumer.close()
            logger.info("RabbitMQ consumer stopped")
        except Exception:
            logger.exception("Error closing RabbitMQ consumer")
    
    # ===== ĐÓNG KẾT NỐI MONGODB =====
    # Khi service shutdown, cần đóng kết nối MongoDB để giải phóng tài nguyên
    # Đảm bảo tất cả các operations đang chờ được hoàn thành trước khi đóng
    if mongodb_client:
        # Đóng tất cả connections trong connection pool
        # Motor client tự động quản lý connection pool, close() sẽ đóng tất cả
        mongodb_client.close()
    
    # Đóng Redis connection
    if redis_client:
        try:
            await redis_client.close()
        except Exception:
            pass


# ---- Health Check Endpoints ----

@app.get("/health", tags=["health"])
async def health_check():
    """
    Health check endpoint - kiểm tra service có đang chạy không.
    Không kiểm tra dependencies, chỉ trả về status.
    """
    return {
        "status": "healthy", 
        "service": "ai-service", 
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/ready", tags=["health"])
async def ready_check():
    """
    Readiness check endpoint - kiểm tra service đã sẵn sàng xử lý requests chưa.
    Kiểm tra kết nối đến MongoDB và Redis.
    Service chỉ sẵn sàng khi cả MongoDB và Redis đều kết nối được.
    """
    mongo_ok = False
    redis_ok = False
    
    # Test MongoDB connection
    if mongodb_client:
        try:
            await mongodb_client.admin.command("ping")
            mongo_ok = True
        except Exception:
            mongo_ok = False
    
    # Test Redis connection
    if redis_client:
        try:
            await redis_client.ping()
            redis_ok = True
        except Exception:
            redis_ok = False
    
    return {
        "mongo": mongo_ok, 
        "redis": redis_ok, 
        "ready": mongo_ok and redis_ok  # Sẵn sàng khi cả 2 đều OK
    }

@app.get("/version", tags=["health"])
async def version():
    """Trả về version của service."""
    return {"version": app.version}


# ---- AI Suggestion Endpoints ----

@app.post("/api/ai/suggestions/booking", response_model=BookingSuggestionResponse, tags=["suggestions"])
async def suggest_booking_fairness(req: BookingSuggestionRequest):
    """
    API gợi ý booking công bằng dựa trên tỷ lệ sở hữu và lịch sử sử dụng.
    
    Algorithm:
    1. Tính thời gian sử dụng gần đây của co-owner (30 ngày)
    2. So sánh với thời gian kỳ vọng dựa trên tỷ lệ sở hữu
    3. Tính penalty nếu sử dụng quá nhiều
    4. Điều chỉnh penalty cho booking ngắn (booking ngắn ít bị penalty hơn)
    5. Tính fairness score (0-1)
    6. Nếu score thấp, đề xuất các slot thay thế
    
    Args:
        req: BookingSuggestionRequest với thông tin booking và co-owner
    
    Returns:
        BookingSuggestionResponse với gợi ý thời gian và fairness score
    """
    try:
        # Chuẩn hóa thời gian về UTC để đảm bảo tính nhất quán
        req_start = _utc(req.requested_start)
        req_end = _utc(req.requested_end)

        # Lấy lịch sử sử dụng từ cache Redis (nếu có)
        # Cache key: "usage_history:{vehicle_group_id}"
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

        # Tính tổng số giờ sử dụng gần đây của co-owner này (30 ngày)
        recent_usage_hours = 0.0
        if usage_history:
            recent_usage_hours = sum(
                float(item.get("hours", 0))
                for item in usage_history
                if item.get("co_owner_id") == req.co_owner_id
            )

        # Tính thời gian kỳ vọng: 30 ngày * 24 giờ * tỷ lệ sở hữu
        # Ví dụ: 30% sở hữu → 720h * 0.3 = 216 giờ kỳ vọng trong 30 ngày
        expected_hours = ownership_weight * 24 * 30
        
        # Tính tỷ lệ vượt quá kỳ vọng
        over_ratio = (recent_usage_hours / expected_hours) if expected_hours > 0 else 0.0
        
        # Penalty tăng khi sử dụng > kỳ vọng
        # Nếu dùng gấp đôi kỳ vọng → penalty = 0.3
        usage_penalty = max(0.0, (over_ratio - 1.0) * 0.3)
        
        # Tính thời lượng booking (giờ)
        booking_duration_hours = (req_end - req_start).total_seconds() / 3600.0
        
        # Điều chỉnh fairness score dựa trên thời lượng booking:
        # - Booking ngắn (< 1 giờ) nên có penalty thấp hơn (hợp lý hơn)
        # - Booking rất ngắn (< 15 phút) gần như không bị penalty
        duration_factor = 1.0
        if booking_duration_hours < 0.25:  # < 15 phút
            duration_factor = 0.1  # Giảm penalty xuống 10%
        elif booking_duration_hours < 1.0:  # < 1 giờ
            duration_factor = 0.3  # Giảm penalty xuống 30%
        elif booking_duration_hours < 2.0:  # < 2 giờ
            duration_factor = 0.6  # Giảm penalty xuống 60%
        
        # Áp dụng duration factor vào usage_penalty
        adjusted_usage_penalty = usage_penalty * duration_factor
        
        # Tính fairness score: ownership_weight - adjusted_penalty
        # Đảm bảo score tối thiểu là ownership_weight * 0.5 cho booking ngắn
        base_score = ownership_weight - adjusted_usage_penalty
        min_score_for_short_booking = ownership_weight * 0.5 if booking_duration_hours < 1.0 else 0.0
        fairness_score = max(min_score_for_short_booking, min(1.0, base_score))

        # Mặc định gợi ý thời gian yêu cầu
        suggested_start, suggested_end = req_start, req_end

        # Nếu fairness score thấp, đề xuất các slot thay thế
        alternative_slots: Optional[List[AlternativeSlot]] = None
        # Threshold thấp hơn cho booking ngắn (0.3) so với booking dài (0.5)
        threshold = 0.3 if booking_duration_hours < 1.0 else 0.5
        if fairness_score < threshold:
            req_dur = (req_end - req_start)
            min_dur = max(timedelta(minutes=30), req_dur * 0.5)
            # Tạo các slot thay thế:
            # 1. Slot sau 1 giờ
            # 2. Slot vào buổi tối (22:00)
            # 3. Slot ngày hôm sau
            candidates = [
                (req_start + timedelta(hours=1), (req_start + timedelta(hours=1)) + min_dur),
                (req_start.replace(hour=22, minute=0, second=0, microsecond=0), 
                 req_start.replace(hour=22, minute=0, second=0, microsecond=0) + min_dur),
                (req_start + timedelta(days=1), (req_start + timedelta(days=1)) + req_dur),
            ]
            alternative_slots = [
                AlternativeSlot(start=s, end=e) for s, e in candidates if e > s
            ]
            if booking_duration_hours < 0.25:
                reason = f"Short booking ({booking_duration_hours*60:.0f} minutes) is acceptable despite lower fairness score."
            else:
                reason = "Lower priority due to usage history. Suggested shorter/off-peak duration."
        else:
            reason = f"Fair booking slot based on {ownership_weight*100:.1f}% ownership"

        # Cache lại usage_history vào Redis (TTL 5 phút) để tăng tốc lần sau
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
    """
    API gợi ý chia chi phí công bằng giữa các đồng sở hữu.
    
    Phương pháp chia chi phí:
    1. **Ownership-based** (dựa trên tỷ lệ sở hữu):
       - Dùng cho: maintenance, insurance, inspection
       - Logic: Chi phí chia theo tỷ lệ sở hữu (ví dụ: 40% sở hữu → trả 40% chi phí)
    
    2. **Usage-based** (dựa trên thời gian sử dụng):
       - Dùng cho: charging, cleaning
       - Logic: Chi phí chia theo thời gian sử dụng (ai dùng nhiều trả nhiều)
       - Nếu không có dữ liệu sử dụng → fallback về ownership-based
    
    3. **Hybrid** (kết hợp cả hai):
       - Dùng cho: các loại chi phí khác
       - Logic: combined_weight = ownership_weight * ALPHA + usage_weight * BETA
       - Nếu không có dữ liệu sử dụng → fallback về ownership-based
    
    Sau khi tính toán, làm tròn và điều chỉnh để tổng = total_cost chính xác.
    
    Args:
        req: CostSharingSuggestionRequest với thông tin chi phí và danh sách co-owners
    
    Returns:
        CostSharingSuggestionResponse với gợi ý số tiền mỗi người phải trả
    """
    try:
        # Tính tổng tỷ lệ sở hữu (để normalize)
        total_ownership = sum(float(co["ownership_percentage"]) for co in req.co_owners) or 1.0
        # Tính tổng thời gian sử dụng
        total_usage_hours = sum(float(co.get("usage_hours", 0)) for co in req.co_owners)

        suggestions: List[Dict[str, Any]] = []
        unrounded: List[float] = []  # Số tiền chưa làm tròn
        method = "hybrid"

        def _append(co_id: str, amount: float, reason: str):
            """Helper function để thêm suggestion vào danh sách"""
            unrounded.append(amount)
            suggestions.append({"co_owner_id": co_id, "suggested_amount": None, "reason": reason})

        # Phương pháp 1: Ownership-based (cho chi phí cố định)
        if req.cost_type in ["maintenance", "insurance", "inspection"]:
            method = "ownership_based"
            for co in req.co_owners:
                # Tính trọng số dựa trên tỷ lệ sở hữu
                weight = float(co["ownership_percentage"]) / total_ownership
                _append(co["id"], req.total_cost * weight, 
                        f"Based on {float(co['ownership_percentage'])*100:.1f}% ownership")

        # Phương pháp 2: Usage-based (cho chi phí biến đổi theo sử dụng)
        elif req.cost_type in ["charging", "cleaning"]:
            method = "usage_based"
            if total_usage_hours > 0:
                # Có dữ liệu sử dụng → chia theo usage
                for co in req.co_owners:
                    usage_ratio = float(co.get("usage_hours", 0)) / total_usage_hours
                    _append(co["id"], req.total_cost * usage_ratio,
                            f"Based on {float(co.get('usage_hours', 0)):.1f}h usage ({usage_ratio*100:.1f}%)")
            else:
                # Không có dữ liệu sử dụng → fallback về ownership
                method = "ownership_based"
                for co in req.co_owners:
                    weight = float(co["ownership_percentage"]) / total_ownership
                    _append(co["id"], req.total_cost * weight,
                            f"Based on {float(co['ownership_percentage'])*100:.1f}% ownership (no usage data)")

        # Phương pháp 3: Hybrid (kết hợp ownership và usage)
        else:
            if total_usage_hours <= 0:
                # Không có dữ liệu sử dụng → chỉ dùng ownership
                for co in req.co_owners:
                    weight = float(co["ownership_percentage"]) / total_ownership
                    _append(co["id"], req.total_cost * weight, 
                            "Hybrid degenerated to ownership (no usage data)")
            else:
                # Có dữ liệu → kết hợp ownership và usage
                for co in req.co_owners:
                    ownership_weight = float(co["ownership_percentage"]) / total_ownership
                    usage_weight = float(co.get("usage_hours", 0)) / total_usage_hours
                    # Kết hợp: ALPHA * ownership + BETA * usage
                    combined_weight = ownership_weight * ALPHA + usage_weight * BETA
                    _append(co["id"], req.total_cost * combined_weight,
                            f"Hybrid: {ownership_weight*100:.1f}% *{ALPHA} + {usage_weight*100:.1f}% *{BETA}")

        # --- Làm tròn và cân bằng để tổng = total_cost chính xác ---
        rounded = [round(x, 2) for x in unrounded]  # Làm tròn đến 2 chữ số thập phân
        diff = round(req.total_cost - sum(rounded), 2)  # Tính chênh lệch
        
        if abs(diff) >= 0.01:  # Nếu chênh lệch >= 1 cent
            # Điều chỉnh vào item có phần lẻ lớn nhất (theo dấu của diff)
            idx = max(range(len(unrounded)), key=lambda i: (unrounded[i] - rounded[i]))
            rounded[idx] = round(rounded[idx] + diff, 2)

        # Gán số tiền đã làm tròn vào suggestions
        for i, amt in enumerate(rounded):
            suggestions[i]["suggested_amount"] = amt

        return CostSharingSuggestionResponse(
            suggestions=suggestions,
            total_suggested=round(sum(rounded), 2),  # Tổng phải = total_cost
            method=method,
        )
    except Exception as e:
        logger.error(f"Error in cost sharing suggestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/suggestions/voting", response_model=VotingSuggestionResponse, tags=["suggestions"])
async def suggest_voting_decision(req: VotingSuggestionRequest):
    """
    API gợi ý quyết định cho các đề xuất bỏ phiếu nhóm.
    
    Phân tích dựa trên:
    - Loại đề xuất (upgrade_battery, repair, sell_vehicle, etc.)
    - Chi phí (cost)
    - Mức độ khẩn cấp (urgency)
    - Thay đổi phần trăm (cost_change_percentage)
    
    Gợi ý có thể là:
    - "approve": Chấp nhận đề xuất
    - "modify": Cần chỉnh sửa trước khi chấp nhận
    - "reject": Từ chối (hiện tại không dùng)
    
    Mỗi loại đề xuất có logic riêng:
    - upgrade_battery: Kiểm tra chi phí (>100M → modify)
    - repair: Kiểm tra urgency và cost (>50M → modify)
    - sell_vehicle: Luôn cần modify (quyết định lớn)
    - insurance_change: Kiểm tra % thay đổi (>20% → modify)
    - maintenance: Kiểm tra cost (>30M → modify)
    
    Args:
        req: VotingSuggestionRequest với thông tin đề xuất
    
    Returns:
        VotingSuggestionResponse với gợi ý và đánh giá rủi ro
    """
    try:
        proposal_type = req.proposal_type
        details = req.proposal_details

        recommendation = "approve"  # Mặc định là approve
        reasoning = ""
        suggested_modifications = None
        risk_assessment = {}

        # Xử lý đề xuất nâng cấp pin
        if proposal_type == "upgrade_battery":
            cost = float(details.get("cost", 0))
            if cost > 100_000_000:  # > 100 triệu VND
                recommendation = "modify"
                reasoning = "High cost upgrade. Consider phased approach or group discussion."
                suggested_modifications = {"phased_approach": True, "discuss_financing": True}
                risk_assessment.update({"financial_risk": "high", "benefit_risk": "medium"})
            else:
                reasoning = "Reasonable battery upgrade cost. Benefits all co-owners."
                risk_assessment.update({"financial_risk": "low", "benefit_risk": "low"})

        # Xử lý đề xuất sửa chữa
        elif proposal_type == "repair":
            cost = float(details.get("cost", 0))
            urgency = str(details.get("urgency", "low")).lower()
            if urgency == "high":
                # Sửa chữa khẩn cấp → approve ngay
                recommendation = "approve"
                reasoning = "Urgent repair needed for vehicle safety and functionality."
                risk_assessment.update({"operational_risk": "high"})
            elif cost > 50_000_000:  # > 50 triệu VND
                recommendation = "modify"
                reasoning = "High repair cost. Get multiple quotes before approval."
                suggested_modifications = {"get_quotes": True, "minimum_quotes": 3}
                risk_assessment.update({"financial_risk": "medium"})
            else:
                reasoning = "Standard repair cost. Proceed with approval."
                risk_assessment.update({"financial_risk": "low"})

        # Xử lý đề xuất bán xe
        elif proposal_type == "sell_vehicle":
            # Quyết định lớn → luôn cần modify và xem xét kỹ
            recommendation = "modify"
            reasoning = "Major decision. Ensure all co-owners agree and understand terms."
            suggested_modifications = {"require_unanimous_vote": True, "legal_review": True}
            risk_assessment.update({"legal_risk": "high", "financial_risk": "medium"})

        # Xử lý đề xuất thay đổi bảo hiểm
        elif proposal_type == "insurance_change":
            cost_change = float(details.get("cost_change_percentage", 0))
            if abs(cost_change) > 20:  # Thay đổi > 20%
                recommendation = "modify"
                reasoning = f"Significant cost change ({cost_change}%). Review coverage details."
                suggested_modifications = {"compare_coverage": True, "review_terms": True}
                risk_assessment.update({"financial_risk": "medium"})
            else:
                reasoning = f"Reasonable insurance change. Cost impact: {cost_change}%"
                risk_assessment.update({"financial_risk": "low"})
        
        # Xử lý đề xuất bảo dưỡng
        elif proposal_type == "maintenance":
            cost = float(details.get("cost", 0))
            if cost > 30_000_000:  # > 30 triệu VND
                recommendation = "modify"
                reasoning = "High maintenance cost. Verify necessity and compare with alternatives."
                suggested_modifications = {"verify_necessity": True, "compare_alternatives": True}
                risk_assessment.update({"financial_risk": "medium", "operational_risk": "low"})
            else:
                recommendation = "approve"
                reasoning = "Standard maintenance cost. Essential for vehicle longevity."
                risk_assessment.update({"financial_risk": "low", "operational_risk": "low"})
        
        # Xử lý các loại đề xuất khác
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
    """
    API kiểm tra tính công bằng trong việc sử dụng xe của nhóm.
    
    (Hiện tại là stub - trả về dữ liệu mẫu)
    TODO: Implement logic thực tế:
    1. Lấy lịch sử sử dụng từ MongoDB
    2. So sánh thời gian sử dụng với tỷ lệ sở hữu của mỗi co-owner
    3. Tính fairness score (0-1)
    4. Đưa ra recommendations
    
    Args:
        vehicle_group_id: ID của nhóm xe
        days: Số ngày để phân tích (mặc định 30 ngày)
    
    Returns:
        Dict với fairness score và recommendations
    """
    try:
        # TODO: Implement thực tế
        return {
            "vehicle_group_id": vehicle_group_id,
            "period_days": days,
            "fairness_score": 0.85,  # Stub value
            "recommendations": [
                "Usage is generally fair",
                "Consider rotating priority for peak hours",
            ],
            "co_owner_usage": [],  # Stub - cần populate từ MongoDB
        }
    except Exception:
        logger.exception("Error in fairness check")
        raise HTTPException(status_code=500, detail="internal_error")


# Entry point khi chạy trực tiếp (không qua Docker)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
