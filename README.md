# EV Co-ownership & Cost-sharing System

🧭 Giới thiệu

EV Co-ownership & Cost-sharing System là hệ thống quản lý đồng sở hữu và chia sẻ chi phí xe điện, giúp nhiều người cùng sở hữu và sử dụng một chiếc xe điện một cách công bằng, minh bạch và hiệu quả.

🎯 Mục tiêu

- Quản lý tỷ lệ sở hữu và hợp đồng đồng sở hữu (e-contract).
- Đặt lịch sử dụng xe công bằng, có ưu tiên theo tỷ lệ sở hữu.
- Tự động chia chi phí bảo dưỡng, bảo hiểm, sạc điện, vệ sinh, đăng kiểm,…
- Theo dõi lịch sử sử dụng, thanh toán, bỏ phiếu nhóm, AI gợi ý sử dụng công bằng.
- Cung cấp báo cáo chi tiết cho Co-owner, Staff và Admin.

🧩 Kiến trúc hệ thống

Hệ thống được xây dựng theo mô hình **Microservice Architecture**, giao tiếp thông qua API Gateway và RabbitMQ.

Các service độc lập được triển khai trong Docker Compose và kết nối bằng Apache NiFi cho các luồng dữ liệu lớn (ETL, log, thống kê).

```
ev-coownership-system/
├── gateway-service/        # API Gateway (Reverse Proxy, Routing, Rate Limit)
├── auth-service/           # Đăng ký, xác thực, phân quyền, KYC
├── ownership-service/      # Xe, nhóm đồng sở hữu, hợp đồng, bỏ phiếu, quỹ nhóm
├── booking-service/        # Đặt lịch, Check-in/out, lịch sử sử dụng
├── payment_service/        # Thanh toán, chia chi phí, ví điện tử
│   ├── payment-service/    # Payment Service (C# .NET)
│   └── vnpay-service/      # VNPay Integration Service (Node.js)
├── report-service/         # Thống kê, phân tích cá nhân & nhóm
├── ai-service/             # AI gợi ý lịch công bằng, tối ưu chi phí
├── rabbitmq/               # Message Queue trung gian giữa các service
├── nifi/                   # Apache NiFi xử lý ETL, log, dữ liệu lớn
├── database/               # SQL init scripts (đã gộp theo database)
│   └── mssql/init/         # 010_auth_complete.sql, 020_ownership_complete.sql, ...
└── frontend/               # ReactJS + Tailwind (giao diện người dùng)
```

## Service Mapping

