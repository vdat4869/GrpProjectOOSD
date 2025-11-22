# Hướng Dẫn Test VNPay Sandbox

## 📋 Thông Tin Sandbox

- **Sandbox URL**: https://sandbox.vnpayment.vn
- **Terminal ID (TmnCode)**: `8LSI1RMU`
- **Secret Key (HashSecret)**: `IJ6ABY1X6OZFCPIR7AKXKH7X36Q09EH0`
- **Payment Gateway**: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

## 💳 Thẻ Test

### Thẻ ATM Nội Địa (NCB) - Thành Công
- **Số thẻ**: `9704198526191432198`
- **Tên chủ thẻ**: `NGUYEN VAN A`
- **Ngày phát hành**: `07/15`
- **Mật khẩu OTP**: `123456`
- **Kết quả**: ✅ Thanh toán thành công

### Thẻ ATM Nội Địa (NCB) - Không Đủ Số Dư
- **Số thẻ**: `9704195798459170488`
- **Tên chủ thẻ**: `NGUYEN VAN A`
- **Ngày phát hành**: `07/15`
- **Kết quả**: ❌ Thẻ không đủ số dư

### Thẻ VISA (No 3DS) - Thành Công
- **Số thẻ**: `4456530000001005`
- **Tên chủ thẻ**: `NGUYEN VAN A`
- **Ngày hết hạn**: `12/26`
- **CVV**: `123`
- **Kết quả**: ✅ Thanh toán thành công

### Thẻ MasterCard (No 3DS) - Thành Công
- **Số thẻ**: `5200000000001005`
- **Tên chủ thẻ**: `NGUYEN VAN A`
- **Ngày hết hạn**: `12/26`
- **CVV**: `123`
- **Kết quả**: ✅ Thanh toán thành công

## 🚀 Các Bước Test

### 1. Tạo Payment Request

1. Đăng nhập vào hệ thống với role **Co-owner**
2. Vào trang **Cost Shares** (`/coowner/cost-shares`)
3. Tìm một cost share detail có status **Pending**
4. Click nút **"Pay Now"**
5. Chọn **Payment Method**: `VNPay`
6. Click **"Pay"**

### 2. Thanh Toán Trên VNPay Sandbox

1. Browser sẽ redirect đến trang thanh toán VNPay
2. Chọn phương thức thanh toán:
   - **ATM nội địa** (NCB)
   - **VISA/MasterCard**
3. Nhập thông tin thẻ test (xem bảng trên)
4. Nhập OTP/CVV:
   - ATM: `123456`
   - VISA/MasterCard: `123`
5. Click **"Thanh toán"**

### 3. Xử Lý Kết Quả

Sau khi thanh toán, VNPay sẽ redirect về:
- **URL**: `http://localhost/vnpay-return`
- **Với các tham số**:
  - `vnp_ResponseCode`: Mã phản hồi
  - `vnp_TxnRef`: Order ID
  - `vnp_Amount`: Số tiền (đã nhân 100)
  - `vnp_TransactionNo`: Mã giao dịch VNPay
  - `vnp_BankCode`: Mã ngân hàng
  - `vnp_SecureHash`: Chữ ký xác thực

## 📊 Response Codes

| Code | Ý nghĩa | Hành động |
|------|---------|-----------|
| `00` | Giao dịch thành công | ✅ Hiển thị success page |
| `07` | Trừ tiền thành công nhưng bị nghi ngờ | ⚠️ Cảnh báo |
| `09` | Thẻ/Tài khoản chưa đăng ký InternetBanking | ❌ Hiển thị lỗi |
| `10` | Xác thực thông tin không đúng quá 3 lần | ❌ Hiển thị lỗi |
| `11` | Đã hết hạn chờ thanh toán | ❌ Hiển thị lỗi |
| `12` | Thẻ/Tài khoản bị khóa | ❌ Hiển thị lỗi |
| `13` | Nhập sai mật khẩu xác thực (OTP) | ❌ Hiển thị lỗi |
| `24` | Khách hàng hủy giao dịch | ❌ Hiển thị lỗi |
| `51` | Tài khoản không đủ số dư | ❌ Hiển thị lỗi |
| `65` | Tài khoản vượt quá hạn mức giao dịch trong ngày | ❌ Hiển thị lỗi |
| `75` | Ngân hàng thanh toán đang bảo trì | ❌ Hiển thị lỗi |
| `79` | Nhập sai mật khẩu thanh toán quá số lần | ❌ Hiển thị lỗi |
| `99` | Các lỗi khác | ❌ Hiển thị lỗi |

