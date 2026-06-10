"""Attendance URL patterns."""

from django.urls import path
from .views import AttendanceListCreateView, AttendanceDetailView, AttendanceSummaryView, AttendanceImportView

urlpatterns = [
    path("", AttendanceListCreateView.as_view(), name="attendance-list"),
    path("summary/", AttendanceSummaryView.as_view(), name="attendance-summary"),
    path("import/", AttendanceImportView.as_view(), name="attendance-import"),
    path("<int:pk>/", AttendanceDetailView.as_view(), name="attendance-detail"),
]
