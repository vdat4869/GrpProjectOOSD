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
├── auth-service/           # 1a - Đăng ký, xác thực, phân quyền
├── ownership-service/      # 1a + 1e + 2 - Xe, nhóm đồng sở hữu, hợp đồng, bỏ phiếu, quỹ nhóm
├── booking-service/        # 1b + 1d - Đặt lịch, Check-in/out, lịch sử sử dụng
├── payment-service/        # 1c - Thanh toán, chia chi phí
├── report-service/         # 1d + 1e - Thống kê, phân tích cá nhân & nhóm
├── ai-service/             # hỗ trợ 1b–1e - AI gợi ý lịch công bằng, tối ưu chi phí, đề xuất quyết định nhóm
├── rabbitmq/               # Message Queue trung gian giữa các service
├── nifi/                   # Apache NiFi xử lý ETL, log, dữ liệu lớn
└── frontend/               # ReactJS + Tailwind (giao diện người dùng)
```

## Service Mapping

| Service | Chức năng chính | Actor liên quan | Mapping theo 1a–1e, 2 |
|---------|----------------|-----------------|----------------------|
| **Auth Service** | - Đăng ký & đăng nhập tài khoản Co-owner, Staff, Admin<br>- Xác thực CMND/CCCD, giấy phép lái xe<br>- Phân quyền theo vai trò (Co-owner / Staff / Admin)<br>- Đổi mật khẩu, quản lý session<br>- Xác thực JWT cho các request qua Gateway | Co-owner, Staff, Admin | 1a |
| **Ownership Service** | - Quản lý thông tin xe và tỉ lệ sở hữu (A 40%, B 30%, ...)<br>- Quản lý hợp đồng đồng sở hữu (ký điện tử, lưu hồ sơ pháp lý)<br>- Quản lý nhóm đồng sở hữu: thêm/xóa thành viên, phân quyền nhóm<br>- Quản lý quỹ nhóm (đóng góp, chi tiêu, minh bạch số dư)<br>- Quản lý quyết định & bỏ phiếu nhóm (nâng cấp pin, sửa chữa, bán xe)<br>- Quản lý hợp đồng pháp lý điện tử (Staff/Admin duyệt, lưu hồ sơ) | Co-owner, Staff, Admin | 1a + 1e + 2 |
| **Booking Service** | - Lịch hiển thị xe đang trống / đang dùng<br>- Đặt lịch sử dụng xe, ghi chú<br>- Check-in / Check-out bằng QR code, ký số khi nhận xe<br>- Hệ thống ưu tiên công bằng theo tỉ lệ sở hữu & lịch sử dùng xe (phối hợp AI Service)<br>- Lưu lịch sử sử dụng: thời gian, quãng đường, chi phí phát sinh<br>- Báo cáo trạng thái lịch: Pending / Confirmed / Completed / Cancelled / NoShow | Co-owner, Staff, Admin | 1b + 1d + 2 |
| **Payment Service** | - Tự động chia chi phí theo tỉ lệ sở hữu hoặc thời gian sử dụng<br>- Ghi nhận chi phí: điện, bảo dưỡng, bảo hiểm, đăng kiểm, vệ sinh, phí nhóm<br>- Thanh toán trực tuyến (VNPay, MoMo, eWallet, Banking)<br>- Quản lý lịch sử giao dịch, biên lai điện tử<br>- Tổng hợp chi phí theo tháng/quý, đồng bộ cho Report Service | Co-owner, Admin | 1c + 2 |
| **Report Service** | - Tổng hợp dữ liệu cá nhân: thời gian sử dụng, chi phí, quãng đường<br>- Phân tích và so sánh với tỉ lệ sở hữu<br>- Tổng hợp báo cáo nhóm: quỹ chung, mức sử dụng của từng thành viên<br>- Sinh biểu đồ tài chính, thống kê sử dụng xe, tần suất đặt lịch<br>- Xuất báo cáo tổng hợp (cho Admin/Staff) | Co-owner, Staff, Admin | 1d + 1e + 2 |
| **AI Service** | - Phân tích dữ liệu sử dụng xe & tỉ lệ sở hữu để đề xuất lịch công bằng<br>- Gợi ý chia chi phí hợp lý giữa các đồng sở hữu<br>- Gợi ý quyết định nhóm (ví dụ: nâng cấp pin, thay ắc quy, bảo hiểm)<br>- Phát hiện bất công bằng trong việc đặt lịch (recommendation feedback)<br>- Cung cấp API /api/ai/suggestions cho Booking & Ownership Service | Co-owner, Admin | Hỗ trợ 1b–1e |

🧰 Ngăn xếp công nghệ

### ⚙️ Backend

- **Ngôn ngữ**: C# (.NET 8 / ASP.NET Core Web API)
- **Cơ sở dữ liệu**:
  - SQL Server → dữ liệu nghiệp vụ chính
  - Redis → cache session & token
  - MongoDB → log & lịch sử sử dụng
- **Giao tiếp**: REST API, RabbitMQ (event bus), SignalR (real-time)
- **Gateway**: YARP / Ocelot API Gateway (Reverse Proxy)
- **Data Integration**: Apache NiFi (ETL, data flow, aggregation)
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

🧱 Cấu trúc cơ sở dữ liệu

Mỗi service có database riêng biệt (SQL Server / MongoDB) để đảm bảo tính độc lập và bảo mật dữ liệu.

| Service | Database | Mục đích |
|---------|----------|----------|
| Auth Service | auth_db | Người dùng, role, phân quyền |
| Ownership Service | ownership_db | Xe, nhóm, hợp đồng, bỏ phiếu, quỹ nhóm |
| Booking Service | booking_db | Lịch sử đặt xe, check-in/out |
| Payment Service | payment_db | Hóa đơn, giao dịch, chia phí |
| Report Service | report_db | Dữ liệu tổng hợp & thống kê |
| AI Service | ai_db (MongoDB) | Dữ liệu huấn luyện & đề xuất |
| Redis | redis_cache | Cache session & token |
| MongoDB | mongo_logs | Log hệ thống |
| RabbitMQ | - | Message Broker giữa các service |

🔄 Giao tiếp giữa các Service

- **Gateway → Auth / Ownership / Booking / Payment / Report / AI**
  - Xử lý request, routing, xác thực JWT.

- **RabbitMQ**
  - Event Bus trung gian, giúp service publish/subscribe sự kiện:
    - Booking gửi event cho Payment khi hoàn tất chuyến xe
    - Ownership gửi event khi cập nhật nhóm / hợp đồng

- **Apache NiFi**
  - Kéo dữ liệu log, thống kê từ MongoDB / SQL → Report Service
  - (hỗ trợ luồng ETL tự động và chuẩn hóa dữ liệu báo cáo)

👥 Phân quyền Actor

| Actor | Vai trò | Quyền hạn |
|-------|---------|-----------|
| **Co-owner** | Người đồng sở hữu xe điện | Đặt lịch, thanh toán, theo dõi lịch sử, tham gia nhóm & bỏ phiếu |
| **Staff** | Nhân viên vận hành | Quản lý check-in/out, kiểm định xe, theo dõi tranh chấp |
| **Admin** | Quản trị viên hệ thống | Duyệt hợp đồng, xử lý tranh chấp, xem báo cáo, quản lý người dùng |

⚡ Triển khai (Deployment)

Sử dụng Docker Compose: mỗi service là 1 container độc lập.

RabbitMQ và NiFi chạy dưới dạng service riêng.

### Khởi chạy hệ thống

```bash
# Clone repository
git clone <repository-url>
cd GrpProjectOOSD

