"""Employee admin."""

from django.contrib import admin
from .models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = [
        "employee_id",
        "full_name",
        "department",
        "position",
        "employment_type",
        "employment_status",
        "date_joined",
    ]
    list_filter = ["department", "employment_status", "employment_type", "gender"]
    search_fields = ["first_name", "last_name", "employee_id", "national_id", "ssnit_number"]
    readonly_fields = ["employee_id", "created_at", "updated_at"]
    ordering = ["employee_id"]

    fieldsets = (
        ("Personal Information", {
            "fields": (
                "employee_id",
                "first_name",
                "last_name",
                "other_name",
                "date_of_birth",
                "gender",
                "national_id",
                "phone",
                "personal_email",
                "address",
                "profile_picture",
            )
        }),
        ("Employment Details", {
            "fields": (
                "department",
                "position",
                "employment_type",
                "employment_status",
                "date_joined",
                "date_terminated",
            )
        }),
        ("Banking Details", {
            "fields": ("bank_name", "bank_account_number", "bank_branch"),
        }),
        ("Statutory Numbers", {
            "fields": ("ssnit_number", "tin_number"),
        }),
        ("Emergency Contact", {
            "fields": (
                "emergency_contact_name",
                "emergency_contact_phone",
                "emergency_contact_relationship",
            )
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )
