# 📊 TỔNG QUAN DỰ ÁN EV CO-OWNERSHIP SYSTEM

**Ngày cập nhật:** 2024-12-XX  
**Phiên bản:** 1.0.0

---

## 🎯 TỔNG QUAN

**EV Co-ownership & Cost-sharing System** là hệ thống quản lý đồng sở hữu và chia sẻ chi phí xe điện, được xây dựng theo kiến trúc **Microservices** với các tính năng:

- ✅ Quản lý tỷ lệ sở hữu và hợp đồng đồng sở hữu (e-contract)
- ✅ Đặt lịch sử dụng xe công bằng với hệ thống ưu tiên theo tỷ lệ sở hữu
- ✅ Tự động chia chi phí bảo dưỡng, bảo hiểm, sạc điện, vệ sinh, đăng kiểm
- ✅ Theo dõi lịch sử sử dụng, thanh toán, bỏ phiếu nhóm
- ✅ AI gợi ý sử dụng công bằng và tối ưu chi phí
- ✅ Báo cáo chi tiết cho Co-owner, Staff và Admin

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Microservices Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Port 8000)                  │
│              YARP Reverse Proxy + JWT Auth                  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
│ Auth Service   │  │ Ownership      │  │ Booking         │
│ (Port 5000)    │  │ Service        │  │ Service         │
│                │  │ (Port 5001)    │  │ (Port 5002)     │
└────────────────┘  └────────────────┘  └────────────────┘
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
│ Payment        │  │ Report         │  │ AI Service     │
│ Service        │  │ Service        │  │ (Port 8010)    │
│ (Port 5003)    │  │ (Port 5004)    │  │ Python FastAPI │
└────────────────┘  └────────────────┘  └────────────────┘
```

### Infrastructure Services

- **SQL Server** (Port 1433) - Database chính cho tất cả services
- **Redis** (Port 6379) - Cache session & token
- **MongoDB** (Port 27017) - Log & lịch sử sử dụng
- **RabbitMQ** (Port 5672, Management 15672) - Message Broker
- **Apache NiFi** (Port 8080) - ETL & Data Flow
- **Frontend** (Port 80) - ReactJS + Vite + TailwindCSS

---

## 📦 CÁC SERVICES

### 1. **Auth Service** ✅ HOÀN CHỈNH
**Port:** 5000  
**Database:** `auth_db` (SQL Server)

**Chức năng:**
- ✅ Đăng ký & đăng nhập (JWT authentication)
- ✅ Quản lý user profile (get, update)
- ✅ Đổi mật khẩu
- ✅ Refresh token
- ✅ KYC verification (Submit identity, Upload license, Status check)
- ✅ Role management (Co-owner, Staff, Admin)

**Controllers:**
- `AuthController.cs` - Login, Register, Profile, Change Password
- `KycController.cs` - KYC operations
- `RoleController.cs` - Role management

**Frontend Integration:**
- ✅ `SignInForm.tsx` - Login với API
- ✅ `SignUpForm.tsx` - Register với validation
- ✅ `UserProfiles.tsx` - Profile management
- ✅ `ChangePasswordModal.tsx` - Change password
- ✅ `KycPage.tsx` - KYC flow hoàn chỉnh

---

### 2. **Ownership Service** ✅ HOÀN CHỈNH
**Port:** 5001  
**Database:** `ownership_db` (SQL Server)

**Chức năng:**
- ✅ Quản lý Vehicle Groups (CRUD)
- ✅ Quản lý Co-owners
- ✅ Quản lý Ownerships (tỷ lệ sở hữu)
- ✅ Quản lý E-Contracts (hợp đồng điện tử)
- ✅ Quản lý Proposals & Voting
- ✅ Quản lý Group Funds (quỹ nhóm)

**Controllers:**
- `VehicleGroupsController.cs` - Vehicle groups management
- `CoOwnersController.cs` - Co-owners management
- `VotingController.cs` - Proposals & voting
- `OwnershipsController.cs` - Ownership management
- `EContractsController.cs` - E-contracts management
- `GroupFundsController.cs` - Group funds management

**Frontend Integration:**
- ✅ `OwnershipDetails.tsx` - Hiển thị groups
- ✅ `GroupVoting.tsx` - Proposals & voting hoàn chỉnh
- ✅ `ManageGroups.tsx` (Admin) - Quản lý groups
- ✅ `CreateProposalModal.tsx` - Tạo proposal với AI suggestions
- ✅ `VoteModal.tsx` - Vote trên proposal
- ✅ `ProposalDetailModal.tsx` - Chi tiết proposal với votes

---

### 3. **Booking Service** ✅ HOÀN CHỈNH
**Port:** 5002  
**Database:** `booking_db` (SQL Server), MongoDB (logs)

**Chức năng:**
- ✅ Lịch hiển thị xe đang trống / đang dùng
- ✅ Đặt lịch sử dụng xe (CRUD)
- ✅ Check-in / Check-out với QR code & digital signature
- ✅ Hệ thống ưu tiên công bằng theo tỉ lệ sở hữu
- ✅ Lưu lịch sử sử dụng (thời gian, quãng đường, chi phí)
- ✅ Trạng thái: Pending / Confirmed / Completed / Cancelled / NoShow
- ✅ QR code generation
- ✅ Integration với AI Service cho fairness suggestions

**Controllers:**
- `BookingController.cs` - Booking CRUD, Check-in/out, QR code

**Frontend Integration:**
- ✅ `MyBookings.tsx` - Quản lý bookings với full CRUD
- ✅ `CreateBookingModal.tsx` - Tạo booking với AI suggestions
- ✅ `UpdateBookingModal.tsx` - Cập nhật booking
- ✅ `CheckInModal.tsx` - Check-in với QR code
- ✅ `CheckOutModal.tsx` - Check-out với distance/cost
- ✅ `getVehicles()` - Lấy danh sách vehicles từ booking-service

**Lưu ý quan trọng:**
- ⚠️ **VehicleGroup (GUID)** từ ownership-service ≠ **Vehicle (int)** từ booking-service
- ✅ Frontend đã được sửa để dùng `Vehicle` từ booking-service khi tạo booking
- ✅ Endpoint mới: `GET /api/booking/vehicles` để lấy danh sách vehicles

---

### 4. **Payment Service** ✅ HOÀN CHỈNH
**Port:** 5003  
**Database:** `payment_db` (SQL Server)

**Chức năng:**
- ✅ Tự động chia chi phí theo tỉ lệ sở hữu hoặc thời gian sử dụng
- ✅ Ghi nhận chi phí: điện, bảo dưỡng, bảo hiểm, đăng kiểm, vệ sinh, phí nhóm
- ✅ Thanh toán trực tuyến (VNPay integration)
- ✅ Quản lý lịch sử giao dịch
- ✅ Cost Shares management (CRUD)
- ✅ Cost sharing suggestions (tự động phân chia)
- ✅ Payment cancellation & refund

**Controllers:**
- `PaymentsController.cs` - Payment operations
- `CostSharesController.cs` - Cost shares management
- `TransactionsController.cs` - Transaction management

**VNPay Service:**
- `vnpay-service/` - VNPay payment gateway integration

**Frontend Integration:**
- ✅ `PaymentHistory.tsx` - Payment history với actions (view, cancel, refund)
- ✅ `CostShares.tsx` - Quản lý cost shares với full CRUD
- ✅ `CreatePaymentModal.tsx` - Tạo payment với VNPay
- ✅ `CreateCostShareModal.tsx` - Tạo cost share với suggestions
- ✅ `PaymentDetailModal.tsx` - Chi tiết payment với actions

---

### 5. **Report Service** ✅ HOÀN CHỈNH
**Port:** 5004  
**Database:** `report_db` (SQL Server), MongoDB (logs)

**Chức năng:**
- ✅ Tổng hợp dữ liệu cá nhân: thời gian sử dụng, chi phí, quãng đường
- ✅ Phân tích và so sánh với tỉ lệ sở hữu
- ✅ Tổng hợp báo cáo nhóm: quỹ chung, mức sử dụng
- ✅ Sinh biểu đồ tài chính, thống kê sử dụng xe
- ✅ Xuất báo cáo (Usage, Cost, Maintenance)
- ✅ Usage history & Charging sessions
- ✅ Maintenance records

**Controllers:**
- `AnalyticsController.cs` - Analytics & statistics
- `HistoryController.cs` - Usage history, charging, maintenance
- `ReportsController.cs` - Report generation

**Frontend Integration:**
- ✅ `UsageAnalytics.tsx` - Usage & cost statistics với charts
- ✅ `Reports.tsx` (Admin) - Generate & export reports
- ✅ Date range picker & CSV export
- ✅ Integration với AI Service cho fairness check

---

### 6. **AI Service** ✅ HOÀN CHỈNH
**Port:** 8010  
**Technology:** Python FastAPI  
**Database:** MongoDB

**Chức năng:**
- ✅ Booking fairness suggestions với alternative slots
- ✅ Cost sharing suggestions (tự động phân chia công bằng)
- ✅ Voting suggestions với risk assessment
- ✅ Usage fairness check với score & recommendations

**Endpoints:**
- `POST /api/ai/suggestions/booking` - Booking suggestions
- `POST /api/ai/suggestions/cost-sharing` - Cost sharing suggestions
- `POST /api/ai/suggestions/voting` - Voting suggestions
- `GET /api/ai/suggestions/fairness-check` - Fairness check

**Frontend Integration:**
- ✅ `aiService.ts` - Service hoàn chỉnh
- ✅ `CreateBookingModal.tsx` - AI booking suggestions
- ✅ `CreateCostShareModal.tsx` - AI cost sharing suggestions
- ✅ `CreateProposalModal.tsx` - AI voting suggestions
- ✅ `UsageAnalytics.tsx` - Fairness check

---

### 7. **Gateway Service** ✅ HOÀN CHỈNH
**Port:** 8000  
**Technology:** .NET 8 YARP Reverse Proxy

**Chức năng:**
- ✅ Routing requests đến các backend services
- ✅ JWT authentication & authorization
- ✅ CORS handling
- ✅ Request/Response logging

**Route Mappings:**
```csharp
/api/auth → auth-service
/api/kyc → auth-service
/api/booking → booking-service
/api/payment → payment-service
/api/ownership → ownership-service
/api/voting → ownership-service
/api/analytics → report-service
/api/history → report-service
/api/ai → ai-service
```

---

## 💻 FRONTEND

### Technology Stack
- **Framework:** ReactJS 18+ với TypeScript
- **Build Tool:** Vite
- **Styling:** TailwindCSS
- **Charts:** Recharts
- **State Management:** React Hooks + Context API

### Cấu trúc Frontend

```
frontend/src/
├── components/
│   ├── auth/              # SignIn, SignUp forms
│   ├── kyc/               # KYC components
│   ├── modals/            # All modals (Booking, Payment, Proposal, etc.)
│   ├── Layouts/            # AdminLayout, CoownerLayout, StaffLayout
│   ├── Sidebar/            # Role-based sidebars
│   └── UserProfile/       # User profile components
├── pages/
│   ├── admin/             # Admin pages
│   ├── coowner/           # Co-owner pages
│   ├── staff/             # Staff pages
│   ├── AuthPages/          # SignIn, SignUp pages
│   └── KYC/                # KYC page
├── services/              # API services
│   ├── authService.ts
│   ├── bookingService.ts
│   ├── ownershipService.ts
│   ├── paymentService.ts
│   ├── reportService.ts
│   ├── aiService.ts
│   └── kycService.ts
├── routes/                 # Route definitions
│   ├── AdminRoutes.tsx
│   ├── CoownerRoutes.tsx
│   ├── StaffRoutes.tsx
│   └── ProtectedRoute.tsx
└── config/
    └── api.ts              # API endpoints configuration
