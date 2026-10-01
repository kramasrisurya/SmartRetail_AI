# syntax=docker/dockerfile:1
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

ARG GIT_COMMIT=""
ARG BUILD_TAG="dev"
ENV GIT_COMMIT=${GIT_COMMIT} \
    BUILD_TAG=${BUILD_TAG}

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# uvicorn runs as the ASGI server in every environment (production-appropriate).
# --reload (hot reload) is enabled only when RELOAD is set, e.g. local dev.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port 8000 ${RELOAD:+--reload}"]
