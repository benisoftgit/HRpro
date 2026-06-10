"""Leave management models."""

from django.db import models


class LeaveType(models.Model):
    """Defines a category of leave (Annual, Sick, Maternity, etc.)."""

    name = models.CharField(max_length=100, unique=True)
    days_allowed = models.PositiveIntegerField(
        help_text="Maximum days allowed per year"
    )
    is_paid = models.BooleanField(default=True)
    description = models.TextField(blank=True)
    requires_documentation = models.BooleanField(
        default=False,
        help_text="Whether supporting documents are required",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.days_allowed} days)"


class LeaveBalance(models.Model):
    """Tracks leave balance for an employee per leave type per year."""

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name="balances",
    )
    year = models.PositiveIntegerField()
    total_days = models.PositiveIntegerField()
    used_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    carried_over = models.DecimalField(
        max_digits=5, decimal_places=1, default=0,
        help_text="Days carried over from previous year"
    )

    class Meta:
        unique_together = ["employee", "leave_type", "year"]
        ordering = ["-year", "employee"]

    def __str__(self):
        return (
            f"{self.employee.full_name} — {self.leave_type.name} "
            f"({self.year}): {self.remaining_days} days remaining"
        )

    @property
    def remaining_days(self):
        return self.total_days + float(self.carried_over) - float(self.used_days)


class LeaveRequest(models.Model):
    """An employee's request for leave with multi-stage approval."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        MANAGER_APPROVED = "MANAGER_APPROVED", "Manager Approved"
        HR_AUTHORIZED = "HR_AUTHORIZED", "HR Authorized"
        MD_AUTHORIZED = "MD_AUTHORIZED", "MD Authorized"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name="requests",
    )
    start_date = models.DateField()
    end_date = models.DateField()
    days_requested = models.DecimalField(max_digits=5, decimal_places=1)
    reason = models.TextField()

    # Stage 1: Manager approval (compulsory)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    manager_approved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="leave_manager_approvals",
    )
    manager_approved_at = models.DateTimeField(null=True, blank=True)

    # Stage 2: HR authorization (compulsory)
    hr_authorized_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="leave_hr_authorizations",
    )
    hr_authorized_at = models.DateTimeField(null=True, blank=True)

    # Stage 3: MD final authorization (optional)
    md_authorized_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="leave_md_authorizations",
    )
    md_authorized_at = models.DateTimeField(null=True, blank=True)

    # Rejection info
    rejected_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="leave_rejections",
    )
    rejection_reason = models.TextField(blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)

    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-applied_at"]

    def __str__(self):
        return (
            f"{self.employee.full_name} — {self.leave_type.name} "
            f"({self.start_date} to {self.end_date}) [{self.status}]"
        )

    @property
    def stage_label(self):
        labels = {
            "PENDING": "Awaiting Manager",
            "MANAGER_APPROVED": "Awaiting HR",
            "HR_AUTHORIZED": "Awaiting MD",
            "MD_AUTHORIZED": "Approved",
            "REJECTED": "Rejected",
            "CANCELLED": "Cancelled",
        }
        return labels.get(self.status, self.status)

    def approve_by_manager(self, user):
        self.status = self.Status.MANAGER_APPROVED
        self.manager_approved_by = user
        self.manager_approved_at = now()
        self.save()

    def authorize_by_hr(self, user):
        """HR marks as authorized; deducts leave balance."""
        self.status = self.Status.HR_AUTHORIZED
        self.hr_authorized_by = user
        self.hr_authorized_at = now()
        self.save()

        year = self.start_date.year
        balance, _ = LeaveBalance.objects.get_or_create(
            employee=self.employee,
            leave_type=self.leave_type,
            year=year,
            defaults={"total_days": self.leave_type.days_allowed},
        )
        balance.used_days = float(balance.used_days) + float(self.days_requested)
        balance.save()

    def authorize_by_md(self, user):
        self.status = self.Status.MD_AUTHORIZED
        self.md_authorized_by = user
        self.md_authorized_at = now()
        self.save()

    def reject(self, user, reason=""):
        self.status = self.Status.REJECTED
        self.rejected_by = user
        self.rejection_reason = reason
        self.rejected_at = now()
        self.save()


def now():
    from django.utils import timezone
    return timezone.now()
