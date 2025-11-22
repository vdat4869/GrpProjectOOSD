"""
RabbitMQ Consumer for AI Service
Consumes events from all services to update AI models and cache
"""
import json
import logging
import os
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import pika
from pika.adapters.blocking_connection import BlockingChannel
from motor.motor_asyncio import AsyncIOMotorClient
import redis.asyncio as redis

logger = logging.getLogger("ai-service.rabbitmq")

class RabbitMQConsumer:
    def __init__(
        self,
        mongodb_client: Optional[AsyncIOMotorClient],
        redis_client: Optional[redis.Redis],
        mongodb_db=None
    ):
        self.mongodb_client = mongodb_client
        self.mongodb_db = mongodb_db
        self.redis_client = redis_client
        self.connection: Optional[pika.BlockingConnection] = None
        self.channel: Optional[BlockingChannel] = None
        
        # RabbitMQ connection settings
        self.host = os.getenv("RABBITMQ_HOST", "rabbitmq")
        self.port = int(os.getenv("RABBITMQ_PORT", "5672"))
        self.username = os.getenv("RABBITMQ_USERNAME", "rabbitmq")
        self.password = os.getenv("RABBITMQ_PASSWORD", "rabbitmq123")
        self.virtual_host = os.getenv("RABBITMQ_VHOST", "/")
    
    def connect(self):
        """Connect to RabbitMQ"""
        try:
            credentials = pika.PlainCredentials(self.username, self.password)
            parameters = pika.ConnectionParameters(
                host=self.host,
                port=self.port,
                virtual_host=self.virtual_host,
                credentials=credentials,
                heartbeat=600,
                blocked_connection_timeout=300
            )
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            logger.info(f"Connected to RabbitMQ at {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            return False
    
    def setup_queues(self):
        """Declare all queues"""
        if not self.channel:
            return
        
        queues = [
            "user.created",
            "vehicle.group.updated",
            "ownership.updated",
            "booking.created",
            "booking.approved",
            "booking.completed",
            "payment.created",
            "payment.completed",
            "costshare.created",
            "costshare.updated",
            "voting.status.changed"
        ]
        
        for queue in queues:
            try:
                self.channel.queue_declare(queue=queue, durable=True)
                logger.info(f"Declared queue: {queue}")
            except Exception as e:
                logger.error(f"Failed to declare queue {queue}: {e}")
    
    def process_user_created(self, ch, method, properties, body):
        """Process user.created event"""
        try:
            event = json.loads(body)
            logger.info(f"Processing user.created: UserId={event.get('UserId')}, Email={event.get('Email')}")
            
            # Store in MongoDB for AI analysis
            if self.mongodb_db:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.mongodb_db.user_events.insert_one({
                        "event_type": "user.created",
                        "user_id": event.get("UserId"),
                        "email": event.get("Email"),
                        "roles": event.get("Roles", []),
                        "created_at": datetime.now(timezone.utc),
                        "event_data": event
                    })
                )
                loop.close()
            
            # Update Redis cache for quick access
            if self.redis_client:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(
                    self.redis_client.setex(
                        f"user:{event.get('UserId')}",
                        3600,
                        json.dumps(event)
                    )
                )
                loop.close()
            
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Error processing user.created: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def process_vehicle_group_updated(self, ch, method, properties, body):
        """Process vehicle.group.updated event"""
        try:
            event = json.loads(body)
            logger.info(f"Processing vehicle.group.updated: VehicleGroupId={event.get('VehicleGroupId')}")
            
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
            
            # Invalidate cache
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
        """Process ownership.updated event"""
        try:
            event = json.loads(body)
            logger.info(f"Processing ownership.updated: OwnershipId={event.get('OwnershipId')}")
            
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
            
            # Invalidate cache
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
        """Process booking events (created, approved, completed)"""
        try:
            event = json.loads(body)
            logger.info(f"Processing {event_type}: BookingId={event.get('BookingId')}")
            
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
            
            # Update usage history cache for AI suggestions
            if self.redis_client and event_type == "booking.completed":
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                # Invalidate cache to force refresh
                loop.run_until_complete(
                    self.redis_client.delete(f"usage_history:{event.get('VehicleId')}")
                )
                loop.close()
            
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f"Error processing {event_type}: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)
    
    def process_payment_event(self, ch, method, properties, body, event_type: str):
        """Process payment events (created, completed)"""
        try:
            event = json.loads(body)
            logger.info(f"Processing {event_type}: PaymentId={event.get('PaymentId')}")
            
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
        """Process cost share events (created, updated)"""
        try:
            event = json.loads(body)
            logger.info(f"Processing {event_type}: CostShareId={event.get('CostShareId')}")
            
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
        """Process voting.status.changed event"""
        try:
            event = json.loads(body)
            logger.info(f"Processing voting.status.changed: ProposalId={event.get('ProposalId')}")
            
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
        """Start consuming from all queues"""
        if not self.channel:
            logger.error("Channel not initialized. Cannot start consuming.")
            return
        
        # Setup queues
        self.setup_queues()
        
        # Subscribe to all queues
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
        
        for queue, callback in subscriptions:
            try:
                self.channel.basic_consume(
                    queue=queue,
                    on_message_callback=callback,
                    auto_ack=False
                )
                logger.info(f"Subscribed to queue: {queue}")
            except Exception as e:
                logger.error(f"Failed to subscribe to {queue}: {e}")
        
        logger.info("Starting to consume messages from RabbitMQ...")
        try:
            self.channel.start_consuming()
        except KeyboardInterrupt:
            logger.info("Stopping consumer...")
            self.channel.stop_consuming()
    
    def close(self):
        """Close connections"""
        if self.channel and not self.channel.is_closed:
            self.channel.close()
        if self.connection and not self.connection.is_closed:
            self.connection.close()
        logger.info("RabbitMQ consumer closed")

