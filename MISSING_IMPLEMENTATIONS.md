# 📋 CÁC CHỨC NĂNG CÒN THIẾU - CẦN IMPLEMENT

## 🔍 PHÂN TÍCH

Sau khi kiểm tra, các function sau **KHÔNG PHẢI** là dư thừa mà là **CHƯA ĐƯỢC IMPLEMENT** trong frontend:

---

## 1. ✅ **Vehicle Schedule** - "Lịch hiển thị xe đang trống / đang dùng"

### Backend:
- ✅ Endpoint: `GET /api/booking/schedules`
- ✅ Service: `GetVehicleSchedulesAsync()` đã implement đầy đủ
- ✅ Response: `VehicleScheduleResponse[]` với thông tin xe và bookings

### Frontend:
- ❌ **THIẾU**: Chưa có page/component để hiển thị lịch xe
- ✅ Function: `bookingService.getSchedules()` đã có sẵn
- ✅ Interface: `VehicleSchedule`, `BookingPeriod` đã định nghĩa

### Cần làm:
- Tạo page `VehicleSchedule.tsx` cho Co-owner
- Hiển thị danh sách xe với trạng thái (trống/đang dùng)
- Hiển thị lịch bookings cho từng xe
- Thêm route và sidebar link

---

## 2. ✅ **Transaction Management** - "Quản lý lịch sử giao dịch"

### Backend:
- ✅ Endpoint: `GET /api/payment/transactions?walletId={walletId}`
- ✅ Endpoint: `POST /api/payment/transactions`
- ✅ Service: `GetTransactionsAsync()`, `CreateTransactionAsync()` đã implement

### Frontend:
- ❌ **THIẾU**: Chưa có page để quản lý transactions
- ✅ Function: `paymentService.getTransactions()`, `createTransaction()` đã có sẵn
- ✅ Interface: `Transaction`, `CreateTransactionRequest` đã định nghĩa

### Cần làm:
- Tạo page `TransactionHistory.tsx` cho Co-owner
- Hiển thị danh sách transactions với filter
- Hiển thị chi tiết transaction
- Thêm route và sidebar link

### Lưu ý:
- Cần `walletId` để lấy transactions - có thể lấy từ user profile hoặc tạo wallet khi đăng ký

---

## 3. ✅ **Session Management** - "Quản lý session"

### Backend:
- ✅ Endpoint: `GET /api/auth/me` - Lấy thông tin user hiện tại
- ✅ Endpoint: `POST /api/auth/refresh-token` - Refresh token
- ✅ Service: `GetUserProfileAsync()`, `RefreshTokenAsync()` đã implement

### Frontend:
- ❌ **THIẾU**: Chưa implement auto-refresh token
- ✅ Function: `authService.getCurrentUser()`, `refreshToken()` đã có sẵn
- ✅ Interface: `RefreshTokenResponse` đã định nghĩa

### Cần làm:
- Implement auto-refresh token trong `apiClient.ts`
- Tự động refresh token khi hết hạn (401 Unauthorized)
- Sử dụng `getCurrentUser()` để verify session
- Thêm interceptor để handle token expiry

---

## 4. ⚠️ **Payment Methods Management** - "Thanh toán trực tuyến"

### Backend:
- ✅ Controller: `PaymentMethodsController` đã implement đầy đủ CRUD
- ✅ Endpoints: GET, POST, PUT, DELETE `/api/paymentmethods/*`
- ✅ Model: `PaymentMethod` trong database

### Frontend:
- ❌ **THIẾU**: Chưa có page để quản lý payment methods
- ❌ **THIẾU**: Chưa có endpoint trong `api.ts`
- ❌ **THIẾU**: Chưa có service call trong `paymentService.ts`
- ✅ Enum: `PaymentMethodType` đã được sử dụng trong `CreatePaymentModal`

### Cần làm:
- Thêm endpoints vào `api.ts`
- Thêm service functions vào `paymentService.ts`
- Tạo page `PaymentMethods.tsx` để quản lý payment methods của user
- Cho phép thêm/sửa/xóa payment methods (banking, e-wallet)
- Set default payment method

### Lưu ý:
- Có thể không bắt buộc nếu chỉ dùng enum `PaymentMethodType` trong form
- Nhưng nên có để user quản lý thông tin thanh toán của mình

---

## 📊 TỔNG KẾT

| Chức năng | Backend | Frontend Function | Frontend UI | Trạng thái |
|-----------|---------|-------------------|-------------|------------|
| Vehicle Schedule | ✅ | ✅ | ❌ | **CẦN IMPLEMENT** |
| Transaction Management | ✅ | ✅ | ❌ | **CẦN IMPLEMENT** |
| Auto-refresh Token | ✅ | ✅ | ❌ | **CẦN IMPLEMENT** |
| Payment Methods Management | ✅ | ❌ | ❌ | **CẦN IMPLEMENT** |

---

## 🎯 KẾ HOẠCH IMPLEMENT

### Priority 1 (Quan trọng):
1. ✅ **Vehicle Schedule** - Co-owner cần xem lịch xe để đặt booking
2. ✅ **Auto-refresh Token** - Cần thiết cho security và UX

### Priority 2 (Quan trọng vừa):
3. ✅ **Transaction Management** - Co-owner cần xem lịch sử giao dịch
4. ⚠️ **Payment Methods Management** - Có thể làm sau, không bắt buộc ngay

---

*Báo cáo được tạo vào: 2025-01-XX*

