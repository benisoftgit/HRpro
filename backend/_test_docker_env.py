"""Simulate Docker build environment (no .env file)"""
import os
# Clear all env vars that our settings.py would read from decouple
for k in ["SECRET_KEY", "DEBUG", "ALLOWED_HOSTS", "DATABASE_URL", "DB_NAME", "DB_USER",
          "DB_PASSWORD", "DB_HOST", "DB_PORT", "DB_SSLMODE", "EMAIL_HOST", "EMAIL_PORT",
          "EMAIL_HOST_USER", "EMAIL_HOST_PASSWORD", "EMAIL_USE_TLS", "FRONTEND_URL",
          "FRONTEND_DIST_DIR", "CORS_ALLOW_ALL_ORIGINS"]:
    os.environ.pop(k, None)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hrpro_backend.settings")
import django
django.setup()
from django.core.management import call_command
from io import StringIO
out = StringIO()
try:
    call_command("collectstatic", "--noinput", stdout=out, stderr=out)
    print(out.getvalue())
    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {e}")
