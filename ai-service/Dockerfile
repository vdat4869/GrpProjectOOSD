# ai-service/Dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Healthcheck bằng Python one-liner (hợp lệ với HEALTHCHECK)
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD ["python","-c","import urllib.request,sys; \
import socket; socket.setdefaulttimeout(2); \
try:\n    r=urllib.request.urlopen('http://127.0.0.1:8000/health',timeout=2); \
    sys.exit(0 if r.status==200 else 1)\nexcept Exception:\n    sys.exit(1)"]

# Run the application
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","8000"]
