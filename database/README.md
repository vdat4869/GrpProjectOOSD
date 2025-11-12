Databases overview

Per microservice databases (SQL Server unless noted):
- Auth Service: auth_db
- Ownership Service: ownership_db
- Booking Service: booking_db
- Payment Service: payment_db
- Report Service: report_db
- AI Service: ai_db (MongoDB)
- Redis: redis_cache
- MongoDB (logs): mongo_logs
- RabbitMQ: Message broker (no DB)

Initialization
- SQL Server: files in mssql/init create databases. Schemas/tables are managed by EF Core migrations in each service.
- MongoDB: databases/collections are created on first write by the services. Optionally, add init scripts via mongosh if desired.
- Redis: keyspace created on demand.

Notes
- Existing legacy scripts (AccountDB/GroupDB/HistoryDB) are kept for backward-compatibility. New canonical names are added (auth_db, ownership_db, report_db, etc.).
- Update connection strings in each service to match the new names when you are ready to migrate.


