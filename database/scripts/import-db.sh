#!/bin/bash
# ============================================
# SCRIPT IMPORT DATABASE - LINUX/MAC BASH
# ============================================
# Script này import databases từ backup files
# Sử dụng: ./import-db.sh ./database/exports/20241120_120000
# ============================================

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <export-path>"
    echo "Example: $0 ./database/exports/20241120_120000"
    exit 1
fi

EXPORT_PATH="$1"

# Cấu hình
CONTAINER_NAME="ev-sql"
SA_PASSWORD="${SA_PASSWORD:-YourStrong@Passw0rd}"

if [ ! -d "$EXPORT_PATH" ]; then
    echo "Error: Export path not found: $EXPORT_PATH"
    exit 1
fi

echo "============================================"
echo "IMPORTING DATABASES"
echo "============================================"
echo "Container: $CONTAINER_NAME"
echo "Import Path: $EXPORT_PATH"
echo ""

# Danh sách databases cần import
DATABASES=(
    "auth_db"
    "ownership_db"
    "booking_db"
    "payment_db"
    "report_db"
)

for DB_NAME in "${DATABASES[@]}"; do
    BACKUP_FILE="$EXPORT_PATH/$DB_NAME.bak"
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo "Skipping $DB_NAME (backup file not found)"
        continue
    fi
    
    echo "Importing $DB_NAME..."
    
    # Copy backup file vào container
    CONTAINER_BACKUP_PATH="/tmp/$DB_NAME.bak"
    docker cp "$BACKUP_FILE" "$CONTAINER_NAME:$CONTAINER_BACKUP_PATH" || {
        echo "  ✗ Error copying backup file for $DB_NAME"
        continue
    }
    
    # Restore database từ backup
    docker exec "$CONTAINER_NAME" /opt/mssql-tools18/bin/sqlcmd \
        -S localhost -U sa -P "$SA_PASSWORD" \
        -Q "ALTER DATABASE [$DB_NAME] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
            RESTORE DATABASE [$DB_NAME] FROM DISK = '$CONTAINER_BACKUP_PATH' WITH REPLACE;
            ALTER DATABASE [$DB_NAME] SET MULTI_USER;" || {
        echo "  ✗ Error restoring $DB_NAME"
        continue
    }
    
    # Xóa file backup trong container
    docker exec "$CONTAINER_NAME" rm "$CONTAINER_BACKUP_PATH" || true
    
    echo "  ✓ $DB_NAME imported successfully"
done

echo ""
echo "============================================"
echo "IMPORT COMPLETED"
echo "============================================"
echo ""