```

### Role-based Pages

#### Co-owner Pages ✅ HOÀN CHỈNH
- ✅ Dashboard
- ✅ My Bookings (CRUD, Check-in/out)
- ✅ Payment History
- ✅ Cost Shares
- ✅ Ownership Details
- ✅ Group Voting
- ✅ Usage Analytics
- ✅ User Profile
- ✅ KYC

#### Admin Pages ✅ HOÀN CHỈNH
- ✅ Dashboard
- ✅ Manage Groups
- ✅ Manage Contracts
- ✅ Manage Staff
- ✅ Dispute Management
- ✅ Reports
- ✅ User Profile
- ✅ KYC

#### Staff Pages ⚠️ MỘT PHẦN
- ✅ Dashboard
- ⚠️ Check In/Out
- ⚠️ Vehicle Maintenance
- ⚠️ Monitor Bookings
- ⚠️ Dispute Tracking
- ✅ User Profile
- ✅ KYC

---

## 🔄 TÍCH HỢP FRONTEND - BACKEND

### ✅ Đã tích hợp hoàn chỉnh (100%)

1. **Authentication Service** - ✅ 100%
2. **Booking Service** - ✅ 100%
3. **Ownership Service** - ✅ 100%
4. **Payment Service** - ✅ 100%
5. **Report Service** - ✅ 100%
6. **AI Service** - ✅ 100%

### ⚠️ Đã tích hợp một phần

1. **Staff Pages** - Có UI nhưng một số chức năng chưa rõ backend integration

---

## 🗄️ DATABASE SCHEMA

### SQL Server Databases

| Database | Service | Tables |
|----------|---------|--------|
| `auth_db` | Auth Service | Users, Roles, KYC Records |
| `ownership_db` | Ownership Service | VehicleGroups, CoOwners, Ownerships, EContracts, Proposals, Votes, GroupFunds |
| `booking_db` | Booking Service | Bookings, Vehicles, CoOwners |
| `payment_db` | Payment Service | Payments, CostShares, Transactions |
| `report_db` | Report Service | UsageHistory, ChargingSessions, MaintenanceRecords |

### MongoDB Collections

- `booking_logs` - Booking service logs
- `report_logs` - Report service logs
- `ai_db` - AI service data & training

---

## 🚀 DEPLOYMENT

### Docker Compose

Tất cả services được containerized và chạy qua Docker Compose:

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f [service-name]

# Stop all services
docker compose down
```

