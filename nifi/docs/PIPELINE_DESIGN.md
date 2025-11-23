# Nifi Pipeline Design - EV Co-ownership System

## Overview
Apache NiFi pipelines for ETL, data aggregation, and service-to-service orchestration.

## Pipeline Architecture

### 1. Event Ingestion Pipeline
**Purpose**: Consume events from RabbitMQ and route to appropriate processors

**Flow**:
```
RabbitMQ Consumer → RouteOnAttribute → 
  ├─ user.created → LogAttribute → MongoDB Put
  ├─ vehicle.group.updated → LogAttribute → MongoDB Put
  ├─ ownership.updated → LogAttribute → MongoDB Put
  ├─ booking.* → LogAttribute → MongoDB Put → UpdateUsageCache
  ├─ payment.* → LogAttribute → MongoDB Put → UpdateCostCache
  └─ voting.* → LogAttribute → MongoDB Put
```

**Processors**:
- `ConsumeAMQP` - Consume from RabbitMQ queues
- `RouteOnAttribute` - Route based on event type
- `LogAttribute` - Log for debugging
- `PutMongo` - Store in MongoDB collections
- `UpdateAttribute` - Add metadata (timestamp, source)

### 2. Data Aggregation Pipeline
**Purpose**: Aggregate data for reports and analytics

**Flow**:
```
MongoDB Query → AggregateContent → 
  ├─ Daily Usage Aggregation → Report Service API
  ├─ Cost Sharing Aggregation → Report Service API
  └─ Ownership Statistics → Report Service API
```

**Processors**:
- `QueryMongo` - Query MongoDB collections
- `AggregateContent` - Aggregate by date/group/co-owner
- `InvokeHTTP` - Send aggregated data to Report Service
- `UpdateAttribute` - Add aggregation metadata

### 3. Service Orchestration Pipeline
**Purpose**: Orchestrate cross-service workflows

**Flow**:
```
Trigger → 
  ├─ Check Booking Conflicts → InvokeHTTP (Booking Service)
  ├─ Calculate Cost Share → InvokeHTTP (AI Service)
  └─ Generate Report → InvokeHTTP (Report Service)
```

**Processors**:
- `GenerateFlowFile` - Trigger on schedule
- `InvokeHTTP` - Call service APIs
- `RouteOnResponse` - Route based on response
- `PutMongo` - Store orchestration logs

## Queue Mappings

### RabbitMQ Queues → NiFi FlowFiles
- `user.created` → FlowFile with attribute `event.type=user.created`
- `vehicle.group.updated` → FlowFile with attribute `event.type=vehicle.group.updated`
- `ownership.updated` → FlowFile with attribute `event.type=ownership.updated`
- `booking.created` → FlowFile with attribute `event.type=booking.created`
- `booking.approved` → FlowFile with attribute `event.type=booking.approved`
- `booking.completed` → FlowFile with attribute `event.type=booking.completed`
- `payment.created` → FlowFile with attribute `event.type=payment.created`
- `payment.completed` → FlowFile with attribute `event.type=payment.completed`
- `costshare.created` → FlowFile with attribute `event.type=costshare.created`
- `costshare.updated` → FlowFile with attribute `event.type=costshare.updated`
- `voting.status.changed` → FlowFile with attribute `event.type=voting.status.changed`

## MongoDB Collections

### Event Storage
- `user_events` - User creation events
- `vehicle_group_events` - Vehicle group updates
- `ownership_events` - Ownership changes
- `booking_events` - Booking lifecycle events
- `payment_events` - Payment transactions
- `costshare_events` - Cost sharing events
- `voting_events` - Voting status changes

### Aggregated Data
- `daily_usage_stats` - Daily usage statistics by group
- `cost_sharing_stats` - Cost sharing statistics
- `ownership_stats` - Ownership distribution statistics

## Configuration

### RabbitMQ Connection
- Host: `rabbitmq`
- Port: `5672`
- Username: `rabbitmq`
- Password: `rabbitmq123`
- Virtual Host: `/`

### MongoDB Connection
- URI: `mongodb://mongoadmin:mongopass123@mongodb:27017/nifi_data?authSource=admin`
- Database: `nifi_data`

### Report Service API
- Base URL: `http://report-service:80`
- Endpoints:
  - `POST /api/reports/usage` - Submit usage aggregation
  - `POST /api/reports/cost` - Submit cost aggregation
  - `POST /api/reports/ownership` - Submit ownership stats

## Scheduling

### Real-time Processing
- Event ingestion: Continuous (as events arrive)
- Service orchestration: On-demand (triggered by events)

### Batch Processing
- Daily aggregation: Run at 00:00 UTC daily
- Weekly reports: Run every Monday at 00:00 UTC
- Monthly statistics: Run on 1st of month at 00:00 UTC

## Error Handling

### Retry Logic
- Max retries: 3
- Retry interval: 5 seconds
- Exponential backoff: Yes

### Dead Letter Queue
- Failed events → `nifi.dead.letter` queue
- Manual review required
- Alert on DLQ size > 100

## Monitoring

### Metrics
- FlowFiles processed per minute
- Error rate
- Processing latency
- Queue depth

### Alerts
- High error rate (> 5%)
- Processing latency > 10 seconds
- Dead letter queue size > 100