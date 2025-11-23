# ============================================
# TỔNG QUAN VỀ DATABASE
# ============================================

## Danh sách Database theo Microservice

Hệ thống sử dụng kiến trúc microservices với 6 databases cho 6 service chính:

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
- **ai_db (MongoDB)**: Database chung cho AI Service, Booking Service logs, và Report Service logs
  - Lưu trữ events từ các microservices để phân tích AI và machine learning
  - Collections: user_events, vehicle_group_events, ownership_events, booking_events, payment_events, costshare_events, voting_events
  - Lưu trữ logs từ Booking Service và Report Service
  - Collections logs: booking_logs, report_logs

### Cache & Message Broker:
- **redis_cache (Redis)**: Cache database
  - Lưu trữ dữ liệu cache để tăng hiệu suất
  - Keyspace được tạo tự động khi cần

- **RabbitMQ**: Message broker (không có database)
  - Xử lý message queue giữa các microservices

## Khởi tạo Database

### SQL Server:
- Các file trong `mssql/init/` tạo các database và schema
- Schema và bảng được quản lý bởi EF Core migrations trong mỗi service
- **Các file SQL đã được gộp theo database để dễ quản lý:**
  - `010_auth_complete.sql` - Tạo database và schema cho auth_db
  - `020_ownership_complete.sql` - Tạo database và schema cho ownership_db (bao gồm Disputes, Votes fix, ImageUrl)
  - `030_booking_complete.sql` - Tạo database và schema cho booking_db (bao gồm BookingHistory, SyncCoOwners stored procedure)
  - `040_payment_complete.sql` - Tạo database và schema cho payment_db
  - `050_report_complete.sql` - Tạo database và schema cho report_db
- Thứ tự chạy: Các file được chạy theo thứ tự số (010 → 020 → 030 → 040 → 050)

### MongoDB:
- Databases và collections được tạo tự động khi service ghi dữ liệu lần đầu
- Có thể thêm init scripts qua mongosh nếu cần

### Redis:
- Keyspace được tạo tự động khi cần

## Lưu ý

- Tất cả các script SQL đều là **idempotent** - có thể chạy nhiều lần mà không gây lỗi
- Các file SQL đã được gộp để giảm số lượng file và dễ quản lý hơn
- Mỗi file complete chứa: tạo database + schema + migrations (nếu có)
- Các script export/import trong `scripts/` được giữ lại để hỗ trợ chia sẻ dữ liệu giữa các máy development


