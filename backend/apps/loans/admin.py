"""Loans admin."""

from django.contrib import admin
from .models import Loan, LoanRepayment


class LoanRepaymentInline(admin.TabularInline):
    model = LoanRepayment
    extra = 0
    readonly_fields = ["created_at"]


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = [
        "employee", "loan_type", "amount", "monthly_deduction",
        "repayment_months", "status", "created_at"
    ]
    list_filter = ["loan_type", "status"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    readonly_fields = ["created_at", "updated_at"]
    inlines = [LoanRepaymentInline]


@admin.register(LoanRepayment)
class LoanRepaymentAdmin(admin.ModelAdmin):
    list_display = ["loan", "amount", "payment_date", "balance_after"]
    list_filter = ["payment_date"]
    readonly_fields = ["created_at"]