| Service | Chức năng chính | Actor liên quan | Tính năng đã implement |
|---------|----------------|-----------------|------------------------|
| **Auth Service** | - Đăng ký & đăng nhập tài khoản Co-owner, Staff, Admin<br>- Xác thực KYC (CMND/CCCD, giấy phép lái xe)<br>- Phân quyền theo vai trò (Co-owner / Staff / Admin)<br>- Đổi mật khẩu, quản lý session<br>- Xác thực JWT cho các request qua Gateway | Co-owner, Staff, Admin | ✅ KYC verification<br>✅ JWT authentication<br>✅ Role-based authorization |
| **Ownership Service** | - Quản lý thông tin xe và tỉ lệ sở hữu (A 40%, B 30%, ...)<br>- Quản lý hợp đồng đồng sở hữu (ký điện tử, lưu hồ sơ pháp lý)<br>- Quản lý nhóm đồng sở hữu: thêm/xóa thành viên, phân quyền nhóm<br>- Quản lý quỹ nhóm (đóng góp, chi tiêu, minh bạch số dư)<br>- Quản lý quyết định & bỏ phiếu nhóm (nâng cấp pin, sửa chữa, bán xe)<br>- Tự động đóng vote khi hết thời gian hoặc tất cả thành viên đã vote<br>- Tự động tạo CostShare khi proposal được approve | Co-owner, Staff, Admin | ✅ Vehicle groups<br>✅ Ownership management<br>✅ E-contracts<br>✅ Voting system<br>✅ Auto-close voting<br>✅ Group funds |
| **Booking Service** | - Lịch hiển thị xe đang trống / đang dùng<br>- Đặt lịch sử dụng xe, ghi chú<br>- Check-in / Check-out bằng QR code, ký số khi nhận xe<br>- Hệ thống ưu tiên công bằng theo tỉ lệ sở hữu & lịch sử dùng xe<br>- Lưu lịch sử sử dụng: thời gian, quãng đường, chi phí phát sinh<br>- Báo cáo trạng thái lịch: Pending / Confirmed / Completed / Cancelled / NoShow | Co-owner, Staff, Admin | ✅ Booking management<br>✅ QR code check-in/out<br>✅ Booking history<br>✅ Schedule view |
| **Payment Service** | - Tự động chia chi phí theo tỉ lệ sở hữu hoặc thời gian sử dụng<br>- Ghi nhận chi phí: điện, bảo dưỡng, bảo hiểm, đăng kiểm, vệ sinh, phí nhóm<br>- Thanh toán trực tuyến (VNPay, MoMo, eWallet, Banking)<br>- Quản lý ví điện tử cho từng nhóm<br>- Quản lý lịch sử giao dịch, biên lai điện tử<br>- Tự động cập nhật trạng thái CostShare khi tất cả thành viên đã thanh toán<br>- Tổng hợp chi phí theo tháng/quý, đồng bộ cho Report Service | Co-owner, Admin | ✅ Cost sharing<br>✅ VNPay integration<br>✅ Wallet management<br>✅ Payment history<br>✅ Auto-update status |
| **Report Service** | - Tổng hợp dữ liệu cá nhân: thời gian sử dụng, chi phí, quãng đường<br>- Phân tích và so sánh với tỉ lệ sở hữu<br>- Tổng hợp báo cáo nhóm: quỹ chung, mức sử dụng của từng thành viên<br>- Sinh biểu đồ tài chính, thống kê sử dụng xe, tần suất đặt lịch<br>- Xuất báo cáo tổng hợp (cho Admin/Staff)<br>- Tự động cập nhật từ CostShare events qua RabbitMQ | Co-owner, Staff, Admin | ✅ Usage analytics<br>✅ Cost reports<br>✅ RabbitMQ integration |
| **AI Service** | - Phân tích dữ liệu sử dụng xe & tỉ lệ sở hữu để đề xuất lịch công bằng<br>- Gợi ý chia chi phí hợp lý giữa các đồng sở hữu<br>- Gợi ý quyết định nhóm (ví dụ: nâng cấp pin, thay ắc quy, bảo hiểm)<br>- Phát hiện bất công bằng trong việc đặt lịch (recommendation feedback) | Co-owner, Admin | 🚧 In development |

🧰 Ngăn xếp công nghệ

### ⚙️ Backend

- **Ngôn ngữ**: C# (.NET 8 / ASP.NET Core Web API)
- **Cơ sở dữ liệu**:
  - SQL Server → dữ liệu nghiệp vụ chính (5 databases)
  - Redis → cache session & token
  - MongoDB → log & lịch sử sử dụng
- **Giao tiếp**: REST API, RabbitMQ (event bus), SignalR (real-time)
- **Gateway**: YARP / Custom API Gateway (Reverse Proxy)
- **Data Integration**: Apache NiFi (ETL, data flow, aggregation)
- **Payment Gateway**: VNPay (tích hợp qua Node.js service)
- **Frameworks**:
  - Entity Framework Core
  - MediatR (CQRS Pattern)
  - AutoMapper
  - FluentValidation

### 💻 Frontend

- ReactJS + TailwindCSS + Vite
- Ngôn ngữ: TypeScript
- Biểu đồ: Recharts
- Realtime: SignalR
- Giao tiếp: HTTPS qua API Gateway

### 🤖 AI Service

