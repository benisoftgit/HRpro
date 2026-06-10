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
FROM python:3.11-slim AS runtime

RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/www/static /var/www/media /var/www/html

WORKDIR /app
COPY --from=backend /app/backend /app/backend
COPY --from=backend /app/backend/staticfiles /var/www/static
COPY --from=backend /app/backend/media /var/www/media
COPY --from=frontend /app/frontend/dist /var/www/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=hrpro_backend.settings

EXPOSE 80
EXPOSE 8080

WORKDIR /app/backend
CMD ["sh", "-lc", "gunicorn hrpro_backend.wsgi:application --bind 0.0.0.0:8080 --workers 4 --timeout 120 & nginx -g 'daemon off;'" ]
