"""Attendance models."""

from datetime import datetime, timedelta

from django.db import models
from django.utils.timezone import localdate


class AttendanceRecord(models.Model):
    """Daily attendance record for an employee."""

    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        LATE = "LATE", "Late"
        HALF_DAY = "HALF_DAY", "Half Day"
        HOLIDAY = "HOLIDAY", "Public Holiday"
        WEEKEND = "WEEKEND", "Weekend"

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    date = models.DateField()
    clock_in = models.TimeField(null=True, blank=True)
    clock_out = models.TimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PRESENT
    )
    late_minutes = models.PositiveIntegerField(
        default=0,
        help_text="Minutes arrived late (from import: Late column HH:MM → total minutes)",
    )
    early_minutes = models.PositiveIntegerField(
        default=0,
        help_text="Minutes left early (from import: Early column HH:MM → total minutes)",
    )
    overtime_hours = models.DecimalField(
        max_digits=4, decimal_places=2, default=0,
        help_text="Overtime hours worked on this day"
    )
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_attendance",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "employee"]
        unique_together = ["employee", "date"]

    def __str__(self):
        return f"{self.employee.full_name} — {self.date} ({self.status})"

    @property
    def hours_worked(self):
        """Calculate hours worked from clock_in and clock_out (handles cross-midnight shifts)."""
        if self.clock_in and self.clock_out:
            today = localdate()
            dt_in = datetime.combine(today, self.clock_in)
            dt_out = datetime.combine(today, self.clock_out)
            if dt_out <= dt_in:
                dt_out += timedelta(days=1)
            delta = dt_out - dt_in
            return round(delta.total_seconds() / 3600, 2)
        return 0