# Khởi chạy tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Dừng hệ thống
docker-compose down
```

### Ports

- **Gateway**: 8000
- **Auth Service**: 5000
- **Ownership Service**: 5001
- **Booking Service**: 5002
- **Payment Service**: 5003
- **Report Service**: 5004
- **AI Service**: 8000
- **Frontend**: 80
- **RabbitMQ Management**: 15672
- **NiFi**: 8080
- **MongoDB**: 27017
- **Redis**: 6379
- **SQL Server**: 1433

### Environment Variables

Tạo file `.env` hoặc cập nhật các biến môi trường trong `docker-compose.yml`:

```env
SA_PASSWORD=YourStrong@Password123
JWT_SECRET=YourSuperSecretKeyForJWTTokenGeneration2024
RABBITMQ_USER=rabbitmq
RABBITMQ_PASS=rabbitmq123
MONGO_USER=mongoadmin
MONGO_PASSWORD=mongopass123
```

📊 Luồng dữ liệu (Data Flow)

1. Co-owner gửi request → Gateway → định tuyến đến service tương ứng.
2. Booking Service lưu lịch & publish event lên RabbitMQ.
3. Payment Service nhận event, tính chi phí, cập nhật lịch sử thanh toán.
4. Ownership Service cập nhật thông tin nhóm, hợp đồng.
5. Report Service lấy dữ liệu tổng hợp qua NiFi để xuất biểu đồ.
6. AI Service phân tích & gợi ý lịch/chi phí tối ưu → trả về Gateway.

💡 Điểm nổi bật

- Kiến trúc microservice hoàn chỉnh, mở rộng linh hoạt.
- API Gateway + RabbitMQ + NiFi tạo thành hệ thống giao tiếp, đồng bộ dữ liệu mạnh mẽ.
- Phân quyền Co-owner / Staff / Admin rõ ràng.
- Tích hợp AI gợi ý fairness giúp tối ưu việc sử dụng xe & chi phí.
- Báo cáo minh bạch, có thể mở rộng ra mobile app hoặc web admin dashboard.

🔧 Development

### Prerequisites

- .NET 8 SDK
- Docker Desktop
- Node.js 18+ (for frontend)
- Python 3.11+ (for AI service)

### Local Development

```bash
# 1. Clone và setup
git clone <repository-url>
cd GrpProjectOOSD

# 2. Tạo file .env (xem SETUP.md để biết các biến cần thiết)
# 3. Restore dependencies
dotnet restore GrpProjectOOSD.sln
cd frontend && npm install --legacy-peer-deps && cd ..

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
pip install -r requirements.txt
python main.py
```

**Lưu ý**: Xem file `SETUP.md` để biết chi tiết về setup và troubleshooting.

### Testing

```bash
# Run tests
dotnet test

# Integration tests
docker-compose up -d
# Run integration tests
```

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
