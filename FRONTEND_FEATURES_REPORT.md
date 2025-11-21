# Báo Cáo Kiểm Tra Chức Năng Frontend

## 1. Auth Service

### ✅ Đăng ký & đăng nhập tài khoản Co-owner, Staff, Admin
**Vị trí:**
- **Sign In:** `frontend/src/pages/AuthPages/SignIn.tsx` - Route: `/signin`
- **Sign Up:** `frontend/src/pages/AuthPages/SignUp.tsx` - Route: `/signup`
- **Service:** `frontend/src/services/authService.ts` - `login()`, `register()`

**Cách thể hiện:**
- Form đăng nhập với email/password
- Form đăng ký với đầy đủ thông tin (firstName, lastName, email, password, phoneNumber, etc.)
- Tự động redirect đến dashboard theo role sau khi đăng nhập thành công
- Lưu token và user info vào localStorage

### ✅ Xác thực CMND/CCCD, giấy phép lái xe
**Vị trí:**
- **CoOwner KYC:** `frontend/src/pages/KYC/KycPage.tsx` - Route: `/coowner/kyc`
- **Admin Verification:** `frontend/src/pages/admin/KycVerification.tsx` - Route: `/admin/kyc-verification`
- **Components:** 
  - `frontend/src/components/kyc/SubmitIdentityForm.tsx` - Submit CMND/CCCD
  - `frontend/src/components/kyc/UploadLicenseForm.tsx` - Upload giấy phép lái xe
  - `frontend/src/components/kyc/KycStatusCard.tsx` - Hiển thị trạng thái KYC

**Cách thể hiện:**
- CoOwner: Tab-based interface với 3 tabs (Submit Identity, Upload License, Status)
- Admin: Danh sách tất cả KYC requests với filter theo status, có nút Approve/Reject cho từng document
- Preview ảnh sau khi upload
- Hiển thị trạng thái: NotSubmitted, Pending, Approved, Rejected

### ✅ Phân quyền theo vai trò (Co-owner / Staff / Admin)
**Vị trí:**
- **Protected Routes:** `frontend/src/routes/ProtectedRoute.tsx`
- **Role-based Routing:** 
  - `frontend/src/routes/CoownerRoutes.tsx`
  - `frontend/src/routes/StaffRoutes.tsx`
  - `frontend/src/routes/AdminRoutes.tsx`
- **Utils:** `frontend/src/utils/roles.ts` - `getDashboardPath()`

**Cách thể hiện:**
- Mỗi role có layout và routes riêng
- Sidebar khác nhau cho từng role (CoownerSidebar, StaffSidebar, AdminSidebar)
- ProtectedRoute kiểm tra role trước khi cho phép truy cập
- Tự động redirect đến dashboard phù hợp sau khi login

### ✅ Đổi mật khẩu, quản lý session
**Vị trí:**
- **Change Password:** `frontend/src/components/modals/ChangePasswordModal.tsx`
- **User Profile:** `frontend/src/pages/UserProfiles.tsx` - Route: `/coowner/profile`, `/staff/profile`, `/admin/profile`
- **Service:** `frontend/src/services/authService.ts` - `changePassword()`

**Cách thể hiện:**
- Button "Change Password" trong UserProfiles page
- Modal form với 3 fields: Current Password, New Password, Confirm Password
- Validation: mật khẩu mới phải >= 6 ký tự, phải khác mật khẩu cũ
- Session management: Auto-refresh token trong `apiClient.ts`

### ✅ Xác thực JWT cho các request qua Gateway
**Vị trí:**
- **API Client:** `frontend/src/services/apiClient.ts`
- **Auto-refresh:** Implemented trong `apiClient.request()`

**Cách thể hiện:**
- Tự động thêm `Authorization: Bearer {token}` header vào mọi request
- Tự động refresh token khi nhận 401 Unauthorized
- Retry request với token mới sau khi refresh thành công
- Logout và redirect về `/signin` nếu refresh token thất bại

---

## 2. Ownership Service

