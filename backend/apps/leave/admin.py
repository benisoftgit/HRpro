"""Leave admin."""

from django.contrib import admin
from .models import LeaveType, LeaveBalance, LeaveRequest


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "days_allowed", "is_paid", "is_active"]
    list_filter = ["is_paid", "is_active"]


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = ["employee", "leave_type", "year", "total_days", "used_days"]
    list_filter = ["leave_type", "year"]
    search_fields = ["employee__first_name", "employee__last_name"]


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = [
        "employee", "leave_type", "start_date", "end_date",
        "days_requested", "status", "applied_at"
    ]
    list_filter = ["status", "leave_type"]
    search_fields = ["employee__first_name", "employee__last_name"]
    date_hierarchy = "applied_at"
    readonly_fields = ["applied_at", "updated_at"]