## ✅ Test Cases

### Test Case 1: Thanh Toán Thành Công
1. Sử dụng thẻ: `9704198526191432198` (NCB)
2. Nhập OTP: `123456`
3. **Kỳ vọng**: 
   - Redirect về `/vnpay-return` với `vnp_ResponseCode=00`
   - Hiển thị trang "Thanh toán thành công"
   - Cost share detail status chuyển sang `Paid`
   - Payment record được tạo trong database

### Test Case 2: Thẻ Không Đủ Số Dư
1. Sử dụng thẻ: `9704195798459170488` (NCB)
2. **Kỳ vọng**:
   - Redirect về `/vnpay-return` với `vnp_ResponseCode=51`
   - Hiển thị trang "Thanh toán thất bại"
   - Cost share detail status vẫn là `Pending`

### Test Case 3: Hủy Giao Dịch
1. Click "Hủy" trên trang thanh toán VNPay
2. **Kỳ vọng**:
   - Redirect về `/vnpay-return` với `vnp_ResponseCode=24`
   - Hiển thị trang "Thanh toán thất bại"
   - Cost share detail status vẫn là `Pending`

## 🔍 Kiểm Tra Logs

### VNPay Service Logs
```bash
docker-compose logs -f vnpay-service
```

Bạn sẽ thấy:
- `[VNPay] Creating payment URL for order {orderId}`
- `[VNPay] Payment URL created successfully`
- `[VNPay Return] Processing return for order {orderId}`
- `[VNPay Return] Signature verified successfully`
- `[VNPay Return] Payment result: SUCCESS/FAILED`

### Payment Service Logs
```bash
docker-compose logs -f payment-service
```

Bạn sẽ thấy:
- Payment record được tạo
- Cost share detail status được cập nhật
- IPN callback được xử lý

### Gateway Logs
```bash
docker-compose logs -f gateway-service
```

Bạn sẽ thấy:
- `[Gateway] Proxying POST /api/vnpay/create-payment -> http://vnpay-service:3001/api/vnpay/create-payment`

## 🐛 Troubleshooting

### Lỗi: "Invalid signature"
- **Nguyên nhân**: Secret key không khớp
- **Giải pháp**: Kiểm tra `VNP_HASH_SECRET` trong docker-compose.yml

### Lỗi: "Order not found"
- **Nguyên nhân**: Order ID không tồn tại trong payment store
- **Giải pháp**: Kiểm tra vnpay-service logs để xem order ID

### Lỗi: "Gateway timeout"
- **Nguyên nhân**: VNPay sandbox chậm hoặc network issue
- **Giải pháp**: Thử lại sau vài phút

### Không redirect về return URL
- **Nguyên nhân**: Return URL không đúng hoặc không accessible
- **Giải pháp**: 
  - Kiểm tra `VNP_RETURN_URL` trong docker-compose.yml
  - Đảm bảo frontend đang chạy trên `http://localhost`

## 📝 Lưu Ý

1. **Sandbox chỉ hỗ trợ các thẻ test** trong danh sách trên
2. **Không thể test QR code** trên sandbox miễn phí
3. **IPN callback** sẽ được gọi tự động sau khi thanh toán thành công
4. **Return URL** phải là URL công khai (không thể dùng localhost trong production)
5. **Test environment** không tính phí, có thể test nhiều lần

## 🔗 Tài Liệu Tham Khảo

- **VNPay Sandbox Docs**: https://sandbox.vnpayment.vn/apis/docs/
- **VNPay API Demo**: https://sandbox.vnpayment.vn/apis/vnpay-demo/
- **VNPay Downloads**: https://sandbox.vnpayment.vn/apis/downloads/