### Ports

| Service | Port | URL |
|---------|------|-----|
| Gateway | 8000 | http://localhost:8000 |
| Auth Service | 5000 | http://localhost:5000 |
| Ownership Service | 5001 | http://localhost:5001 |
| Booking Service | 5002 | http://localhost:5002 |
| Payment Service | 5003 | http://localhost:5003 |
| Report Service | 5004 | http://localhost:5004 |
| AI Service | 8010 | http://localhost:8010 |
| Frontend | 80 | http://localhost |
| RabbitMQ Management | 15672 | http://localhost:15672 |
| NiFi | 8080 | http://localhost:8080 |

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### JWT Authentication
- Token được tạo bởi Auth Service
- Gateway validate token trước khi forward request
- Token lưu trong localStorage (frontend) và Redis (backend)

### Roles
- **Co-owner** - Người đồng sở hữu xe
- **Staff** - Nhân viên vận hành
- **Admin** - Quản trị viên hệ thống

### Protected Routes
- Frontend sử dụng `ProtectedRoute` component
- Backend sử dụng `[Authorize]` attribute với role requirements

---

## 📝 API ENDPOINTS

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/logout` - Logout
- `GET /api/auth/profile` - Get profile
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/refresh-token` - Refresh token

### Booking
- `GET /api/booking/allBooking` - Get all bookings
- `GET /api/booking/schedules` - Get schedules
- `GET /api/booking/vehicles` - Get vehicles (NEW)
- `POST /api/booking/createBooking` - Create booking
- `PUT /api/booking/edit/{id}` - Update booking
- `DELETE /api/booking/editStatus{id}` - Cancel booking
- `GET /api/booking/{id}/qr-code` - Get QR code
- `POST /api/booking/{id}/check-in` - Check in
- `POST /api/booking/{id}/check-out` - Check out

