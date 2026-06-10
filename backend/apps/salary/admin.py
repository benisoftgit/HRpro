"""Salary admin."""

from django.contrib import admin
from .models import SalaryStructure, AllowanceType, EmployeeAllowance, OvertimeRate


@admin.register(SalaryStructure)
class SalaryStructureAdmin(admin.ModelAdmin):
    list_display = ["employee", "basic_salary", "effective_date", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]


@admin.register(AllowanceType)
class AllowanceTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "is_taxable", "is_fixed"]
    list_filter = ["is_taxable", "is_fixed"]


@admin.register(EmployeeAllowance)
class EmployeeAllowanceAdmin(admin.ModelAdmin):
    list_display = ["employee", "allowance_type", "amount", "is_active", "effective_date"]
    list_filter = ["allowance_type", "is_active"]
    search_fields = ["employee__first_name", "employee__last_name"]


@admin.register(OvertimeRate)
class OvertimeRateAdmin(admin.ModelAdmin):
    list_display = ["name", "multiplier", "is_active"]
