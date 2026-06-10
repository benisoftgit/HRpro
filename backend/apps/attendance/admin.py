"""Attendance admin."""

from django.contrib import admin
from .models import AttendanceRecord


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ["employee", "date", "clock_in", "clock_out", "status", "overtime_hours"]
    list_filter = ["status", "date"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    date_hierarchy = "date"
    ordering = ["-date"]
