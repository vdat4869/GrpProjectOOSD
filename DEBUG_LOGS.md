# Hướng dẫn Kiểm tra Backend Logs

## Cách xem logs từ Docker Compose

### 1. Xem logs của tất cả services

```bash
# Xem logs real-time của tất cả services
docker-compose logs -f

# Xem logs của 100 dòng cuối cùng
docker-compose logs --tail=100

# Xem logs từ một thời điểm cụ thể
docker-compose logs --since 10m  # 10 phút trước
docker-compose logs --since 1h   # 1 giờ trước
```

### 2. Xem logs của một service cụ thể

#### Report Service (quan trọng cho maintenance)
```bash
# Xem logs real-time
docker-compose logs -f report-service

# Xem logs 100 dòng cuối
docker-compose logs --tail=100 report-service

# Xem logs từ 10 phút trước
docker-compose logs --since 10m report-service
```

#### Payment Service (quan trọng cho cost share)
```bash
# Xem logs real-time
docker-compose logs -f payment-service

# Xem logs 100 dòng cuối
docker-compose logs --tail=100 payment-service
```

#### Ownership Service (quan trọng cho vehicle groups)
```bash
docker-compose logs -f ownership-service
```

### 3. Xem logs trực tiếp từ container

```bash
# Report Service
docker logs -f ev-report-service

# Payment Service
docker logs -f ev-payment-service

# Ownership Service
docker logs -f ev-ownership-service
```

### 4. Tìm kiếm trong logs

```bash
# Tìm "maintenance" trong logs của report-service
docker-compose logs report-service | grep -i maintenance

# Tìm "cost share" trong logs
docker-compose logs | grep -i "cost share"

# Tìm lỗi (Error)
docker-compose logs report-service | grep -i error

# Tìm warning
docker-compose logs report-service | grep -i warning
```

### 5. Lưu logs vào file

```bash
# Lưu logs của report-service vào file
docker-compose logs report-service > report-service-logs.txt

# Lưu logs của tất cả services
docker-compose logs > all-logs.txt

# Lưu logs với timestamp
docker-compose logs --timestamps > logs-with-time.txt
```

## Các log messages quan trọng cần tìm

### Khi mark maintenance as completed:

1. **Tìm vehicle group:**
   ```
   "Calling payment service to create cost share"
   "Could not find vehicle group for vehicleId"
   ```

2. **Tìm ownerships:**
   ```
   "Failed to get ownerships for group"
   "No active ownerships found for group"
   ```

3. **Tạo cost share:**
   ```
   "Calling payment service to create cost share"
   "Cost share created successfully"
   "Failed to create cost share"
   ```

### Ví dụ commands để debug maintenance issue:

```bash
# Xem logs real-time của report-service khi test
docker-compose logs -f report-service

# Sau khi mark completed, tìm các messages liên quan
docker-compose logs report-service | grep -i "maintenance\|cost share\|vehicle group"

# Xem logs của payment-service để check xem có nhận được request không
docker-compose logs -f payment-service

# Xem logs của ownership-service để check vehicle groups
docker-compose logs ownership-service | grep -i "vehiclegroup"
```

## Kiểm tra logs trong Windows (PowerShell)

```powershell
# Xem logs real-time
docker-compose logs -f report-service

# Tìm kiếm trong logs
docker-compose logs report-service | Select-String -Pattern "maintenance" -CaseSensitive:$false

# Lưu logs vào file
docker-compose logs report-service | Out-File -FilePath report-logs.txt
```

## Kiểm tra logs trong Windows (CMD)

```cmd
REM Xem logs real-time
docker-compose logs -f report-service

REM Tìm kiếm (cần cài grep hoặc dùng findstr)
docker-compose logs report-service | findstr /i "maintenance"

REM Lưu logs vào file
docker-compose logs report-service > report-logs.txt
```

## Tips

1. **Sử dụng `-f` (follow) để xem logs real-time** khi đang test
2. **Sử dụng `--tail=100` để xem 100 dòng cuối** thay vì toàn bộ logs
3. **Sử dụng `--since` để giới hạn thời gian** và tránh logs quá dài
4. **Lưu logs vào file** để phân tích sau
5. **Tìm kiếm keywords** như "Error", "Warning", "Failed", "Success" để nhanh chóng tìm vấn đề

## Ví dụ workflow debug maintenance issue

```bash
# 1. Mở terminal và xem logs real-time của report-service
docker-compose logs -f report-service

# 2. Trong browser, thực hiện action "Mark maintenance as completed"

# 3. Quan sát logs để thấy:
#    - "Calling payment service to create cost share"
#    - "Cost share created successfully" HOẶC "Failed to create cost share"
#    - Error messages nếu có

# 4. Nếu có lỗi, xem logs của payment-service
docker-compose logs -f payment-service

# 5. Tìm kiếm error cụ thể
docker-compose logs report-service | grep -i "error\|failed"
```

