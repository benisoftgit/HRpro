"""Salary structure, allowances, overtime, and statutory settings models."""

from django.db import models
from decimal import Decimal


class PayrollSettings(models.Model):
    """
    Singleton model storing all editable statutory rates and PAYE tax bands.
    Only one record should exist — use PayrollSettings.get_settings().
    """

    # ── SSNIT / Social Security ───────────────────────────────────────────────
    ssnit_employee_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal("0.055"),
        help_text="Employee SSNIT contribution rate (default 5.5% = 0.0550)"
    )
    ssnit_employer_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal("0.130"),
        help_text="Employer SSNIT Tier 1 contribution rate (default 13% = 0.1300)"
    )
    tier2_employer_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal("0.050"),
        help_text="Employer NPRA Tier 2 contribution rate (default 5% = 0.0500)"
    )
    tier3_employee_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal("0.000"),
        help_text="Employee Tier 3 (Provident Fund) rate — optional"
    )
    tier3_employer_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal("0.000"),
        help_text="Employer Tier 3 (Provident Fund) rate — optional"
    )

    # ── Working time defaults ─────────────────────────────────────────────────
    working_days_per_month = models.PositiveSmallIntegerField(
        default=22, help_text="Average working days per month for hourly rate calculation"
    )
    working_hours_per_day = models.PositiveSmallIntegerField(
        default=8, help_text="Standard working hours per day"
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payroll Settings"
        verbose_name_plural = "Payroll Settings"

    def __str__(self):
        return "Payroll Settings"

    @classmethod
    def get_settings(cls):
        """Return the singleton settings record, creating it if it doesn't exist."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class BusinessProfile(models.Model):
    """
    Singleton storing the company's business details for display on
    payslips, reports, and other official documents.
    Only one record should exist.
    """

    company_name = models.CharField(
        max_length=200, default="HR Pro",
        help_text="Registered business / company name"
    )
    address = models.CharField(
        max_length=300, blank=True,
        help_text="Registered business address"
    )
    phone = models.CharField(
        max_length=50, blank=True,
        help_text="Company contact phone number"
    )
    email = models.EmailField(
        blank=True,
        help_text="Company contact email address"
    )
    website = models.URLField(
        blank=True,
        help_text="Company website URL"
    )
    tin_number = models.CharField(
        max_length=30, blank=True,
        help_text="GRA Tax Identification Number"
    )
    ssnit_number = models.CharField(
        max_length=30, blank=True,
        help_text="Employer SSNIT registration number"
    )
    logo = models.ImageField(
        upload_to="business_logos/", null=True, blank=True,
        help_text="Company logo (optional, for PDF headers)"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business Profile"
        verbose_name_plural = "Business Profile"

    def __str__(self):
        return self.company_name or "Business Profile"

    @classmethod
    def get_profile(cls):
        """Return the singleton profile, creating it if it doesn't exist."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class PAYETaxBand(models.Model):
    """
    Ghana GRA PAYE progressive tax bands.
    Editable from the Settings UI.
    """

    order = models.PositiveSmallIntegerField(
        unique=True, help_text="Band order (1 = lowest, applied first)"
    )
    annual_limit = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        help_text="Upper annual income limit for this band. Leave blank for the top (unlimited) band."
    )
    rate = models.DecimalField(
        max_digits=5, decimal_places=4,
        help_text="Tax rate as decimal (e.g. 0.175 for 17.5%)"
    )
    description = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        limit = f"GHS {self.annual_limit:,.2f}" if self.annual_limit else "Above"
        return f"Band {self.order}: {limit} @ {float(self.rate)*100:.1f}%"

    @property
    def rate_percent(self):
        return float(self.rate) * 100


class SalaryStructure(models.Model):
    """
    Defines the basic salary for an employee.
    Multiple records allowed per employee; only one is active at a time.
    """

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="salary_structures",
    )
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    effective_date = models.DateField()
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-effective_date"]

    def __str__(self):
        return f"{self.employee.full_name} — GHS {self.basic_salary} (from {self.effective_date})"

    def save(self, *args, **kwargs):
        # Deactivate other salary structures for this employee when activating a new one
        if self.is_active:
            SalaryStructure.objects.filter(
                employee=self.employee, is_active=True
            ).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)


class AllowanceType(models.Model):
    """
    Defines a type of allowance (e.g. Housing, Transport, Medical).
    """

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_taxable = models.BooleanField(
        default=False,
        help_text="Whether this allowance is included in taxable income",
    )
    is_fixed = models.BooleanField(
        default=True,
        help_text="Fixed amount vs percentage of basic salary",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class EmployeeAllowance(models.Model):
    """
    Assigns an allowance type to a specific employee with an amount.
    """

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="allowances",
    )
    allowance_type = models.ForeignKey(
        AllowanceType,
        on_delete=models.PROTECT,
        related_name="employee_allowances",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_active = models.BooleanField(default=True)
    effective_date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["employee", "allowance_type"]

    def __str__(self):
        return f"{self.employee.full_name} — {self.allowance_type.name}: GHS {self.amount}"


class OvertimeRate(models.Model):
    """
    Defines overtime rate multipliers (e.g. 1.5x for weekday OT, 2x for public holidays).
    """

    name = models.CharField(max_length=100, unique=True)
    multiplier = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        help_text="e.g. 1.5 means 150% of hourly rate",
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.multiplier}x)"
