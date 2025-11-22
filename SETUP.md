# Hướng dẫn Setup Project

## Vấn đề thường gặp khi pull code về

Khi pull code từ git về, có thể gặp các lỗi sau:

### 1. Database Migration chưa chạy

**Vấn đề**: Database schema chưa được tạo/cập nhật

**Giải pháp**:
```bash
# Các service sẽ tự động migrate khi start (trong Program.cs)
# Nhưng nếu cần migrate thủ công:

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

### 2. Thiếu Environment Variables

**Vấn đề**: File `.env` không có trong git (đã được ignore)

**Giải pháp**:
```bash

# Hoặc tạo file .env với các biến sau:

SA_PASSWORD=Hoyo@4869
JWT_SECRET=YourSuperSecretKeyForJWTTokenGeneration2024
JWT_ISSUER=EV-CoOwnership-System
JWT_AUDIENCE=EV-CoOwnership-System
RABBITMQ_USER=rabbitmq
RABBITMQ_PASS=rabbitmq123
MONGO_USER=mongoadmin
MONGO_PASSWORD=mongopass123
SQL_HOST=sql
SQL_USER=sa
ENVIRONMENT=Development
```

### 3. Dependencies chưa được restore

**Vấn đề**: NuGet packages hoặc npm packages chưa được install

**Giải pháp**:
```bash
# Backend (.NET)
# Mỗi service cần restore packages
cd auth-service && dotnet restore && cd ..
cd ownership-service && dotnet restore && cd ..
cd booking-service && dotnet restore && cd ..
cd payment_service/payment-service && dotnet restore && cd ../..
cd report-service && dotnet restore && cd ..

# Frontend
cd frontend
npm install
# hoặc
npm install --legacy-peer-deps
```

### 4. Database chưa được tạo

**Vấn đề**: SQL Server databases chưa được tạo

**Giải pháp**:
```bash
# Chạy Docker Compose để tạo databases
docker-compose up -d sql

# Đợi SQL Server sẵn sàng (khoảng 30-60 giây)
# Sau đó các service sẽ tự động tạo databases khi start
```

### 5. Migration files chưa được commit

**Vấn đề**: Migration files mới tạo chưa được commit vào git

**Giải pháp**:
```bash
# Kiểm tra migration files
git status

# Nếu có migration files mới, commit chúng:
git add **/Migrations/
git commit -m "Add database migrations"
git push
```

### 6. Build artifacts chưa được clean

**Vấn đề**: Build cũ có thể gây conflict

**Giải pháp**:
```bash
# Clean tất cả build artifacts
# Backend - Clean từng service
cd auth-service && dotnet clean && cd ..
cd ownership-service && dotnet clean && cd ..
cd booking-service && dotnet clean && cd ..
cd payment_service/payment-service && dotnet clean && cd ../..
cd report-service && dotnet clean && cd ..

# Frontend
cd frontend
rm -rf node_modules
rm -rf dist
rm -rf .vite
npm install
```

## Setup từ đầu (Fresh Install)

### Bước 1: Clone repository
```bash
git clone <repository-url>
cd GrpProjectOOSD
```

### Bước 2: Tạo file .env
```bash
# Tạo file .env ở root directory
cp .env.example .env  # Nếu có
# Hoặc tạo thủ công với các biến ở trên
```

### Bước 3: Restore dependencies
```bash
# Backend - Restore từng service
cd auth-service && dotnet restore && cd ..
cd ownership-service && dotnet restore && cd ..
cd booking-service && dotnet restore && cd ..
cd payment_service/payment-service && dotnet restore && cd ../..
cd report-service && dotnet restore && cd ..

# Frontend
cd frontend
npm install --legacy-peer-deps
cd ..
```

### Bước 4: Start services với Docker
```bash
docker-compose up -d
```

### Bước 5: Kiểm tra services
```bash
# Xem logs
docker-compose logs -f

# Kiểm tra health
docker-compose ps
```

## Troubleshooting

### Lỗi: "Cannot connect to database"
- Kiểm tra SQL Server đã start chưa: `docker-compose ps sql`
- Kiểm tra connection string trong appsettings.json
- Đợi SQL Server khởi động xong (có thể mất 1-2 phút)

### Lỗi: "Migration not found"
- Chạy `dotnet ef database update` trong từng service
- Hoặc xóa database và để service tự tạo lại

### Lỗi: "Package not found"
- Chạy `dotnet restore` trong từng service

### Lỗi: "Port already in use"
- Kiểm tra port nào đang bị chiếm: `netstat -ano | findstr :5000`
- Thay đổi port trong docker-compose.yml hoặc tắt service đang dùng port đó

## Checklist sau khi pull code

- [ ] Đã tạo file `.env` với đầy đủ biến môi trường
- [ ] Đã chạy `dotnet restore` cho tất cả services
- [ ] Đã chạy `npm install` cho frontend
- [ ] Đã start Docker Compose: `docker-compose up -d`
- [ ] Đã đợi SQL Server khởi động xong
- [ ] Đã kiểm tra logs: `docker-compose logs -f`
- [ ] Database đã được migrate (tự động hoặc thủ công)

## Xem Backend Logs

Xem file **`DEBUG_LOGS.md`** để biết cách kiểm tra logs của các services khi debug.