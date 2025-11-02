# Account Ownership Service

Microservice quản lý thông tin chủ sở hữu và tỷ lệ sở hữu xe điện.

## Chức năng

- **Quản lý Co-Owner (Chủ xe)**
  - Đăng ký thông tin chủ xe (CMND/CCCD, bằng lái, email...)
  - Xác thực và xác minh chủ xe
  - Cập nhật thông tin cá nhân

- **Quản lý Ownership (Tỷ lệ sở hữu)**
  - Thiết lập và quản lý tỷ lệ sở hữu theo từng nhóm xe
  - Tự động kiểm tra tổng tỷ lệ không vượt quá 100%
  - Hỗ trợ nhiều kỳ sở hữu (start date, end date)

- **Quản lý E-Contract (Hợp đồng điện tử)**
  - Tạo hợp đồng đồng sở hữu
  - Ký điện tử (digital signature)
  - Theo dõi trạng thái hợp đồng (Pending, Signed, Rejected, Expired)

## Tech Stack

- **.NET 8** - ASP.NET Core Web API
- **Entity Framework Core** - ORM với SQL Server
- **MediatR** - CQRS pattern
- **AutoMapper** - Object mapping
- **FluentValidation** - Input validation
- **JWT Bearer** - Authentication
- **SignalR** - Real-time notifications

## API Endpoints

### Co-Owners
- `GET /api/coowners` - Lấy danh sách chủ xe (Admin/Staff)
- `GET /api/coowners/{id}` - Lấy thông tin chủ xe theo ID
- `GET /api/coowners/user/{userId}` - Lấy thông tin chủ xe theo User ID
- `POST /api/coowners` - Tạo chủ xe mới (Admin/Staff)
- `PUT /api/coowners/{id}` - Cập nhật thông tin chủ xe
- `POST /api/coowners/{id}/verify` - Xác minh chủ xe (Admin/Staff)

### Ownerships
- `GET /api/ownerships/vehicle-group/{vehicleGroupId}` - Lấy danh sách tỷ lệ sở hữu theo nhóm xe
- `GET /api/ownerships/co-owner/{coOwnerId}` - Lấy danh sách tỷ lệ sở hữu theo chủ xe
- `POST /api/ownerships` - Tạo tỷ lệ sở hữu mới (Admin/Staff)
- `PUT /api/ownerships/{id}` - Cập nhật tỷ lệ sở hữu (Admin/Staff)

### E-Contracts
- `GET /api/econtracts/vehicle-group/{vehicleGroupId}` - Lấy danh sách hợp đồng theo nhóm xe
- `POST /api/econtracts` - Tạo hợp đồng mới (Admin/Staff)
- `POST /api/econtracts/{id}/sign` - Ký hợp đồng điện tử

## Database Schema

### CoOwner
- Id (Guid, PK)
- UserId (string, unique) - Reference to Auth Service
- FullName, IdentityCardNumber, Email, PhoneNumber, Address
- IsVerified, VerifiedAt
- CreatedAt, UpdatedAt

### Ownership
- Id (Guid, PK)
- CoOwnerId (Guid, FK)
- VehicleGroupId (Guid) - Reference to Group Management Service
- OwnershipPercentage (decimal 5,2)
- StartDate, EndDate
- IsActive
- Notes

### EContract
- Id (Guid, PK)
- CoOwnerId (Guid, FK)
- VehicleGroupId (Guid)
- ContractTitle, ContractContent
- OwnershipPercentage
- ContractStatus (Pending, Signed, Rejected, Expired)
- DigitalSignature, SignedAt
- ExpiresAt

## Configuration

Cấu hình trong `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=EvAccountOwnershipDb;..."
  },
  "JWT": {
    "Secret": "...",
    "Issuer": "EV-CoOwnership-System",
    "Audience": "EV-CoOwnership-System",
    "ExpirationMinutes": 60
  }
}
```

## Chạy local

```bash
cd services/account-ownership-service
dotnet restore
dotnet run
```

Service sẽ chạy tại `http://localhost:5002` với Swagger UI.

## Chạy với Docker

```bash
docker build -t ev-account-ownership-service .
docker run -p 5002:80 ev-account-ownership-service
```

## Development

### Tạo Migration
```bash
dotnet ef migrations add InitialCreate --context ApplicationDbContext
```

### Apply Migration
```bash
dotnet ef database update --context ApplicationDbContext
```

