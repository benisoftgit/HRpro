# Backend stage
FROM python:3.11-slim AS backend
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
RUN python manage.py collectstatic --noinput

# Frontend stage
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Final stage
FROM nginx:alpine
RUN apk add --no-cache bash
COPY --from=backend /app/backend/staticfiles /var/www/static
COPY --from=backend /app/backend/media /var/www/media
COPY --from=frontend /app/frontend/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