### Ownership
- `GET /api/ownership/vehiclegroups` - Get vehicle groups
- `GET /api/ownership/coowners` - Get co-owners (Admin/Staff only)
- `GET /api/voting/vehicle-group/{groupId}` - Get proposals
- `POST /api/voting/vehicle-group/{groupId}` - Create proposal
- `POST /api/voting/proposals/{id}/vote` - Vote on proposal
- `GET /api/ownership/ownerships/vehicle-group/{id}` - Get ownerships

### Payment
- `GET /api/payment/payments/user/{userId}` - Get payments
- `POST /api/payment/payments` - Create payment
- `POST /api/payment/payments/{id}/cancel` - Cancel payment
- `POST /api/payment/payments/{id}/refund` - Refund payment
- `GET /api/payment/costshares` - Get cost shares
- `POST /api/payment/costshares` - Create cost share
- `POST /api/vnpay/create-payment` - Create VNPay payment

### Report
- `GET /api/analytics/usage-statistics/{vehicleId}` - Usage statistics
- `GET /api/analytics/cost-statistics/{vehicleId}` - Cost statistics
- `POST /api/analytics/reports/usage/{vehicleId}` - Generate usage report
- `GET /api/history/usage/vehicle/{vehicleId}` - Usage history

### AI
- `POST /api/ai/suggestions/booking` - Booking suggestions
- `POST /api/ai/suggestions/cost-sharing` - Cost sharing suggestions
- `POST /api/ai/suggestions/voting` - Voting suggestions
- `GET /api/ai/suggestions/fairness-check` - Fairness check

