"""
RabbitMQ Consumer cho AI Service

Chức năng:
- Lắng nghe events từ tất cả các service khác (auth, booking, payment, ownership, etc.)
- Lưu events vào MongoDB để phân tích và training AI models
- Cập nhật cache trong Redis khi có thay đổi quan trọng
- Invalidate cache khi có thay đổi về ownership hoặc vehicle group

Events được xử lý:
- user.created: Người dùng mới được tạo
- vehicle.group.updated: Nhóm xe được cập nhật
- ownership.updated: Tỷ lệ sở hữu được cập nhật
- booking.created/approved/completed: Booking được tạo/phê duyệt/hoàn thành
- payment.created/completed: Thanh toán được tạo/hoàn thành
- costshare.created/updated: Chia chi phí được tạo/cập nhật
- voting.status.changed: Trạng thái bỏ phiếu thay đổi
"""
import json
import logging
import os
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import pika  # RabbitMQ client library
from pika.adapters.blocking_connection import BlockingChannel
from motor.motor_asyncio import AsyncIOMotorClient  # MongoDB async client
import redis.asyncio as redis  # Redis async client

logger = logging.getLogger("ai-service.rabbitmq")

class RabbitMQConsumer:
    """
    RabbitMQ Consumer class để nhận và xử lý events từ các service khác.
    
    Consumer chạy trong một background thread và lắng nghe các queues:
    - user.created
    - vehicle.group.updated
    - ownership.updated
    - booking.created/approved/completed
    - payment.created/completed
    - costshare.created/updated
    - voting.status.changed
    """
    
    def __init__(
        self,
        mongodb_client: Optional[AsyncIOMotorClient],
        redis_client: Optional[redis.Redis],
        mongodb_db=None
    ):
        """
        Khởi tạo RabbitMQ Consumer.
        
        Args:
            mongodb_client: MongoDB client để lưu events
            redis_client: Redis client để invalidate cache
            mongodb_db: MongoDB database instance
        """
        self.mongodb_client = mongodb_client
        self.mongodb_db = mongodb_db
        self.redis_client = redis_client
        self.connection: Optional[pika.BlockingConnection] = None
        self.channel: Optional[BlockingChannel] = None
        
        # Cấu hình kết nối RabbitMQ từ environment variables
        self.host = os.getenv("RABBITMQ_HOST", "rabbitmq")
        self.port = int(os.getenv("RABBITMQ_PORT", "5672"))
        self.username = os.getenv("RABBITMQ_USERNAME", "rabbitmq")
        self.password = os.getenv("RABBITMQ_PASSWORD", "rabbitmq123")
        self.virtual_host = os.getenv("RABBITMQ_VHOST", "/")
    
    def connect(self):
        """
        Kết nối đến RabbitMQ server.
        
        Returns:
            True nếu kết nối thành công, False nếu thất bại
        """
        try:
            # Tạo credentials từ username và password
            credentials = pika.PlainCredentials(self.username, self.password)
            
            # Cấu hình connection parameters
            parameters = pika.ConnectionParameters(
                host=self.host,
                port=self.port,
                virtual_host=self.virtual_host,
                credentials=credentials,
                heartbeat=600,  # Heartbeat mỗi 10 phút để giữ connection alive
                blocked_connection_timeout=300  # Timeout 5 phút nếu connection bị block
            )
            
            # Tạo blocking connection (blocking vì chạy trong thread riêng)
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            logger.info(f"Connected to RabbitMQ at {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            return False
    
    def setup_queues(self):
        """
        Khai báo tất cả các queues cần thiết.
        
        Queue được khai báo với durable=True để đảm bảo:
        - Queue tồn tại ngay cả khi RabbitMQ restart
        - Messages không bị mất khi RabbitMQ restart
        """
        if not self.channel:
            return
        
        # Danh sách tất cả queues cần lắng nghe
        queues = [
            "user.created",              # User mới được tạo
            "vehicle.group.updated",     # Nhóm xe được cập nhật
            "ownership.updated",         # Tỷ lệ sở hữu được cập nhật
            "booking.created",           # Booking mới được tạo
            "booking.approved",          # Booking được phê duyệt
            "booking.completed",         # Booking hoàn thành
            "payment.created",           # Payment mới được tạo
            "payment.completed",         # Payment hoàn thành
            "costshare.created",         # Chia chi phí mới được tạo
            "costshare.updated",        # Chia chi phí được cập nhật
            "voting.status.changed"      # Trạng thái bỏ phiếu thay đổi
        ]
        
        # Khai báo từng queue
        for queue in queues:
            try:
                self.channel.queue_declare(queue=queue, durable=True)
                logger.info(f"Declared queue: {queue}")
            except Exception as e:
                logger.error(f"Failed to declare queue {queue}: {e}")
    
    def process_user_created(self, ch, method, properties, body):
        """
        Xử lý event user.created - khi có user mới được tạo.
        
        Actions:
        1. Lưu event vào MongoDB collection user_events
        2. Cache thông tin user vào Redis (TTL 1 giờ) để truy cập nhanh
        
        Args:
            ch: RabbitMQ channel
            method: Delivery method
            properties: Message properties
            body: Message body (JSON string)
        """
        try:
            event = json.loads(body)
            logger.info(f"Processing user.created: UserId={event.get('UserId')}, Email={event.get('Email')}")
            
            # Lưu event vào MongoDB để phân tích và training AI models sau này
            if self.mongodb_db:
                import asyncio
                # Tạo event loop mới vì đang trong blocking thread
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.mongodb_db.user_events.insert_one({
                        "event_type": "user.created",
                        "user_id": event.get("UserId"),
                        "email": event.get("Email"),
                        "roles": event.get("Roles", []),
                        "created_at": datetime.now(timezone.utc),
                        "event_data": event  # Lưu toàn bộ event data
                    })
                )
                loop.close()
            
            # Cache thông tin user vào Redis để truy cập nhanh (TTL 1 giờ)
            if self.redis_client:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.redis_client.setex(
                        f"user:{event.get('UserId')}",
                        3600,  # TTL 1 giờ
                        json.dumps(event)
                    )
                )
                loop.close()
            
            # Acknowledge message (đánh dấu đã xử lý thành công)
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Error processing user.created: {e}")
            # Nack và requeue để thử lại sau
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def process_vehicle_group_updated(self, ch, method, properties, body):
        """
        Xử lý event vehicle.group.updated - khi nhóm xe được cập nhật.
        
        Actions:
        1. Lưu event vào MongoDB
        2. Invalidate cache usage_history trong Redis (vì nhóm xe thay đổi → lịch sử cũ không còn chính xác)
        
        Args:
            ch: RabbitMQ channel
            method: Delivery method
            properties: Message properties
            body: Message body (JSON string)
        """
        try:
            event = json.loads(body)
            logger.info(f"Processing vehicle.group.updated: VehicleGroupId={event.get('VehicleGroupId')}")
            
            # Lưu event vào MongoDB
            if self.mongodb_db:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.mongodb_db.vehicle_group_events.insert_one({
                        "event_type": "vehicle.group.updated",
                        "vehicle_group_id": str(event.get("VehicleGroupId")),
                        "status": event.get("Status"),
                        "updated_at": datetime.now(timezone.utc),
                        "event_data": event
                    })
                )
                loop.close()
            
            # Invalidate cache vì nhóm xe thay đổi → lịch sử sử dụng cần được tính lại
            if self.redis_client:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.redis_client.delete(f"usage_history:{event.get('VehicleGroupId')}")
                )
                loop.close()
            
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Error processing vehicle.group.updated: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def process_ownership_updated(self, ch, method, properties, body):
        """
        Xử lý event ownership.updated - khi tỷ lệ sở hữu được cập nhật.
        
        Actions:
        1. Lưu event vào MongoDB
        2. Invalidate cache usage_history (vì tỷ lệ sở hữu thay đổi → fairness score cần tính lại)
        
        Args:
            ch: RabbitMQ channel
            method: Delivery method
            properties: Message properties
            body: Message body (JSON string)
        """
        try:
            event = json.loads(body)
            logger.info(f"Processing ownership.updated: OwnershipId={event.get('OwnershipId')}")
            
            # Lưu event vào MongoDB
            if self.mongodb_db:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.mongodb_db.ownership_events.insert_one({
                        "event_type": "ownership.updated",
                        "ownership_id": str(event.get("OwnershipId")),
                        "co_owner_id": str(event.get("CoOwnerId")),
                        "vehicle_group_id": str(event.get("VehicleGroupId")),
                        "ownership_percentage": event.get("OwnershipPercentage"),
                        "is_active": event.get("IsActive"),
                        "updated_at": datetime.now(timezone.utc),
                        "event_data": event
                    })
                )
                loop.close()
            
            # Invalidate cache vì tỷ lệ sở hữu thay đổi → fairness score cần tính lại
            if self.redis_client:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.redis_client.delete(f"usage_history:{event.get('VehicleGroupId')}")
                )
                loop.close()
            
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Error processing ownership.updated: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def process_booking_event(self, ch, method, properties, body, event_type: str):
        """
        Xử lý các booking events: created, approved, completed.
        
        Actions:
        1. Lưu event vào MongoDB
        2. Nếu là booking.completed → invalidate cache usage_history (vì có booking mới hoàn thành)
        
        Args:
            ch: RabbitMQ channel
            method: Delivery method
            properties: Message properties
            body: Message body (JSON string)
            event_type: Loại event ("booking.created", "booking.approved", "booking.completed")
        """
        try:
            event = json.loads(body)
            logger.info(f"Processing {event_type}: BookingId={event.get('BookingId')}")
            
            # Lưu event vào MongoDB
            if self.mongodb_db:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.mongodb_db.booking_events.insert_one({
                        "event_type": event_type,
                        "booking_id": event.get("BookingId"),
                        "co_owner_id": event.get("CoOwnerId"),
                        "vehicle_id": event.get("VehicleId"),
                        "created_at": datetime.now(timezone.utc),
                        "event_data": event
                    })
                )
                loop.close()
            
            # Khi booking hoàn thành → invalidate cache để tính lại usage history
            # (vì có thêm một booking mới hoàn thành → lịch sử sử dụng thay đổi)
            if self.redis_client and event_type == "booking.completed":
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                # Invalidate cache để force refresh lần sau
                loop.run_until_complete(
                    self.redis_client.delete(f"usage_history:{event.get('VehicleId')}")
                )
                loop.close()
            
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Error processing {event_type}: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def process_payment_event(self, ch, method, properties, body, event_type: str):
        """
        Xử lý payment events: created, completed.
        
        Actions:
        - Lưu event vào MongoDB để phân tích patterns thanh toán
        
        Args:
            ch: RabbitMQ channel
            method: Delivery method
            properties: Message properties
            body: Message body (JSON string)
            event_type: Loại event ("payment.created", "payment.completed")
        """
        try:
            event = json.loads(body)
            logger.info(f"Processing {event_type}: PaymentId={event.get('PaymentId')}")
            
            # Lưu event vào MongoDB để phân tích patterns thanh toán
            if self.mongodb_db:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.mongodb_db.payment_events.insert_one({
                        "event_type": event_type,
                        "payment_id": str(event.get("PaymentId")),
                        "user_id": str(event.get("UserId")),
                        "group_id": str(event.get("GroupId")),
                        "amount": event.get("Amount"),
                        "created_at": datetime.now(timezone.utc),
                        "event_data": event
                    })
                )
                loop.close()
            
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Error processing {event_type}: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def process_costshare_event(self, ch, method, properties, body, event_type: str):
        """
        Xử lý cost share events: created, updated.
        
        Actions:
        - Lưu event vào MongoDB để phân tích patterns chia chi phí
        
        Args:
            ch: RabbitMQ channel
            method: Delivery method
            properties: Message properties
            body: Message body (JSON string)
            event_type: Loại event ("costshare.created", "costshare.updated")
        """
        try:
            event = json.loads(body)
            logger.info(f"Processing {event_type}: CostShareId={event.get('CostShareId')}")
            
            # Lưu event vào MongoDB để phân tích patterns chia chi phí
            if self.mongodb_db:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.mongodb_db.costshare_events.insert_one({
                        "event_type": event_type,
                        "costshare_id": str(event.get("CostShareId")),
                        "group_id": str(event.get("GroupId")),
                        "total_amount": event.get("TotalAmount"),
                        "created_at": datetime.now(timezone.utc),
                        "event_data": event
                    })
                )
                loop.close()
            
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Error processing {event_type}: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def process_voting_status_changed(self, ch, method, properties, body):
        """
        Xử lý event voting.status.changed - khi trạng thái bỏ phiếu thay đổi.
        
        Actions:
        - Lưu event vào MongoDB để phân tích patterns quyết định nhóm
        
        Args:
            ch: RabbitMQ channel
            method: Delivery method
            properties: Message properties
            body: Message body (JSON string)
        """
        try:
            event = json.loads(body)
            logger.info(f"Processing voting.status.changed: ProposalId={event.get('ProposalId')}")
            
            # Lưu event vào MongoDB để phân tích patterns quyết định nhóm
            if self.mongodb_db:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.mongodb_db.voting_events.insert_one({
                        "event_type": "voting.status.changed",
                        "proposal_id": str(event.get("ProposalId")),
                        "vehicle_group_id": str(event.get("VehicleGroupId")),
                        "proposal_type": event.get("ProposalType"),
                        "status": event.get("Status"),
                        "updated_at": datetime.now(timezone.utc),
                        "event_data": event
                    })
                )
                loop.close()
            
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Error processing voting.status.changed: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def start_consuming(self):
        """
        Bắt đầu lắng nghe messages từ tất cả các queues.
        
        Flow:
        1. Khai báo tất cả queues
        2. Subscribe vào từng queue với callback tương ứng
        3. Bắt đầu consume messages (blocking call)
        
        Method này sẽ chạy trong background thread và block cho đến khi:
        - Có KeyboardInterrupt (Ctrl+C)
        - Connection bị đóng
        """
        if not self.channel:
            logger.error("Channel not initialized. Cannot start consuming.")
            return
        
        # Khai báo tất cả queues trước
        self.setup_queues()
        
        # Đăng ký callback cho từng queue
        subscriptions = [
            ("user.created", self.process_user_created),
            ("vehicle.group.updated", self.process_vehicle_group_updated),
            ("ownership.updated", self.process_ownership_updated),
            ("booking.created", lambda ch, m, p, b: self.process_booking_event(ch, m, p, b, "booking.created")),
            ("booking.approved", lambda ch, m, p, b: self.process_booking_event(ch, m, p, b, "booking.approved")),
            ("booking.completed", lambda ch, m, p, b: self.process_booking_event(ch, m, p, b, "booking.completed")),
            ("payment.created", lambda ch, m, p, b: self.process_payment_event(ch, m, p, b, "payment.created")),
            ("payment.completed", lambda ch, m, p, b: self.process_payment_event(ch, m, p, b, "payment.completed")),
            ("costshare.created", lambda ch, m, p, b: self.process_costshare_event(ch, m, p, b, "costshare.created")),
            ("costshare.updated", lambda ch, m, p, b: self.process_costshare_event(ch, m, p, b, "costshare.updated")),
            ("voting.status.changed", self.process_voting_status_changed),
        ]
        
        # Subscribe vào từng queue
        for queue, callback in subscriptions:
            try:
                self.channel.basic_consume(
                    queue=queue,
                    on_message_callback=callback,
                    auto_ack=False  # Manual ack để đảm bảo message chỉ bị xóa sau khi xử lý xong
                )
                logger.info(f"Subscribed to queue: {queue}")
            except Exception as e:
                logger.error(f"Failed to subscribe to {queue}: {e}")
        
        logger.info("Starting to consume messages from RabbitMQ...")
        try:
            # Bắt đầu consume (blocking call)
            self.channel.start_consuming()
        except KeyboardInterrupt:
            logger.info("Stopping consumer...")
            self.channel.stop_consuming()
    
    def close(self):
        """
        Đóng tất cả kết nối RabbitMQ một cách an toàn.
        Được gọi khi service shutdown.
        """
        if self.channel and not self.channel.is_closed:
            self.channel.close()
        if self.connection and not self.connection.is_closed:
            self.connection.close()
        logger.info("RabbitMQ consumer closed")