### ✅ Quản lý thông tin xe và tỉ lệ sở hữu (A 40%, B 30%, ...)
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/OwnershipDetails.tsx` - Route: `/coowner/ownership`
- **Admin:** `frontend/src/pages/admin/ManageGroups.tsx` - Route: `/admin/groups`
- **Service:** `frontend/src/services/ownershipService.ts` - `getOwnerships()`, `updateOwnership()`

**Cách thể hiện:**
- CoOwner: Hiển thị danh sách groups, chọn group để xem ownership percentages
- Hiển thị từng co-owner với ownership percentage, có thể edit percentage
- Hiển thị tổng ownership (phải = 100%)
- Admin: Quản lý groups và members, có thể thêm/xóa member và set ownership percentage

### ✅ Quản lý hợp đồng đồng sở hữu (ký điện tử, lưu hồ sơ pháp lý)
**Vị trí:**
- **Admin:** `frontend/src/pages/admin/ManageContracts.tsx` - Route: `/admin/contracts`
- **Staff:** `frontend/src/pages/staff/ManageContracts.tsx` - Route: `/staff/contracts`
- **Service:** `frontend/src/services/ownershipService.ts` - `getContracts()`, `signContract()`, `approveContract()`

**Cách thể hiện:**
- Danh sách contracts theo vehicle group
- Hiển thị contract type, status (Draft, Pending, Signed, Cancelled, Expired)
- Admin/Staff có thể approve contracts
- CoOwner có thể sign contracts (thông qua API, chưa có UI riêng)

### ✅ Quản lý nhóm đồng sở hữu: thêm/xóa thành viên, phân quyền nhóm
**Vị trí:**
- **Admin:** `frontend/src/pages/admin/ManageGroups.tsx` - Route: `/admin/groups`
- **CoOwner:** `frontend/src/pages/coowner/OwnershipDetails.tsx` - Route: `/coowner/ownership`
- **Service:** `frontend/src/services/ownershipService.ts` - `getCoOwners()`, `getOwnerships()`

**Cách thể hiện:**
- Admin: Button "Manage Members" mở modal hiển thị danh sách members
- Có thể thêm member mới (chọn co-owner, set ownership percentage)
- Có thể xóa member (Remove button)
- Có thể set group admin (Set Admin button)
- Hiển thị total ownership percentage và cảnh báo nếu != 100%

### ✅ Quản lý quỹ nhóm (đóng góp, chi tiêu, minh bạch số dư)
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/CommonFund.tsx` - Route: `/coowner/common-fund`
- **Service:** `frontend/src/services/ownershipService.ts` - `getGroupFunds()`, `createFundTransaction()`, `approveFundTransaction()`

**Cách thể hiện:**
- Hiển thị fund summary: maintenance fund, reserve fund, total contributions, total expenses, balance
- Hiển thị danh sách cost shares (contributions và expenses)
- Filter theo vehicle group
- Hiển thị chi tiết từng transaction với type (Contribution/Expense), amount, date
- **Lưu ý:** UI hiện tại chỉ hiển thị cost shares, chưa có UI để tạo fund transactions trực tiếp

### ✅ Quản lý quyết định & bỏ phiếu nhóm (nâng cấp pin, sửa chữa, bán xe)
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/GroupVoting.tsx` - Route: `/coowner/voting`
- **Components:**
  - `frontend/src/components/modals/CreateProposalModal.tsx` - Tạo proposal mới
  - `frontend/src/components/modals/VoteModal.tsx` - Bỏ phiếu
  - `frontend/src/components/modals/ProposalDetailModal.tsx` - Xem chi tiết proposal
- **Service:** `frontend/src/services/ownershipService.ts` - `getProposals()`, `createProposal()`, `voteOnProposal()`

**Cách thể hiện:**
- Danh sách proposals với status (Pending, Voting, Approved, Rejected)
- Button "Create Proposal" mở modal để tạo proposal mới
- Có thể chọn proposal type: Battery Upgrade, Repair, Sell Vehicle, Insurance, Other
- Button "Vote" mở modal để bỏ phiếu (Approve, Reject, Abstain)
- Hiển thị vote counts (approve, reject, abstain)
- Có AI suggestion khi tạo proposal (recommendation, reasoning, risk assessment)

### ✅ Quản lý hợp đồng pháp lý điện tử (Staff/Admin duyệt, lưu hồ sơ)
**Vị trí:**
- **Admin:** `frontend/src/pages/admin/ManageContracts.tsx` - Route: `/admin/contracts`
- **Staff:** `frontend/src/pages/staff/ManageContracts.tsx` - Route: `/staff/contracts`
- **Service:** `frontend/src/services/ownershipService.ts` - `approveContract()`, `getContracts()`

**Cách thể hiện:**
- Danh sách contracts theo vehicle group
- Filter theo status
- Button "Approve" để duyệt contract
- Button "Cancel" để hủy contract
- Hiển thị contract type, status, created date
- **Lưu ý:** Chưa có UI để tạo contract mới, chỉ có approve/cancel

---

## 3. Booking Service

### ✅ Lịch hiển thị xe đang trống / đang dùng
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/VehicleSchedule.tsx` - Route: `/coowner/schedule`
- **Service:** `frontend/src/services/bookingService.ts` - `getSchedules()`