- Ngôn ngữ: Python (FastAPI)
- Chức năng:
  - Gợi ý lịch sử dụng xe công bằng
  - Tối ưu chia chi phí theo lịch sử sử dụng
  - Gợi ý quyết định nhóm (vote suggestion)
- API chính: `/api/ai/suggestions`

### 💳 Payment Gateway

- **VNPay Service**: Node.js service tích hợp VNPay
- Hỗ trợ thanh toán: VNPay, MoMo, eWallet, Banking

🧱 Cấu trúc cơ sở dữ liệu

Mỗi service có database riêng biệt (SQL Server / MongoDB) để đảm bảo tính độc lập và bảo mật dữ liệu.

| Service | Database | Mục đích |
|---------|----------|----------|
| Auth Service | auth_db (SQL) | Người dùng, role, phân quyền, KYC documents |
| Ownership Service | ownership_db (SQL) | Xe, nhóm, hợp đồng, bỏ phiếu, quỹ nhóm, tranh chấp |
| Booking Service | booking_db (SQL) | Lịch sử đặt xe, check-in/out, booking history |
| | ai_db (MongoDB) | Logs từ Booking Service |
| Payment Service | payment_db (SQL) | Ví điện tử, hóa đơn, giao dịch, chia phí |
| Report Service | report_db (SQL) | Dữ liệu tổng hợp & thống kê |
| | ai_db (MongoDB) | Logs từ Report Service |
| AI Service | ai_db (MongoDB) | Dữ liệu huấn luyện & đề xuất, events |
| Redis | redis_cache | Cache session & token |
| RabbitMQ | - | Message Broker giữa các service |

**Tổng cộng: 6 databases (5 SQL Server + 1 MongoDB)**

### Database Initialization

Các file SQL init đã được gộp theo database để dễ quản lý:

- `010_auth_complete.sql` - Tạo database và schema cho auth_db
- `020_ownership_complete.sql` - Tạo database và schema cho ownership_db (bao gồm Disputes, Votes fix, ImageUrl)
- `030_booking_complete.sql` - Tạo database và schema cho booking_db (bao gồm BookingHistory, SyncCoOwners stored procedure)
- `040_payment_complete.sql` - Tạo database và schema cho payment_db
- `050_report_complete.sql` - Tạo database và schema cho report_db

Tất cả các script SQL đều là **idempotent** - có thể chạy nhiều lần mà không gây lỗi.

🔄 Giao tiếp giữa các Service

- **Gateway → Auth / Ownership / Booking / Payment / Report / AI**
  - Xử lý request, routing, xác thực JWT.

- **RabbitMQ**
  - Event Bus trung gian, giúp service publish/subscribe sự kiện:
    - `costshare.created` / `costshare.updated` → Report Service tạo CostRecord
    - `booking.completed` → Payment Service tính chi phí
    - `ownership.group.updated` → Booking Service đồng bộ thông tin nhóm
    - `voting.closed` → Payment Service tạo CostShare (nếu proposal approved)

- **Apache NiFi**
  - Kéo dữ liệu log, thống kê từ MongoDB / SQL → Report Service
  - (hỗ trợ luồng ETL tự động và chuẩn hóa dữ liệu báo cáo)

- **Service-to-Service Communication**
  - Ownership Service → Payment Service: Tạo CostShare từ approved proposal (internal endpoint)
  - Auth Service → Ownership Service: Đồng bộ Co-owners sau KYC approval
  - Booking Service → Payment Service: Tính chi phí sau check-out

👥 Phân quyền Actor

| Actor | Vai trò | Quyền hạn |
|-------|---------|-----------|
| **Co-owner** | Người đồng sở hữu xe điện | Đặt lịch, thanh toán, theo dõi lịch sử, tham gia nhóm & bỏ phiếu, quản lý quỹ nhóm |
| **Staff** | Nhân viên vận hành | Quản lý check-in/out, kiểm định xe, theo dõi tranh chấp, duyệt KYC |
| **Admin** | Quản trị viên hệ thống | Duyệt hợp đồng, xử lý tranh chấp, xem báo cáo, quản lý người dùng, toàn quyền |

