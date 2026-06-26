"""Departments and Positions models."""

from django.db import models


class Department(models.Model):
    """Organisational department."""

    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    head = models.ForeignKey(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="headed_departments",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Position(models.Model):
    """Job position (company-wide, not tied to a department)."""

    title = models.CharField(max_length=100, unique=True)
    grade = models.CharField(max_length=20, blank=True, help_text="e.g. Grade 5, Level 3")
    basic_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=(
            "Default basic salary for this position. "
            "Used as payroll fallback when an employee has no individual salary structure."
        ),
    )
    regular_ot_rate = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Hourly rate for regular overtime (1.5x). If blank, calculated as basic_salary / 176."
    )
    holiday_ot_rate = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Hourly rate for holiday overtime (2.0x). If blank, calculated as basic_salary / 176."
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["title"]

    def __str__(self):
        return self.title
