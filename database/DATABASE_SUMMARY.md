# Tổng quan Database - 6 Databases cho 6 Services

## Cấu trúc Database

Hệ thống có **6 databases** cho **6 service chính**:

### SQL Server Databases (5 databases):

1. **auth_db** - Auth Service
   - Users, Roles, UserRoles, IdentityDocuments, DrivingLicenses

2. **ownership_db** - Ownership Service
   - CoOwners, VehicleGroups, Ownerships, EContracts, GroupFunds, FundTransactions, Proposals, Votes, Disputes

3. **booking_db** - Booking Service
   - Vehicles, CoOwners, Bookings, BookingHistory

4. **payment_db** - Payment Service
   - Wallets, CostShares, CostShareDetails, PaymentMethods, Payments, Transactions

5. **report_db** - Report Service
   - UsageHistories, ChargingSessions, MaintenanceRecords, CostRecords, AnalyticsReports

### MongoDB Database (1 database):

6. **ai_db** - AI Service + Logs (chung)
   - **AI Collections**: user_events, vehicle_group_events, ownership_events, booking_events, payment_events, costshare_events, voting_events
   - **Log Collections**: booking_logs (từ Booking Service), report_logs (từ Report Service)

## Mapping Service → Database

| Service | Database | Type |
|---------|----------|------|
| Auth Service | auth_db | SQL Server |
| Ownership Service | ownership_db | SQL Server |
| Booking Service | booking_db | SQL Server |
| | ai_db (logs) | MongoDB |
| Payment Service | payment_db | SQL Server |
| Report Service | report_db | SQL Server |
| | ai_db (logs) | MongoDB |
| AI Service | ai_db | MongoDB |

## Lưu ý

- **ai_db** được chia sẻ giữa AI Service, Booking Service (logs), và Report Service (logs)
- Mỗi service sử dụng collections riêng trong ai_db để tránh xung đột
- Tất cả logs được lưu trong ai_db thay vì tạo database riêng