⚡ Triển khai (Deployment)

Sử dụng Docker Compose: mỗi service là 1 container độc lập.

RabbitMQ và NiFi chạy dưới dạng service riêng.

### Khởi chạy hệ thống

```bash
# Clone repository
git clone <repository-url>
cd GrpProjectOOSD

# Tạo file .env (xem SETUP.md để biết các biến cần thiết)
# Hoặc sử dụng các giá trị mặc định trong docker-compose.yml

# Khởi chạy tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Xem logs của một service cụ thể
docker-compose logs -f ownership-service

# Dừng hệ thống
docker-compose down

# Dừng và xóa volumes (xóa dữ liệu)
docker-compose down -v
```

### Ports

| Service | Port | URL |
|---------|------|-----|
| **Gateway** | 8000 | http://localhost:8000 |
| **Auth Service** | 5000 | http://localhost:5000 |
| **Ownership Service** | 5001 | http://localhost:5001 |
| **Booking Service** | 5002 | http://localhost:5002 |
| **Payment Service** | 5003 | http://localhost:5003 |
| **Report Service** | 5004 | http://localhost:5004 |
| **AI Service** | 8010 | http://localhost:8010 |
| **VNPay Service** | 3001 | http://localhost:3001 |
| **Frontend** | 80 | http://localhost |
| **RabbitMQ Management** | 15672 | http://localhost:15672 |
| **NiFi** | 8080 | http://localhost:8080 |
| **MongoDB** | 27017 | mongodb://localhost:27017 |
| **Redis** | 6379 | redis://localhost:6379 |
| **SQL Server** | 1433 | localhost:1433 |

### Environment Variables

Tạo file `.env` hoặc cập nhật các biến môi trường trong `docker-compose.yml`:

```env
# Database
SA_PASSWORD=YourStrong@Password123
SQL_HOST=sql
SQL_USER=sa

# JWT
JWT_SECRET=YourSuperSecretKeyForJWTTokenGeneration2024
JWT_ISSUER=EV-CoOwnership-System
JWT_AUDIENCE=EV-CoOwnership-System

# RabbitMQ
RABBITMQ_USER=rabbitmq
RABBITMQ_PASS=rabbitmq123

# MongoDB
MONGO_USER=mongoadmin
MONGO_PASSWORD=mongopass123

# VNPay (nếu sử dụng)
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

📊 Luồng dữ liệu (Data Flow)

1. **Co-owner đăng ký** → Auth Service → KYC verification → Ownership Service sync Co-owner
2. **Co-owner tạo nhóm xe** → Ownership Service → Tạo VehicleGroup, Ownerships
3. **Co-owner đặt lịch** → Booking Service → Publish event → Payment Service tính chi phí
4. **Co-owner tạo proposal** → Ownership Service → Voting → Auto-close → Tạo CostShare (nếu approved)
5. **Thanh toán** → Payment Service → VNPay → Callback → Cập nhật CostShare status → Report Service
6. **Report Service** → Lấy dữ liệu từ RabbitMQ events → Tạo CostRecord → Analytics

💡 Điểm nổi bật

- ✅ Kiến trúc microservice hoàn chỉnh, mở rộng linh hoạt
- ✅ API Gateway + RabbitMQ + NiFi tạo thành hệ thống giao tiếp, đồng bộ dữ liệu mạnh mẽ
- ✅ Phân quyền Co-owner / Staff / Admin rõ ràng
- ✅ KYC verification tự động đồng bộ với Ownership Service
- ✅ Voting system tự động đóng khi hết thời gian hoặc tất cả thành viên đã vote
- ✅ Tự động tạo CostShare từ approved proposals
- ✅ Payment gateway tích hợp VNPay
- ✅ Tự động cập nhật trạng thái CostShare khi tất cả thành viên đã thanh toán
- ✅ Report Service tự động cập nhật từ RabbitMQ events
- 🚧 Tích hợp AI gợi ý fairness (đang phát triển)

🔧 Development

### Prerequisites

- .NET 8 SDK
- Docker Desktop
- Node.js 18+ (for frontend và VNPay service)
- Python 3.11+ (for AI service)

### Local Development

```bash
# 1. Clone và setup
git clone <repository-url>
cd GrpProjectOOSD

