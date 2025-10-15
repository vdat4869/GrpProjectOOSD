# Dự án: EV Co-ownership & Cost-sharing System
Phần mềm quản lý đồng sở hữu và chia sẻ chi phí xe điện.

---

## Mô tả tổng quan:
Hệ thống giúp nhiều người đồng sở hữu một chiếc xe điện có thể:
- Quản lý tỷ lệ sở hữu.
- Đặt lịch sử dụng xe công bằng.
- Tự động chia chi phí vận hành, bảo dưỡng, bảo hiểm, sạc điện...
- Theo dõi lịch sử sử dụng, thanh toán, và ra quyết định nhóm minh bạch.

Hệ thống triển khai theo **mô hình Microservices**, có khả năng mở rộng và chạy trong **Docker**.

---

## Actors chính:
1. **Co-owner (Chủ xe)**  
2. **Staff (Nhân viên vận hành)**  
3. **Admin (Quản trị hệ thống)**

---

## Kiến trúc hệ thống:
### Tổng thể:
- Triển khai theo **Microservice Architecture**.
- Mỗi service có database riêng.
- Dùng **API Gateway** để định tuyến request.
- Giao tiếp giữa các service qua **REST API** hoặc **Message Queue (RabbitMQ hoặc Azure Service Bus)**.
- Triển khai bằng **Docker Compose** (mỗi service là 1 container).
- Tích hợp CI/CD (chuẩn bị sẵn file Dockerfile + docker-compose.yml).

---

## Ngăn xếp công nghệ:

### Backend:
- Ngôn ngữ: **C# (.NET 8 / ASP.NET Core Web API)**
- Database:
  - SQL Server (cho core services)
- Authentication:
  - **JWT Bearer Token**
  - Role-based Authorization (Co-owner / Staff / Admin)
- Frameworks:
  - **Entity Framework Core**
  - **MediatR** (CQRS pattern)
  - **AutoMapper**
  - **FluentValidation**
  - **SignalR** (real-time cho check-in/check-out, AI suggestion, voting result)

### Frontend:
- Framework: **ReactJS + TailwindCSS + Vite**
- Ngôn ngữ: **TypeScript**
- Giao tiếp với API Gateway bằng HTTPS.
- Hiển thị Dashboard, lịch sử xe, chi phí, biểu đồ (Recharts).

### AI Module (microservice riêng):
- Ngôn ngữ: **Python (FastAPI)**
- Chức năng:
  - Phân tích dữ liệu sử dụng xe để gợi ý lịch đặt xe công bằng.
  - Gợi ý chi phí chia hợp lý dựa trên lịch sử sử dụng.
  - Cung cấp endpoint `/api/ai/suggestions`.

---

## Các microservice đề xuất:
ev-coownership-system/
├── gateway-service/ # API Gateway (Reverse Proxy)
├── auth-service/ # Đăng ký, đăng nhập, xác thực người dùng
├── ownership-service/ # Quản lý đồng sở hữu, hợp đồng, quyền sở hữu
├── booking-service/ # Quản lý đặt lịch, check-in/out xe
├── payment-service/ # Quản lý chia chi phí, thanh toán, ví điện tử
├── group-service/ # Nhóm đồng sở hữu, bỏ phiếu, quỹ chung
├── report-service/ # Xuất báo cáo và lịch sử tài chính
├── frontend/ # ReactJS Web App
└── docker-compose.yml

 
---

## Chức năng chi tiết

### 1. Co-owner
#### a. Quản lý tài khoản & quyền sở hữu
- Đăng ký, đăng nhập, xác thực CMND/CCCD, bằng lái xe.
- Quản lý tỉ lệ sở hữu: ví dụ A 40%, B 30%, C 30%.
- Hợp đồng đồng sở hữu (ký điện tử, e-contract).

#### b. Đặt lịch & sử dụng xe
- Lịch hiển thị thời gian xe trống/đang dùng.
- Đặt lịch trước để đảm bảo quyền sử dụng.
- Hệ thống ưu tiên công bằng dựa trên tỉ lệ sở hữu & lịch sử dùng xe.

#### c. Chi phí & thanh toán
- Tự động chia chi phí theo tỉ lệ sở hữu hoặc theo thời gian sử dụng.
- Hỗ trợ các khoản: phí sạc điện, bảo hiểm, đăng kiểm, vệ sinh, bảo dưỡng.
- Thanh toán trực tuyến (VNPay, MoMo, Banking, eWallet API).
- Tổng kết chi phí theo tháng/quý.

#### d. Lịch sử & phân tích cá nhân
- Lịch sử sử dụng: thời gian, quãng đường, chi phí phát sinh.
- So sánh mức sử dụng với tỉ lệ sở hữu.


#### e. Nhóm đồng sở hữu
- Quản lý nhóm: thêm, xoá thành viên, phân quyền.
- Bỏ phiếu các quyết định chung (mua thêm pin, sửa chữa...).
- Quỹ chung: hiển thị minh bạch số dư, lịch sử chi.
- AI hỗ trợ đề xuất phương án công bằng.

---

### 2. Staff & Admin
- Quản lý các nhóm xe đồng sở hữu.
- Quản lý hợp đồng pháp lý điện tử.
- Quản lý Check-in/Check-out (QR code + ký số).
- Quản lý bảo dưỡng, kiểm định, bảo hiểm.
- Theo dõi tranh chấp và lịch sử can thiệp.
- Xuất báo cáo tài chính minh bạch theo nhóm xe.

