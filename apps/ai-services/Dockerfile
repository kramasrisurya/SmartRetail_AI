# syntax=docker/dockerfile:1
FROM python:3.13-slim AS runner

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH="/app"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY apps/ai-services/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy ai-services and shared services module
COPY apps/ai-services/ ./apps/ai_services/
COPY services/ ./services/

# Create non-root user
RUN useradd -m -u 10001 aiuser && chown -R aiuser:aiuser /app
USER aiuser

CMD ["python", "-m", "apps.ai_services.service", "--camera", "CAM-01", "--source", "simulation", "--broker", "kafka", "--kafka-servers", "kafka:9092"]