# 2. Tạo file .env (xem SETUP.md để biết các biến cần thiết)

# 3. Restore dependencies
# Backend - Restore từng service
cd auth-service && dotnet restore && cd ..
cd ownership-service && dotnet restore && cd ..
cd booking-service && dotnet restore && cd ..
cd payment_service/payment-service && dotnet restore && cd ../..
cd report-service && dotnet restore && cd ..

# Frontend
cd frontend && npm install --legacy-peer-deps && cd ..

# VNPay Service
cd payment_service/vnpay-service && npm install && cd ../..

# AI Service
cd ai-service && pip install -r requirements.txt && cd ..

# 4. Start với Docker Compose (khuyến nghị)
docker-compose up -d

# Hoặc chạy từng service riêng:
# Backend services
cd auth-service
dotnet run

# Frontend
cd frontend
npm run dev

# AI Service
cd ai-service
python main.py
```

**Lưu ý**: Xem file `SETUP.md` để biết chi tiết về setup và troubleshooting.

### Database Migration

Các service sử dụng EF Core migrations. Database sẽ tự động migrate khi service start (trong Program.cs).

Nếu cần migrate thủ công:

```bash
# Auth Service
cd auth-service
dotnet ef database update

# Ownership Service
cd ownership-service
dotnet ef database update

# Booking Service
cd booking-service
dotnet ef database update

# Payment Service
cd payment_service/payment-service
dotnet ef database update

# Report Service
cd report-service
dotnet ef database update
```

### Testing

```bash
# Run tests
dotnet test

# Integration tests
docker-compose up -d
# Run integration tests
```

## 🎯 Tính năng đã hoàn thành

### Authentication & Authorization
- ✅ Đăng ký, đăng nhập với JWT
- ✅ KYC verification (CMND/CCCD, giấy phép lái xe)
- ✅ Role-based authorization (Co-owner, Staff, Admin)
- ✅ Auto-sync Co-owners sau KYC approval

### Ownership Management
- ✅ Quản lý nhóm xe (VehicleGroups)
- ✅ Quản lý tỷ lệ sở hữu (Ownerships)
- ✅ E-contracts (hợp đồng điện tử)
- ✅ Group funds (quỹ nhóm)
- ✅ Proposals & Voting
- ✅ Auto-close voting khi hết thời gian hoặc tất cả đã vote
- ✅ Auto-create CostShare từ approved proposals

### Booking Management
- ✅ Đặt lịch sử dụng xe
- ✅ Check-in/Check-out với QR code
- ✅ Booking history
- ✅ Schedule view

### Payment & Cost Sharing
- ✅ Cost sharing theo tỷ lệ sở hữu
- ✅ Ví điện tử cho từng nhóm
- ✅ VNPay integration
- ✅ Payment history
- ✅ Auto-update CostShare status khi tất cả đã thanh toán

### Reporting & Analytics
- ✅ Usage analytics
- ✅ Cost reports
- ✅ RabbitMQ event integration
- ✅ Auto-create CostRecord từ CostShare events

## 🚧 Tính năng đang phát triển

- 🚧 AI Service: Gợi ý lịch công bằng
- 🚧 AI Service: Tối ưu chia chi phí
- 🚧 AI Service: Gợi ý quyết định nhóm

## 📝 License

This project is licensed under the MIT License.

## 👥 Contributors

- Vo Tran Ngoc Anh
- Nguyen Viet Dat
- Dang Ngoc Anh Duc
- Hoang Huu Nghia
- Nguyen Dang Thinh
- Ngo Hoang Thuc

## 📞 Contact

For questions or support, please contact the development team.
