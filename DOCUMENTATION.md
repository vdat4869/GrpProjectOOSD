# 📚 Tài Liệu Dự Án EV Co-ownership

## 📋 Mục Lục

1. [API Endpoints Fix](#api-endpoints-fix)
2. [Quick API Test](#quick-api-test)
3. [Fix 404 Error](#fix-404-error)
4. [Debug 500 Error](#debug-500-error)
5. [Test Frontend Features](#test-frontend-features)
6. [Test Booking Features](#test-booking-features)

---

## 🔧 API Endpoints Fix

### ✅ Đã Sửa

#### 1. Proposals Endpoints

**Trước (SAI):**
- `/api/ownership/proposals` - Không tồn tại

**Sau (ĐÚNG):**
- `/api/voting/vehicle-group/{groupId}` - Get proposals của một vehicle group
- `/api/voting/proposals/{id}` - Get proposal by ID
- `/api/voting/proposals/{id}/vote` - Vote on proposal
- `/api/voting/proposals/{id}/start-voting` - Start voting

**Files đã sửa:**
- `frontend/src/config/api.ts` - Cập nhật endpoints
- `frontend/src/services/ownershipService.ts` - Sửa `getProposals()` để yêu cầu groupId

#### 2. Payments Endpoints

**Trước (SAI):**
- `/api/payment/payments` - GET all payments (không tồn tại)

**Sau (ĐÚNG):**
- `/api/payment/payments/user/{userId}` - Get payments của một user
- `/api/payment/payments/{id}` - Get payment by ID

**Files đã sửa:**
- `frontend/src/config/api.ts` - Cập nhật endpoints
- `frontend/src/services/paymentService.ts` - Sửa `getPayments()` để yêu cầu userId
- `frontend/src/pages/coowner/PaymentHistory.tsx` - Sửa để truyền userId bắt buộc

#### 3. CoOwners Endpoint

**Lưu ý:**
- `/api/ownership/coowners` - Cần role **Admin** hoặc **Staff**
- Co-owner role không đủ quyền → 403 Forbidden là đúng

### 📋 Endpoints Mapping

#### Ownership Service

| Frontend Endpoint | Gateway Route | Backend Route | Controller |
|------------------|---------------|---------------|------------|
| `/api/ownership/vehiclegroups` | `/api/ownership/vehiclegroups` | `/api/VehicleGroups` | VehicleGroupsController |
| `/api/voting/vehicle-group/{groupId}` | `/api/voting/vehicle-group/{groupId}` | `/api/Voting/vehicle-group/{groupId}` | VotingController |
| `/api/voting/proposals/{id}` | `/api/voting/proposals/{id}` | `/api/Voting/proposals/{id}` | VotingController |
| `/api/ownership/coowners` | `/api/ownership/coowners` | `/api/CoOwners` | CoOwnersController (Admin/Staff only) |

#### Payment Service

| Frontend Endpoint | Gateway Route | Backend Route | Controller |
|------------------|---------------|---------------|------------|
| `/api/payment/payments/user/{userId}` | `/api/payment/payments/user/{userId}` | `/api/Payments/user/{userId}` | PaymentsController |
| `/api/payment/payments/{id}` | `/api/payment/payments/{id}` | `/api/Payments/{id}` | PaymentsController |

### 📝 Notes

1. **Proposals** luôn cần `groupId` - không có endpoint để get all proposals
2. **Payments** luôn cần `userId` - không có endpoint để get all payments
3. **CoOwners** list chỉ dành cho Admin/Staff - Co-owner không thể xem danh sách tất cả co-owners

---

## 🚀 Quick API Test

### ✅ Test Thành Công

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/booking/allBooking" -Method Get
```
→ Trả về danh sách bookings (không cần auth)

### ❌ Test Thất Bại - 401 Unauthorized

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/api/ownership/vehiclegroups" -Method Get
```
→ Lỗi 401 vì endpoint này **cần JWT token**

### 🔧 Cách Test với Authentication

#### Option 1: Dùng Script Tự Động

```powershell
powershell -ExecutionPolicy Bypass -File test-all.ps1
```

#### Option 2: Test Manual

**Bước 1: Login để lấy token**

```powershell
$loginBody = @{
    email = "coowner@example.com"
    password = "Coowner@12345"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $loginResponse.data.accessToken
$userId = $loginResponse.data.user.id
```

**Bước 2: Setup Headers với Token**

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
```

**Bước 3: Test Endpoints Cần Auth**

```powershell
# Test Get Vehicle Groups
Invoke-RestMethod -Uri "http://localhost:8000/api/ownership/vehiclegroups" -Method Get -Headers $headers

# Test Get Payments
Invoke-RestMethod -Uri "http://localhost:8000/api/payment/payments/user/$userId" -Method Get -Headers $headers
```

### 📋 Danh Sách Endpoints

#### ✅ Không Cần Auth
- `GET /api/booking/allBooking` - Get all bookings
- `GET /api/booking/schedules` - Get schedules
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register

#### 🔒 Cần Auth (JWT Token)
- `GET /api/ownership/vehiclegroups` - Get vehicle groups
- `GET /api/ownership/coowners` - Get co-owners (Admin/Staff only)
- `GET /api/voting/vehicle-group/{groupId}` - Get proposals
- `POST /api/booking/createBooking` - Create booking
- `GET /api/payment/payments/user/{userId}` - Get payments

---

## 🔧 Fix 404 Error - API Not Found

### ❌ Vấn Đề

Frontend đang gọi API trực tiếp đến port 5000 (auth-service) thay vì qua Gateway (port 8000), gây ra lỗi 404:

```
GET http://localhost:5000/api/booking/allBooking 404 (Not Found)
GET http://localhost:5000/api/ownership/vehiclegroups 404 (Not Found)
```

### ✅ Giải Pháp

#### 1. Đã Sửa Code

File `frontend/src/config/api.ts` đã được cập nhật:
```typescript
// Trước (SAI):
export const API_BASE_URL = "http://localhost:5000";

// Sau (ĐÚNG):
export const API_BASE_URL = "http://localhost:8000";
```

#### 2. Nếu Chạy Frontend Local (npm run dev)

**Option A: Set Environment Variable**

**Windows (PowerShell):**
```powershell
$env:VITE_API_URL = "http://localhost:8000"
npm run dev
```

**Option B: Tạo file `.env`**

Tạo file `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

#### 3. Nếu Chạy với Docker

Gateway service đã được cấu hình đúng, không cần sửa gì.

### 🔍 Kiểm Tra

1. Mở DevTools (F12) > Network tab
2. Xem request URL phải là `http://localhost:8000/api/...`
3. Nếu vẫn thấy `http://localhost:5000`, rebuild frontend:
```powershell
cd frontend
npm run build
docker compose up -d --build frontend
```

---

## 🔍 Debug 500 Internal Server Error - Create Booking

### ❌ Vấn Đề

Khi tạo booking, gặp lỗi:
```
POST http://localhost:8000/api/booking/createBooking 500 (Internal Server Error)
```

### 🔧 Đã Sửa

#### 1. Thêm Error Handling vào Controller

Đã thêm try-catch và logger vào `BookingController.Create()`.

#### 2. Sửa Data Type trong Frontend

Frontend đã được sửa để xử lý đúng kiểu dữ liệu:
- `vehicleId` có thể là string (từ VehicleGroup.id)
- Convert sang number trước khi gửi API

### 🔍 Cách Debug

#### 1. Xem Logs của Booking Service

```powershell
# Xem real-time logs
docker compose logs -f booking-service

# Hoặc xem logs gần đây
docker compose logs --tail=100 booking-service
```

#### 2. Test API Trực Tiếp

```powershell
# Login để lấy token
$loginBody = @{email="coowner@example.com";password="Coowner@12345"} | ConvertTo-Json
$token = (Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json").data.accessToken

$headers = @{"Authorization"="Bearer $token";"Content-Type"="application/json"}

# Test create booking
$bookingBody = @{
    vehicleId = 1
    coOwnerId = 1
    startTime = (Get-Date).AddHours(1).ToString("yyyy-MM-ddTHH:mm:ss")
    endTime = (Get-Date).AddHours(3).ToString("yyyy-MM-ddTHH:mm:ss")
    note = "Test booking"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/booking/createBooking" -Method Post -Body $bookingBody -ContentType "application/json" -Headers $headers
```

### 🐛 Các Nguyên Nhân Thường Gặp

1. **Vehicle hoặc CoOwner không tồn tại**
   - Seed vehicle và co-owner: `Invoke-RestMethod -Uri "http://localhost:8000/api/booking/dev-seed" -Method Get`

2. **Database Connection Issue**
   - Kiểm tra database đã tạo chưa
   - Restart booking service: `docker compose restart booking-service`

3. **Validation Error**
   - Kiểm tra request body có đầy đủ fields không
   - Kiểm tra data types (vehicleId, coOwnerId phải là int)

4. **Overlapping Bookings**
   - Chọn thời gian khác
   - Hoặc cancel booking đang conflict

---

## 🧪 Test Frontend Features

### 🚀 Bước 1: Khởi động hệ thống

```powershell
# Start tất cả services
docker compose up -d

# Kiểm tra services đã chạy
docker compose ps

# Xem logs nếu cần
docker compose logs -f gateway-service
```

### 🔐 Bước 2: Seed tài khoản test

```powershell
# Seed tất cả tài khoản
powershell -ExecutionPolicy Bypass -File seed-test-accounts.ps1
```

**Tài khoản test:**
- Admin: `admin@example.com` / `Admin@12345`
- Staff: `staff@example.com` / `Staff@12345`
- Co-owner: `coowner@example.com` / `Coowner@12345`

### 📝 Bước 3: Seed dữ liệu test

#### Seed Vehicle Groups và Co-owners (Ownership Service)

```powershell
# Tạo dev group
Invoke-RestMethod -Uri "http://localhost:8000/api/ownership/dev/vehiclegroups/create?name=Test%20Group&description=Test%20EV%20Group" -Method Get
```

#### Seed Bookings (Booking Service)

```powershell
# Tạo booking test
$body = @{
    vehicleId = 1
    coOwnerId = 1
    startTime = (Get-Date).AddHours(1).ToString("yyyy-MM-ddTHH:mm:ss")
    endTime = (Get-Date).AddHours(3).ToString("yyyy-MM-ddTHH:mm:ss")
    note = "Test booking"
} | ConvertTo-Json

$token = "YOUR_TOKEN_HERE"
$headers = @{"Authorization"="Bearer $token";"Content-Type"="application/json"}

Invoke-RestMethod -Uri "http://localhost:8000/api/booking/createBooking" -Method Post -Body $body -ContentType "application/json" -Headers $headers
```

### 🧪 Bước 4: Test UI Features

1. **Mở browser:** `http://localhost`
2. **Login** với tài khoản test
3. **Test các chức năng:**
   - Dashboard
   - My Bookings (tạo, sửa, xóa, check-in/out)
   - Payment History
   - Cost Shares
   - Ownership Details
   - Group Voting
   - Usage Analytics

---

## 🧪 Test Booking Features

### 📋 Mục Lục
1. [Chuẩn Bị](#chuẩn-bị)
2. [Khởi Động Hệ Thống](#khởi-động-hệ-thống)
3. [Test Manual - UI](#test-manual---ui)
4. [Test API - PowerShell](#test-api---powershell)
5. [Troubleshooting](#troubleshooting)

### 🚀 Chuẩn Bị

#### 1. Kiểm tra Prerequisites

```powershell
# Kiểm tra Node.js
node --version  # Cần >= 18.x

# Kiểm tra Docker
docker --version
docker compose version
```

#### 2. Cài đặt Dependencies (nếu chạy local)

```powershell
cd frontend
npm install
```

### 🔧 Khởi Động Hệ Thống

#### Option 1: Chạy với Docker Compose (Recommended)

```powershell
# Từ root directory
docker compose up -d

# Kiểm tra services đã chạy
docker compose ps

# Xem logs nếu cần
docker compose logs -f gateway-service
docker compose logs -f booking-service
docker compose logs -f frontend
```

#### Option 2: Chạy Local Development

```powershell
# Terminal 1: Start backend services
docker compose up -d gateway-service booking-service auth-service

# Terminal 2: Start frontend
cd frontend
npm run dev
```

### 🧪 Test Manual - UI

1. **Mở browser:** `http://localhost:5173` (local) hoặc `http://localhost` (Docker)
2. **Login** với: `coowner@example.com` / `Coowner@12345`
3. **Vào My Bookings page**
4. **Test các chức năng:**
   - ✅ Create Booking
   - ✅ Update Booking
   - ✅ Cancel Booking
   - ✅ Check In (với QR code)
   - ✅ Check Out (với distance và cost)
   - ✅ View Booking Details

### 🧪 Test API - PowerShell

Chạy script test:
```powershell
powershell -ExecutionPolicy Bypass -File test-all.ps1
```

Script sẽ test:
- ✅ Login
- ✅ Get Bookings
- ✅ Create Booking
- ✅ Get QR Code
- ✅ Check In
- ✅ Check Out
- ✅ Update Booking
- ✅ Cancel Booking
- ✅ Get Schedules

### 🐛 Troubleshooting

#### Lỗi: "Cannot connect to API"

**Giải pháp:**
1. Kiểm tra Gateway service đã chạy: `docker compose ps gateway-service`
2. Kiểm tra port 8000 không bị chiếm: `netstat -ano | findstr :8000`
3. Restart Gateway: `docker compose restart gateway-service`

#### Lỗi: "401 Unauthorized"

**Giải pháp:**
1. Login lại để lấy token mới
2. Kiểm tra token chưa hết hạn
3. Kiểm tra Authorization header format: `Bearer <token>`

#### Lỗi: "500 Internal Server Error"

**Giải pháp:**
1. Xem logs: `docker compose logs booking-service`
2. Kiểm tra database connection
3. Seed test data: `Invoke-RestMethod -Uri "http://localhost:8000/api/booking/dev-seed" -Method Get`

---

## 📝 Quick Test Commands

Copy-paste để test nhanh:

```powershell
# 1. Login
$loginBody = @{email="coowner@example.com";password="Coowner@12345"} | ConvertTo-Json
$token = (Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json").data.accessToken

# 2. Setup headers
$headers = @{"Authorization"="Bearer $token";"Content-Type"="application/json"}

# 3. Test endpoints
Invoke-RestMethod -Uri "http://localhost:8000/api/ownership/vehiclegroups" -Method Get -Headers $headers
Invoke-RestMethod -Uri "http://localhost:8000/api/booking/allBooking" -Method Get
```

---

**Lưu ý:** Xem file `FRONTEND_BACKEND_INTEGRATION_REPORT.md` để biết chi tiết về tích hợp frontend-backend.

