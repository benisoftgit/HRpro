"""Payroll admin."""

from django.contrib import admin
from .models import PayrollRun, Payslip


class PayslipInline(admin.TabularInline):
    model = Payslip
    extra = 0
    readonly_fields = [
        "employee", "basic_salary", "gross_salary", "paye_tax",
        "ssnit_employee", "net_salary", "status"
    ]
    can_delete = False


@admin.register(PayrollRun)
class PayrollRunAdmin(admin.ModelAdmin):
    list_display = ["__str__", "month", "year", "status", "created_by", "created_at"]
    list_filter = ["status", "year"]
    readonly_fields = ["created_at", "processed_at"]
    inlines = [PayslipInline]


@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    list_display = [
        "employee", "payroll_run", "basic_salary", "gross_salary",
        "paye_tax", "net_salary", "status", "email_sent"
    ]
    list_filter = ["status", "email_sent", "payroll_run"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    readonly_fields = ["created_at"]
