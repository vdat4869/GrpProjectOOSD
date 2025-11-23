# Database Export/Import Scripts

Scripts để export và import dữ liệu database giữa các máy development khác nhau.

## Vấn đề

Khi bạn tạo tài khoản hoặc dữ liệu ở máy của mình, push code lên git, nhưng khi bạn bè pull về thì không có dữ liệu đó vì database được lưu trong Docker volumes (không được commit vào git).

## Giải pháp

Sử dụng các script export/import để chia sẻ dữ liệu database giữa các máy.

## Cách sử dụng

### 1. Export Database (Máy của bạn)

**Windows (PowerShell):**
```powershell
cd database/scripts
.\export-db.ps1
```

**Linux/Mac (Bash):**
```bash
cd database/scripts
chmod +x export-db.sh
./export-db.sh
```

Script sẽ tạo thư mục `database/exports/YYYYMMDD_HHMMSS/` chứa các file backup (.bak) cho tất cả databases:
- `auth_db.bak`
- `ownership_db.bak`
- `booking_db.bak`
- `payment_db.bak`
- `report_db.bak`

### 2. Chia sẻ với team

**Cách 1: Commit vào Git** (nếu file nhỏ, < 10MB)
```bash
git add database/exports/
git commit -m "Add database exports"
git push
```

**Cách 2: Chia sẻ qua Cloud Storage** (khuyến nghị cho file lớn)
- Upload thư mục export lên Google Drive, OneDrive, hoặc Dropbox
- Chia sẻ link với team
- Team download về và đặt vào `database/exports/`

**Cách 3: Sử dụng Git LFS** (cho file lớn)
```bash
git lfs track "*.bak"
git add database/exports/
git commit -m "Add database exports (LFS)"
git push
```

### 3. Import Database (Máy của bạn bè)

**Windows (PowerShell):**
```powershell
cd database/scripts
.\import-db.ps1 -Path ".\database\exports\20241120_120000"
```

**Linux/Mac (Bash):**
```bash
cd database/scripts
chmod +x import-db.sh
./import-db.sh ./database/exports/20241120_120000
```

Script sẽ restore tất cả databases từ backup files.

## Lưu ý

1. **Đảm bảo container đang chạy:**
   ```bash
   docker-compose up -d sql
   ```

2. **Backup sẽ ghi đè dữ liệu hiện tại:**
   - Nếu bạn bè đã có dữ liệu, import sẽ thay thế hoàn toàn
   - Nên backup trước khi import nếu cần giữ dữ liệu cũ

3. **File .bak có thể lớn:**
   - Nếu file > 100MB, nên dùng Git LFS hoặc cloud storage
   - Có thể nén file trước khi chia sẻ

4. **Environment variables:**
   - Script sử dụng `SA_PASSWORD` từ environment variable
   - Nếu không có, sẽ dùng password mặc định: `YourStrong@Passw0rd`
   - Đảm bảo password khớp với docker-compose.yml

## Tự động hóa

### Tạo Git Hook để tự động export trước khi commit

**Windows (.git/hooks/pre-commit):**
```powershell
#!/bin/sh
cd database/scripts
powershell -ExecutionPolicy Bypass -File export-db.ps1
```

**Linux/Mac (.git/hooks/pre-commit):**
```bash
#!/bin/sh
cd database/scripts
./export-db.sh
```

### Tạo script helper

Tạo file `sync-db.ps1` hoặc `sync-db.sh` để tự động export và commit:

```powershell
# sync-db.ps1
.\export-db.ps1
$latest = Get-ChildItem -Path ".\database\exports" -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
git add "database/exports/$($latest.Name)"
git commit -m "Update database exports"
git push
```

## Troubleshooting

### Lỗi: Container not found
- Đảm bảo container `ev-sql` đang chạy: `docker ps`

### Lỗi: Permission denied
- Windows: Chạy PowerShell với quyền Administrator
- Linux/Mac: `chmod +x *.sh`

### Lỗi: Database is in use
- Script sẽ tự động set database sang SINGLE_USER mode trước khi restore
- Nếu vẫn lỗi, dừng các service đang kết nối database trước

### Lỗi: Backup file not found
- Kiểm tra đường dẫn export path
- Đảm bảo file .bak tồn tại trong thư mục export

## Best Practices

1. **Export thường xuyên:** Export sau khi có thay đổi dữ liệu quan trọng
2. **Commit message rõ ràng:** Ghi rõ ngày và nội dung thay đổi
3. **Không commit dữ liệu nhạy cảm:** Xóa password, token, thông tin cá nhân trước khi export
4. **Sử dụng Git LFS cho file lớn:** Tránh làm chậm repository
5. **Tạo seed data:** Thay vì export toàn bộ, có thể tạo script seed data mẫu

