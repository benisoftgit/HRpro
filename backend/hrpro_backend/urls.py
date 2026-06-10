"""HR Pro — Root URL Configuration."""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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
