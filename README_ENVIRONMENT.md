# Environment Configuration Guide

## Cách chuyển đổi giữa Development và Production

### 1. Development Mode (Local Dev - API dev hoạt động)

Tạo file `.env`:
```bash
ENVIRONMENT=Development
```

Hoặc chạy trực tiếp:
```bash
docker compose up
```

**Đặc điểm:**
- ✅ API dev hoạt động (không cần JWT token)
- ✅ Swagger UI enabled
- ✅ Detailed error messages
- ✅ Hot reload support

### 2. Production Mode (Deploy - API dev bị chặn)

Tạo file `.env`:
```bash
ENVIRONMENT=Production
```

Hoặc set biến môi trường:
```bash
export ENVIRONMENT=Production
docker compose up
```

**Đặc điểm:**
- ❌ API dev bị chặn (403 Forbidden)
- ✅ Chỉ API thật hoạt động (cần JWT token)
- ✅ Optimized performance
- ✅ Security hardened

## Các API Dev (chỉ hoạt động khi ENVIRONMENT=Development)

- `GET /api/Bookings/dev-seed` - Tạo seed data
- `POST /api/Bookings/dev-create` - Tạo booking không cần auth
- `GET /api/Bookings/dev-create` - Tạo booking qua query params
- `GET /api/Bookings/dev-confirm` - Confirm booking
- `GET /api/Bookings/dev-check-in` - Check-in tự động
- `GET /api/Bookings/dev-check-out` - Check-out tự động

## Kiểm tra Environment hiện tại

```bash
# Xem logs của service
docker compose logs booking-service | grep "Environment"

# Hoặc test API dev
curl http://localhost:5000/api/booking/dev-seed
# Nếu trả về 403 Forbidden → đang ở Production mode
# Nếu trả về data → đang ở Development mode
```

## Lưu ý

- **Local Development**: Luôn dùng `ENVIRONMENT=Development`
- **Production Deployment**: Bắt buộc dùng `ENVIRONMENT=Production` để bảo mật
- Mặc định: `Development` (nếu không set biến ENVIRONMENT)