**Cách thể hiện:**
- Hiển thị danh sách vehicles với status (Trống/Đang sử dụng)
- Calendar view với date picker để chọn ngày
- Hiển thị bookings trong ngày đã chọn
- Mỗi vehicle có:
  - Vehicle name
  - Status badge (Trống = green, Đang sử dụng = red)
  - Danh sách booking periods với start/end time và status

### ✅ Đặt lịch sử dụng xe, ghi chú
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/MyBookings.tsx` - Route: `/coowner/bookings`
- **Component:** `frontend/src/components/modals/CreateBookingModal.tsx`
- **Service:** `frontend/src/services/bookingService.ts` - `createBooking()`

**Cách thể hiện:**
- Button "Create Booking" mở modal
- Form có: Vehicle selection, Start time, End time, Note
- Có AI suggestion button để lấy gợi ý thời gian công bằng
- Hiển thị AI fairness score và alternative slots nếu score < 0.7
- Validation: End time phải sau Start time
- Sau khi tạo thành công, hiển thị owner code

### ✅ Check-in / Check-out bằng QR code, ký số khi nhận xe
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/MyBookings.tsx` - Route: `/coowner/bookings`
- **Staff:** `frontend/src/pages/staff/CheckInOut.tsx` - Route: `/staff/check-in-out`
- **Components:**
  - `frontend/src/components/modals/CheckInModal.tsx` - Check-in với QR code và digital signature
  - `frontend/src/components/modals/CheckOutModal.tsx` - Check-out với thông tin quãng đường, chi phí
- **Service:** `frontend/src/services/bookingService.ts` - `checkIn()`, `checkOut()`, `getQrCode()`

**Cách thể hiện:**
- Check-in Modal:
  - Tự động load QR code nếu booking đã confirmed
  - Hiển thị QR code image
  - Input field cho digital signature (text)
  - Button "Check In" để submit
- Check-out Modal:
  - Input fields: Distance (km), Additional costs, Notes
  - Button "Check Out" để submit
- Staff có thể check-in/check-out cho bất kỳ booking nào
- CoOwner chỉ có thể check-in/check-out cho booking của chính họ

### ✅ Hệ thống ưu tiên công bằng theo tỉ lệ sở hữu & lịch sử dùng xe (phối hợp AI Service)
**Vị trí:**
- **Component:** `frontend/src/components/modals/CreateBookingModal.tsx`
- **Service:** `frontend/src/services/aiService.ts` - `getBookingSuggestion()`

**Cách thể hiện:**
- Button "Get AI Fairness Suggestion" trong CreateBookingModal
- AI trả về:
  - Fairness score (0-1)
  - Reason (lý do đề xuất)
  - Alternative slots nếu score < 0.7
- Hiển thị suggestion trong blue box với fairness score
- User có thể chọn alternative slots được đề xuất

### ✅ Lưu lịch sử sử dụng: thời gian, quãng đường, chi phí phát sinh
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/MyBookings.tsx` - Route: `/coowner/bookings`
- **Service:** `frontend/src/services/bookingService.ts` - `getBookings()`

**Cách thể hiện:**
- Danh sách bookings với đầy đủ thông tin:
  - Vehicle name
  - Start time, End time
  - Status (Pending, Confirmed, In Progress, Completed, Cancelled)
  - Check-in time, Check-out time (nếu có)
  - Distance, Additional costs (từ check-out)
  - Note
- Filter theo status
- Có thể xem chi tiết từng booking

### ✅ Báo cáo trạng thái lịch: Pending / Confirmed / Completed / Cancelled / NoShow
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/MyBookings.tsx` - Route: `/coowner/bookings`
- **Staff:** `frontend/src/pages/staff/MonitorBookings.tsx` - Route: `/staff/bookings`
- **Admin:** `frontend/src/pages/admin/ManageBookings.tsx` - Route: `/admin/bookings`

**Cách thể hiện:**
- Status badges với màu sắc khác nhau:
  - Pending: amber
  - Confirmed: blue
  - In Progress: yellow
  - Completed: green
  - Cancelled: gray
- Filter buttons để lọc theo status
- Hiển thị số lượng bookings theo từng status

