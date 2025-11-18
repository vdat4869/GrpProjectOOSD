# ai-service/Dockerfile
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Tạo user non-root sớm để chạy ở layer cuối
RUN useradd -m appuser

# ---------- Builder: tạo venv và cài deps ----------
FROM base AS builder
RUN python -m venv /opt/venv
COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# ---------- Runtime ----------
FROM base AS runtime
# copy venv đã cài
COPY --from=builder /opt/venv /opt/venv
# copy source
COPY . .

USER appuser
EXPOSE 8000

# Healthcheck gọn
# Healthcheck gọn – chỉ 2 dòng, không có script nhiều dòng
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD python -c "import urllib.request,sys; \
r = urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2); \
sys.exit(0 if r.status == 200 else 1)"


# Cho phép định cấu hình workers qua ENV (mặc định 1)
ENV UVICORN_WORKERS=1
CMD ["sh","-c","uvicorn main:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS}"]
