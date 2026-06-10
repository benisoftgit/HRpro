"""Payroll models — PayrollRun and Payslip."""

from django.db import models


class PayrollRun(models.Model):
    """Represents a monthly payroll processing run."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PROCESSING = "PROCESSING", "Processing"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    class CalculationMode(models.TextChoices):
        SALARY = "SALARY", "Salary Grade"
        TIMESHEET = "TIMESHEET", "Timesheet"

    calculation_mode = models.CharField(
        max_length=10,
        choices=CalculationMode.choices,
        default=CalculationMode.SALARY,
        help_text="SALARY: uses fixed basic salary. TIMESHEET: computes from attendance hours × hourly rate.",
    )

    month = models.PositiveSmallIntegerField(
        help_text="Payroll month (1-12)"
    )
    year = models.PositiveSmallIntegerField(
        help_text="Payroll year (e.g. 2024)"
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_payrolls",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-year", "-month"]
        unique_together = ["month", "year"]

    def __str__(self):
        import calendar
        month_name = calendar.month_name[self.month]
        return f"Payroll — {month_name} {self.year} [{self.status}]"

    @property
    def total_gross(self):
        return sum(p.gross_salary for p in self.payslips.all())

    @property
    def total_net(self):
        return sum(p.net_salary for p in self.payslips.all())

    @property
    def total_paye(self):
        return sum(p.paye_tax for p in self.payslips.all())

    @property
    def total_ssnit_employee(self):
        return sum(p.ssnit_employee for p in self.payslips.all())

    @property
    def total_ssnit_employer(self):
        return sum(p.ssnit_employer for p in self.payslips.all())


class Payslip(models.Model):
    """Individual employee payslip for a payroll run."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        FINAL = "FINAL", "Final"

    payroll_run = models.ForeignKey(
        PayrollRun,
        on_delete=models.CASCADE,
        related_name="payslips",
    )
    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="payslips",
    )

    # ── Earnings ──────────────────────────────────────────────────────────────
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    overtime_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # ── Statutory Deductions ──────────────────────────────────────────────────
    ssnit_employee = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Employee SSNIT contribution (5.5% of basic)"
    )
    ssnit_employer = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Employer SSNIT contribution (13% of basic)"
    )
    tier2_employee = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )
    tier2_employer = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Employer Tier 2 contribution (5% of basic)"
    )
    tier3_employee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tier3_employer = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # ── Tax ───────────────────────────────────────────────────────────────────
    taxable_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paye_tax = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="PAYE tax calculated using GRA tax bands"
    )

    # ── Other Deductions ──────────────────────────────────────────────────────
    loan_deduction = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # ── Net ───────────────────────────────────────────────────────────────────
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # ── Meta ──────────────────────────────────────────────────────────────────
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    email_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["employee__employee_id"]
        unique_together = ["payroll_run", "employee"]

    def __str__(self):
        return (
            f"Payslip — {self.employee.full_name} "
            f"({self.payroll_run.month}/{self.payroll_run.year})"
        )


class PayrollRunAdjustment(models.Model):
    """
    Per-employee adjustments for a specific payroll run (DRAFT only).
    These values are applied when processing the payroll run,
    and are cleared after processing to keep a clean state.
    """

    payroll_run = models.ForeignKey(
        PayrollRun, on_delete=models.CASCADE, related_name="adjustments"
    )
    employee = models.ForeignKey(
        "employees.Employee", on_delete=models.CASCADE, related_name="payroll_adjustments"
    )
    regular_ot_hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=0,
        help_text="Regular overtime hours (1.5x rate)"
    )
    holiday_ot_hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=0,
        help_text="Public holiday overtime hours (2.0x rate)"
    )
    additional_allowance = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Ad-hoc additional allowance amount (added to regular allowances)"
    )
    additional_allowance_label = models.CharField(
        max_length=100, blank=True,
        help_text="Label for the ad-hoc allowance (e.g. 'Bonus', 'Housing Allowance')"
    )

    class Meta:
        ordering = ["employee__employee_id"]
        unique_together = ["payroll_run", "employee"]

    def __str__(self):
        return f"Adjustment — {self.employee.full_name} ({self.payroll_run})"
