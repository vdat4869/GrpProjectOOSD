# ============================================
# TỔNG QUAN VỀ DATABASE
# ============================================

## Danh sách Database theo Microservice

Hệ thống sử dụng kiến trúc microservices, mỗi service có database riêng:

### SQL Server Databases:
- **auth_db**: Database cho Auth Service
  - Lưu trữ thông tin người dùng, xác thực, và KYC (Know Your Customer)
  - Các bảng: Users, Roles, UserRoles, IdentityDocuments, DrivingLicenses

- **ownership_db**: Database cho Ownership Service
  - Quản lý quyền sở hữu xe, nhóm xe, và các hoạt động liên quan
  - Các bảng: CoOwners, VehicleGroups, Ownerships, EContracts, GroupFunds, FundTransactions, Proposals, Votes, Disputes

- **booking_db**: Database cho Booking Service
  - Quản lý việc đặt xe, lịch sử dụng xe, và check-in/check-out
  - Các bảng: Vehicles, CoOwners, Bookings

- **payment_db**: Database cho Payment Service
  - Quản lý thanh toán, ví điện tử, và chia sẻ chi phí
  - Các bảng: Wallets, CostShares, CostShareDetails, PaymentMethods, Payments, Transactions

- **report_db**: Database cho Report Service
  - Lưu trữ dữ liệu phân tích, báo cáo, và lịch sử sử dụng xe
  - Các bảng: UsageHistories, ChargingSessions, MaintenanceRecords, CostRecords, AnalyticsReports

### NoSQL Databases:
- **ai_db (MongoDB)**: Database cho AI Service
  - Lưu trữ events từ các microservices để phân tích AI và machine learning
  - Collections: user_events, vehicle_group_events, ownership_events, booking_events, payment_events, costshare_events, voting_events

- **mongo_logs (MongoDB)**: Database lưu trữ logs
  - Lưu trữ logs từ các services

### Cache & Message Broker:
- **redis_cache (Redis)**: Cache database
  - Lưu trữ dữ liệu cache để tăng hiệu suất
  - Keyspace được tạo tự động khi cần

- **RabbitMQ**: Message broker (không có database)
  - Xử lý message queue giữa các microservices

## Khởi tạo Database

### SQL Server:
- Các file trong `mssql/init/` tạo các database
- Schema và bảng được quản lý bởi EF Core migrations trong mỗi service
- Thứ tự chạy script:
  1. Tạo database: `015_auth_db.sql`, `025_ownership_db.sql`, `035_booking_db.sql`, `045_payment_db.sql`, `055_report_db.sql`
  2. Tạo schema: `115_auth_schema.sql`, `125_ownership_schema.sql`, `135_booking_schema.sql`, `140_disputes_schema.sql`, `145_payment_schema.sql`, `155_report_schema.sql`
  3. Migration scripts: `160_fix_vote_choice_column.sql`

### MongoDB:
- Databases và collections được tạo tự động khi service ghi dữ liệu lần đầu
- Có thể thêm init scripts qua mongosh nếu cần

### Redis:
- Keyspace được tạo tự động khi cần

## Lưu ý

- Các script legacy (AccountDB/GroupDB/HistoryDB) được giữ lại để tương thích ngược
- Tên database mới (auth_db, ownership_db, report_db, etc.) đã được thêm vào
- Cập nhật connection strings trong mỗi service để khớp với tên mới khi sẵn sàng migrate
- Tất cả các script SQL đều là idempotent - có thể chạy nhiều lần mà không gây lỗi


