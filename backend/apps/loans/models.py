"""Loan management models."""

from decimal import Decimal
from django.db import models


class Loan(models.Model):
    """Employee loan or salary advance."""

    class LoanType(models.TextChoices):
        SALARY_ADVANCE = "SALARY_ADVANCE", "Salary Advance"
        PERSONAL_LOAN = "PERSONAL_LOAN", "Personal Loan"
        EMERGENCY_LOAN = "EMERGENCY_LOAN", "Emergency Loan"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Approval"
        ACTIVE = "ACTIVE", "Active"
        COMPLETED = "COMPLETED", "Completed"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="loans",
    )
    loan_type = models.CharField(max_length=30, choices=LoanType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Annual interest rate as a percentage (e.g. 10 for 10%)",
    )
    repayment_months = models.PositiveIntegerField(
        help_text="Number of months to repay the loan"
    )
    monthly_deduction = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Fixed monthly deduction from payroll",
    )
    disbursement_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    approved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_loans",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.employee.full_name} — {self.get_loan_type_display()} "
            f"GHS {self.amount} [{self.status}]"
        )

    @property
    def total_repayable(self):
        """Total amount to be repaid including interest."""
        if self.interest_rate:
            interest = self.amount * Decimal(str(self.interest_rate)) / 100
            return self.amount + interest
        return self.amount

    @property
    def total_repaid(self):
        return sum(r.amount for r in self.repayments.all())

    @property
    def outstanding_balance(self):
        return self.total_repayable - Decimal(str(self.total_repaid))


class LoanRepayment(models.Model):
    """Individual repayment record for a loan."""

    loan = models.ForeignKey(
        Loan,
        on_delete=models.CASCADE,
        related_name="repayments",
    )
    payroll = models.ForeignKey(
        "payroll.PayrollRun",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="loan_repayments",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    balance_after = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date"]

    def __str__(self):
        return (
            f"Repayment for {self.loan.employee.full_name} — "
            f"GHS {self.amount} on {self.payment_date}"
        )