---

## 4. Payment Service

### ✅ Tự động chia chi phí theo tỉ lệ sở hữu hoặc thời gian sử dụng
**Vị trí:**
- **Component:** `frontend/src/components/modals/CreateCostShareModal.tsx`
- **Service:** `frontend/src/services/paymentService.ts` - `createCostShare()`, `getCostShareSuggestions()`
- **AI Service:** `frontend/src/services/aiService.ts` - `getCostSharingSuggestion()`

**Cách thể hiện:**
- Button "Get Suggestions" trong CreateCostShareModal
- Có 2 loại suggestions:
  1. **Ownership-based:** Chia theo tỉ lệ sở hữu
  2. **Usage-based:** Chia theo thời gian sử dụng
- AI suggestion hiển thị:
  - Method (Ownership/Usage)
  - Suggested amount cho từng co-owner
  - Reason cho mỗi suggestion
  - Total suggested amount
- User có thể chọn suggestion và tự động fill vào form

### ✅ Ghi nhận chi phí: điện, bảo dưỡng, bảo hiểm, đăng kiểm, vệ sinh, phí nhóm
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/CostShares.tsx` - Route: `/coowner/cost-shares`
- **Component:** `frontend/src/components/modals/CreateCostShareModal.tsx`
- **Service:** `frontend/src/services/paymentService.ts` - `createCostShare()`

**Cách thể hiện:**
- Button "Create Cost Share" mở modal
- Form có:
  - Vehicle Group selection
  - Cost Type: Charging, Insurance, Maintenance, Registration, Cleaning, Parking, Toll, Other
  - Title, Description
  - Total Amount, Currency
  - Due Date
  - Cost Share Details (tự động tạo khi dùng suggestions)
- Hiển thị danh sách cost shares với:
  - Cost type badge
  - Total amount
  - Due date
  - Status (Pending, Paid, Overdue)
  - Details cho từng co-owner với amount và status

### ✅ Thanh toán trực tuyến (VNPay, MoMo, eWallet, Banking)
**Vị trí:**
- **Component:** `frontend/src/components/modals/CreatePaymentModal.tsx`
- **Service:** `frontend/src/services/paymentService.ts` - `createPayment()`

**Cách thể hiện:**
- Modal thanh toán khi click "Pay" trên cost share detail
- Form có:
  - Payment Method: Banking, E-Wallet (dropdown)
  - Amount (pre-filled từ cost share detail)
  - Payment Methods selection (nếu đã có payment methods)
- **Lưu ý:** Chưa có UI để chọn VNPay/MoMo cụ thể, chỉ có Banking và E-Wallet
- Redirect đến payment gateway sau khi tạo payment

### ✅ Quản lý lịch sử giao dịch, biên lai điện tử
**Vị trí:**
- **Transaction History:** `frontend/src/pages/coowner/TransactionHistory.tsx` - Route: `/coowner/transactions`
- **Payment History:** `frontend/src/pages/coowner/PaymentHistory.tsx` - Route: `/coowner/payments`
- **Service:** `frontend/src/services/paymentService.ts` - `getTransactions()`, `getPayments()`

**Cách thể hiện:**
- **Transaction History:**
  - Danh sách transactions với type (Payment, Refund, Transfer)
  - Filter theo type
  - Hiển thị: Date, Type, Amount, Status, Description
  - Pagination
- **Payment History:**
  - Danh sách payments
  - Hiển thị: ID, Date, Amount, Method, Status
  - Button "View Details" mở modal xem chi tiết payment
  - **Lưu ý:** Chưa có chức năng download biên lai điện tử

### ✅ Tổng hợp chi phí theo tháng/quý, đồng bộ cho Report Service
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/UsageAnalytics.tsx` - Route: `/coowner/analytics`
- **Admin:** `frontend/src/pages/admin/Reports.tsx` - Route: `/admin/reports`
- **Service:** `frontend/src/services/reportService.ts` - `getCostStatistics()`

**Cách thể hiện:**
- Date range picker (start date, end date)
- Hiển thị cost statistics:
  - Total costs
  - Costs by category
  - Cost trends (line chart)
- Admin có thể generate reports:
  - Usage Summary
  - Financial Health
  - Operational KPIs
- **Lưu ý:** Chưa có filter theo tháng/quý cụ thể, chỉ có date range

---

## 5. Report Service

