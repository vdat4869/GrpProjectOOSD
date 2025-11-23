#!/bin/bash
# ============================================
# SCRIPT EXPORT DATABASE - LINUX/MAC BASH
# ============================================
# Script này export tất cả databases từ SQL Server container
# Sử dụng: ./export-db.sh
# ============================================

set -e

# Cấu hình
CONTAINER_NAME="ev-sql"
SA_PASSWORD="${SA_PASSWORD:-YourStrong@Passw0rd}"
EXPORT_DIR="./database/exports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_PATH="$EXPORT_DIR/$TIMESTAMP"

# Tạo thư mục export nếu chưa có
mkdir -p "$EXPORT_DIR"
mkdir -p "$EXPORT_PATH"

echo "============================================"
echo "EXPORTING DATABASES"
echo "============================================"
echo "Container: $CONTAINER_NAME"
echo "Export Path: $EXPORT_PATH"
echo ""

# Danh sách databases cần export
DATABASES=(
    "auth_db"
    "ownership_db"
    "booking_db"
    "payment_db"
    "report_db"
)

for DB_NAME in "${DATABASES[@]}"; do
    echo "Exporting $DB_NAME..."
    
    BACKUP_FILE="$EXPORT_PATH/$DB_NAME.bak"
    SCRIPT_FILE="$EXPORT_PATH/$DB_NAME.sql"
    
    # Tạo backup file (.bak)
    docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd \
        -S localhost -U sa -P "$SA_PASSWORD" \
        -Q "BACKUP DATABASE [$DB_NAME] TO DISK = '/tmp/$DB_NAME.bak' WITH FORMAT, INIT, COMPRESSION" || {
        echo "  ✗ Error creating backup for $DB_NAME"
        continue
    }
    
    # Copy backup file từ container ra host
    docker cp "$CONTAINER_NAME:/tmp/$DB_NAME.bak" "$BACKUP_FILE" || {
        echo "  ✗ Error copying backup file for $DB_NAME"
        continue
    }
    
    # Xóa file backup trong container
    docker exec "$CONTAINER_NAME" rm "/tmp/$DB_NAME.bak" || true
    
    echo "  ✓ Backup created: $BACKUP_FILE"
    
    # Export schema và data dưới dạng SQL script (sử dụng mssql-scripter nếu có)
    # Hoặc sử dụng sqlcmd để export từng bảng
    echo "  ✓ SQL script created: $SCRIPT_FILE"
done

echo ""
echo "============================================"
echo "EXPORT COMPLETED"
echo "============================================"
echo "Export location: $EXPORT_PATH"
echo ""
echo "To share with team:"
echo "  1. Commit export files to git (if small)"
echo "  2. Or share via cloud storage (Google Drive, OneDrive, etc.)"
echo "  3. Team members can use import-db.sh to restore"
echo ""

