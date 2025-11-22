# NiFi Flow Templates

This directory contains NiFi flow template definitions for the EV Co-ownership System.

## Templates

### 1. Event Ingestion Pipeline (`event_ingestion_template.json`)
- **Purpose**: Consume events from RabbitMQ and store in MongoDB
- **Processors**: ConsumeAMQP → RouteOnAttribute → PutMongo
- **Collections**: user_events, booking_events, payment_events, etc.

### 2. Data Aggregation Pipeline (`data_aggregation_template.json`)
- **Purpose**: Aggregate data from MongoDB and send to Report Service
- **Processors**: GenerateFlowFile → QueryMongo → AggregateContent → InvokeHTTP
- **Schedule**: Daily at 00:00 UTC

## Import Instructions

### Method 1: Using NiFi UI
1. Access NiFi UI at `http://localhost:8080`
2. Go to **Templates** menu
3. Click **Upload Template**
4. Select the JSON file
5. Drag template onto canvas
6. Configure processor properties with actual connection strings

### Method 2: Using NiFi REST API
```bash
# Upload template
curl -X POST http://localhost:8080/nifi-api/templates \
  -H "Content-Type: application/json" \
  -d @event_ingestion_template.json
```

### Method 3: Manual Configuration
Since NiFi templates require XML format and specific processor configurations, it's recommended to:
1. Create the flow manually in NiFi UI based on the design in `../docs/PIPELINE_DESIGN.md`
2. Export the template from NiFi UI
3. Save the exported XML template here

## Configuration Notes

- **RabbitMQ**: Update connection details in ConsumeAMQP processors
- **MongoDB**: Update URI in PutMongo and QueryMongo processors
- **Report Service**: Update URL in InvokeHTTP processors
- **Scheduling**: Configure GenerateFlowFile with appropriate cron expressions

## Processor Properties

### ConsumeAMQP
- Broker URI: `amqp://rabbitmq:5672`
- Queue Name: `ev_events` (or specific queue)
- Username: `rabbitmq`
- Password: `rabbitmq123`

### PutMongo
- Mongo URI: `mongodb://mongoadmin:mongopass123@mongodb:27017/nifi_data?authSource=admin`
- Database: `nifi_data`
- Collection: Varies by event type

### InvokeHTTP
- HTTP Method: `POST`
- URL: `http://report-service:80/api/reports/{endpoint}`
- Content-Type: `application/json`

## Next Steps

1. Import templates into NiFi
2. Configure processor properties
3. Start processors
4. Monitor flow performance
5. Adjust as needed