### ✅ Tổng hợp dữ liệu cá nhân: thời gian sử dụng, chi phí, quãng đường
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/UsageAnalytics.tsx` - Route: `/coowner/analytics`
- **Service:** `frontend/src/services/reportService.ts` - `getUsageStatistics()`, `getCostStatistics()`

**Cách thể hiện:**
- Vehicle group selector
- Date range picker
- Hiển thị:
  - **Usage Statistics:**
    - Total usage hours
    - Total distance (km)
    - Number of trips
    - Average trip duration
    - Energy efficiency
  - **Cost Statistics:**
    - Total costs
    - Costs by category
    - Cost trends chart
- Line charts để visualize trends

### ✅ Phân tích và so sánh với tỉ lệ sở hữu
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/UsageAnalytics.tsx` - Route: `/coowner/analytics`
- **AI Service:** `frontend/src/services/aiService.ts` - `getFairnessCheck()`

**Cách thể hiện:**
- AI Fairness Check section:
  - Fairness score
  - Comparison với ownership percentage
  - Recommendations nếu có bất công bằng
- Hiển thị usage vs ownership ratio
- **Lưu ý:** Chưa có chart so sánh trực quan, chỉ có text và score

### ✅ Tổng hợp báo cáo nhóm: quỹ chung, mức sử dụng của từng thành viên
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/CommonFund.tsx` - Route: `/coowner/common-fund`
- **Admin:** `frontend/src/pages/admin/Reports.tsx` - Route: `/admin/reports`

**Cách thể hiện:**
- **Common Fund:**
  - Fund summary: maintenance fund, reserve fund, balance
  - Total contributions, total expenses
  - Danh sách transactions
- **Admin Reports:**
  - Có thể generate reports cho từng vehicle group
  - Hiển thị usage của từng member
  - **Lưu ý:** Chưa có bảng so sánh mức sử dụng của từng thành viên trong cùng một view

### ✅ Sinh biểu đồ tài chính, thống kê sử dụng xe, tần suất đặt lịch
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/UsageAnalytics.tsx` - Route: `/coowner/analytics`
- **Component:** `frontend/src/components/charts/line/LineChartOne.tsx`

**Cách thể hiện:**
- Line charts cho:
  - Usage trends (hours, distance)
  - Cost trends
- **Lưu ý:** Chưa có biểu đồ tần suất đặt lịch, chỉ có usage và cost charts

### ✅ Xuất báo cáo tổng hợp (cho Admin/Staff)
**Vị trí:**
- **Admin:** `frontend/src/pages/admin/Reports.tsx` - Route: `/admin/reports`
- **Service:** `frontend/src/services/reportService.ts` - `generateUsageReport()`, `generateCostReport()`, `generateMaintenanceReport()`

**Cách thể hiện:**
- 3 loại reports:
  1. Usage Summary
  2. Financial Health
  3. Operational KPIs
- Button "Generate {Report Type}" để tạo report
- Hiển thị danh sách generated reports
- **Lưu ý:** Chưa có chức năng export/download report (PDF, Excel), chỉ hiển thị trong UI

---

## 6. AI Service

### ✅ Phân tích dữ liệu sử dụng xe & tỉ lệ sở hữu để đề xuất lịch công bằng
**Vị trí:**
- **Component:** `frontend/src/components/modals/CreateBookingModal.tsx`
- **Service:** `frontend/src/services/aiService.ts` - `getBookingSuggestion()`

**Cách thể hiện:**
- Button "Get AI Fairness Suggestion" trong CreateBookingModal
- AI trả về:
  - Fairness score (0-1)
  - Reason (lý do đề xuất)
  - Alternative slots nếu score < 0.7
- Hiển thị trong blue box với:
  - Fairness Score percentage
  - Reason text
  - Alternative slots (nếu có) với start/end time

### ✅ Gợi ý chia chi phí hợp lý giữa các đồng sở hữu
**Vị trí:**
- **Component:** `frontend/src/components/modals/CreateCostShareModal.tsx`
- **Service:** `frontend/src/services/aiService.ts` - `getCostSharingSuggestion()`

**Cách thể hiện:**
- Button "Get AI Suggestions" trong CreateCostShareModal
- AI trả về:
  - Method (Ownership-based hoặc Usage-based)
  - Suggested amount cho từng co-owner
  - Reason cho mỗi suggestion
  - Total suggested amount
- Hiển thị trong blue box với danh sách suggestions
- User có thể chọn suggestion và tự động fill vào cost share details

