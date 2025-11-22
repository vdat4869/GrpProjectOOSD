# Multi-stage Dockerfile để giảm kích thước image cuối cùng
# Stage 1: Build stage - cài đặt dependencies cần compile
FROM python:3.11-slim AS build
WORKDIR /app

# Cài đặt build dependencies (gcc, g++ để compile một số Python packages)
# --no-install-recommends: Chỉ cài packages cần thiết, không cài recommended packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*  # Xóa apt cache để giảm kích thước

# Copy requirements.txt và cài đặt dependencies
# --user: Cài vào /root/.local để có thể copy sang stage runtime
# --no-cache-dir: Không lưu pip cache để giảm kích thước
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime stage - chỉ chứa code và dependencies đã build
FROM python:3.11-slim AS runtime
WORKDIR /app

# Copy Python packages từ build stage (không cần gcc, g++ nữa)
COPY --from=build /root/.local /root/.local

# Copy application code
COPY . .

# Thêm /root/.local/bin vào PATH để có thể chạy các scripts đã cài
ENV PATH=/root/.local/bin:$PATH

# Expose port 8000 (port mà FastAPI service chạy)
EXPOSE 8000

# Chạy FastAPI application với uvicorn
# --host 0.0.0.0: Lắng nghe trên tất cả interfaces (để Docker có thể forward)
# --port 8000: Port mà service chạy
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
