# ── Backend build ──────────────────────────────────────────────
FROM python:3.11-slim AS backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "hrpro_backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]

# ── Frontend build ─────────────────────────────────────────────
FROM node:20-alpine AS frontend

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ── Production image ───────────────────────────────────────────
FROM nginx:alpine

RUN apk add --no-cache bash

COPY --from=backend /app/backend/staticfiles /var/www/static
COPY --from=backend /app/backend/media /var/www/media
COPY --from=frontend /app/frontend/dist /var/www/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