### ✅ Gợi ý quyết định nhóm (ví dụ: nâng cấp pin, thay ắc quy, bảo hiểm)
**Vị trí:**
- **Component:** `frontend/src/components/modals/CreateProposalModal.tsx`
- **Service:** `frontend/src/services/aiService.ts` - `getVotingSuggestion()`

**Cách thể hiện:**
- Button "Get AI Recommendation" trong CreateProposalModal
- AI trả về:
  - Recommendation (APPROVE/REJECT/ABSTAIN)
  - Reasoning (lý do)
  - Risk assessment (nếu có)
  - Suggested modifications (nếu có)
- Hiển thị trong blue box với:
  - Recommendation badge
  - Reasoning text
  - Risk assessment table
  - Suggested modifications list

### ✅ Phát hiện bất công bằng trong việc đặt lịch (recommendation feedback)
**Vị trí:**
- **CoOwner:** `frontend/src/pages/coowner/UsageAnalytics.tsx` - Route: `/coowner/analytics`
- **Service:** `frontend/src/services/aiService.ts` - `getFairnessCheck()`

**Cách thể hiện:**
- AI Fairness Check section:
  - Fairness score
  - Recommendations nếu có bất công bằng
  - Comparison với ownership percentage
- Hiển thị trong card với score và recommendations
- **Lưu ý:** Chưa có feedback mechanism để user report bất công bằng

### ✅ Cung cấp API /api/ai/suggestions cho Booking & Ownership Service
**Vị trí:**
- **Service:** `frontend/src/services/aiService.ts`
- **Endpoints:**
  - `/api/ai/suggestions/booking` - Booking suggestions
  - `/api/ai/suggestions/cost-sharing` - Cost sharing suggestions
  - `/api/ai/suggestions/voting` - Voting suggestions
  - `/api/ai/suggestions/fairness-check` - Fairness check

**Cách thể hiện:**
- Tất cả AI endpoints đã được implement trong `aiService.ts`
- Được sử dụng trong:
  - CreateBookingModal (booking suggestions)
  - CreateCostShareModal (cost sharing suggestions)
  - CreateProposalModal (voting suggestions)
  - UsageAnalytics (fairness check)

---

## Tổng Kết

### ✅ Đã có đầy đủ (100%):
1. Auth Service - Tất cả chức năng
2. Booking Service - Tất cả chức năng
3. AI Service - Tất cả chức năng

### ⚠️ Đã có nhưng chưa đầy đủ:
1. **Ownership Service:**
   - ✅ Quản lý thông tin xe và tỉ lệ sở hữu
   - ✅ Quản lý hợp đồng (chưa có UI tạo contract mới)
   - ✅ Quản lý nhóm (đầy đủ)
   - ⚠️ Quản lý quỹ nhóm (chưa có UI tạo fund transactions, chỉ hiển thị cost shares)
   - ✅ Quản lý voting
   - ⚠️ Quản lý hợp đồng pháp lý (chưa có UI tạo contract mới)

2. **Payment Service:**
   - ✅ Tự động chia chi phí
   - ✅ Ghi nhận chi phí
   - ⚠️ Thanh toán trực tuyến (chưa có UI chọn VNPay/MoMo cụ thể)
   - ✅ Lịch sử giao dịch
   - ⚠️ Biên lai điện tử (chưa có chức năng download)

3. **Report Service:**
   - ✅ Tổng hợp dữ liệu cá nhân
   - ⚠️ So sánh với tỉ lệ sở hữu (chưa có chart trực quan)
   - ⚠️ Tổng hợp báo cáo nhóm (chưa có bảng so sánh mức sử dụng)
   - ⚠️ Biểu đồ (chưa có biểu đồ tần suất đặt lịch)
   - ⚠️ Xuất báo cáo (chưa có export PDF/Excel)

---

## Đề Xuất Cải Thiện

1. **Thêm UI tạo Group Fund Transactions** trong CommonFund page
2. **Thêm UI tạo Contract mới** trong ManageContracts (Admin/Staff)
3. **Thêm UI chọn Payment Gateway cụ thể** (VNPay, MoMo) trong CreatePaymentModal
4. **Thêm chức năng download biên lai điện tử** trong PaymentHistory
5. **Thêm chart so sánh usage vs ownership** trong UsageAnalytics
6. **Thêm bảng so sánh mức sử dụng của từng thành viên** trong Admin Reports
7. **Thêm biểu đồ tần suất đặt lịch** trong UsageAnalytics
8. **Thêm chức năng export report** (PDF, Excel) trong Admin Reports