---

## 🐛 CÁC VẤN ĐỀ ĐÃ SỬA

### 1. API Endpoints Fix ✅
- ✅ Sửa Proposals endpoints (từ `/api/ownership/proposals` → `/api/voting/vehicle-group/{groupId}`)
- ✅ Sửa Payments endpoints (từ `/api/payment/payments` → `/api/payment/payments/user/{userId}`)
- ✅ Frontend API_BASE_URL (từ port 5000 → 8000 Gateway)

### 2. Booking Service Fix ✅
- ✅ Thêm endpoint `GET /api/booking/vehicles` để lấy vehicles từ booking-service
- ✅ Sửa CreateBookingModal để dùng Vehicle (int) thay vì VehicleGroup (GUID)
- ✅ Thêm error handling và logging trong BookingController

### 3. Authentication Fix ✅
- ✅ Tích hợp đầy đủ KYC flow
- ✅ User Profile management
- ✅ Change Password functionality

---

## 📊 TỔNG KẾT TÍCH HỢP

| Service | Frontend Integration | Backend Status | Overall |
|---------|---------------------|----------------|---------|
| Auth Service | ✅ 100% | ✅ Complete | ✅ **100%** |
| Booking Service | ✅ 100% | ✅ Complete | ✅ **100%** |
| Ownership Service | ✅ 100% | ✅ Complete | ✅ **100%** |
| Payment Service | ✅ 100% | ✅ Complete | ✅ **100%** |
| Report Service | ✅ 100% | ✅ Complete | ✅ **100%** |
| AI Service | ✅ 100% | ✅ Complete | ✅ **100%** |
| Staff Pages | ⚠️ 60% | ✅ Complete | ⚠️ **60%** |

**Tổng thể:** ✅ **95% HOÀN CHỈNH**

---

## 🔮 ROADMAP

### Ưu tiên cao
- ⚠️ Hoàn thiện Staff pages integration
- ⚠️ Thêm unit tests cho backend services
- ⚠️ Thêm integration tests

### Ưu tiên trung bình
- ⚠️ Thêm real-time notifications (SignalR)
- ⚠️ Thêm mobile app (React Native)
- ⚠️ Performance optimization

### Ưu tiên thấp
- ⚠️ Thêm internationalization (i18n)
- ⚠️ Thêm dark mode improvements
- ⚠️ Thêm advanced analytics

---

## 📞 LIÊN HỆ & HỖ TRỢ

- **Developer:** Nguyen Viet Dat
- **Team:** OOSD Group Project
- **Repository:** GrpProjectOOSD

---

**Lưu ý:** Tài liệu này được cập nhật thường xuyên. Vui lòng kiểm tra phiên bản mới nhất.

