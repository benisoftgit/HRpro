# ── Stage 1: Backend dependencies & code ─────────────────────
FROM python:3.11-slim AS backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 \
    libffi-dev shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

ENV FRONTEND_DIST_DIR=
RUN mkdir -p logs && python manage.py collectstatic --noinput

# ── Stage 2: Frontend build ─────────────────────────────────
FROM node:20-alpine AS frontend

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ── Stage 3: Production image ───────────────────────────────
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf-2.0-0 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=backend /app /app
COPY --from=frontend /app/dist /app/frontend/dist

ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=hrpro_backend.settings \
    FRONTEND_DIST_DIR=/app/frontend/dist \
    PORT=8000 \
    WEB_CONCURRENCY=2

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import socket; s=socket.socket(); s.connect(('localhost',${PORT:-8000})); s.close()"

CMD gunicorn hrpro_backend.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers $WEB_CONCURRENCY \
    --timeout 120 \
    --access-logfile -
