"""HR Pro — Root URL Configuration."""

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static

from .views import frontend_spa, health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/employees/", include("apps.employees.urls")),
    path("api/departments/", include("apps.departments.urls")),
    path("api/salary/", include("apps.salary.urls")),
    path("api/attendance/", include("apps.attendance.urls")),
    path("api/leave/", include("apps.leave.urls")),
    path("api/loans/", include("apps.loans.urls")),
    path("api/payroll/", include("apps.payroll.urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/performance/", include("apps.performance.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

# Health check for Fly.io
urlpatterns += [
    path("api/health/", health_check),
]

# Serve the React SPA for client-side routing (any non-API, non-static path)
urlpatterns += [
    re_path(r"^.*$", frontend_spa),
]
