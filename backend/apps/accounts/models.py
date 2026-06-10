"""Accounts models — Custom User with role-based access."""

from django.contrib.auth.models import AbstractUser
from django.db import models


class PasswordResetRequest(models.Model):
    """Tracks employee requests for admin-approved password resets."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    user = models.ForeignKey(
        "accounts.User", on_delete=models.CASCADE, related_name="password_resets"
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="resolved_resets",
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-requested_at"]

    def __str__(self):
        return f"Reset for {self.user.email} — {self.status}"


class User(AbstractUser):
    """
    Custom user model extending AbstractUser.
    Uses email as the primary login identifier.
    """

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Admin"
        HR = "HR", "HR Manager"
        FINANCE = "FINANCE", "Finance Officer"
        MANAGER = "MANAGER", "Line Manager"
        MD = "MD", "Managing Director"
        EMPLOYEE = "EMPLOYEE", "Employee"

    # Override username to allow blank (we use email)
    username = models.CharField(max_length=150, unique=True, blank=True)
    email = models.EmailField(unique=True)

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.EMPLOYEE,
    )
    phone = models.CharField(max_length=20, blank=True)
    profile_picture = models.ImageField(
        upload_to="profile_pictures/", null=True, blank=True
    )
    # Linked to Employee profile (set after employee is created)
    employee = models.OneToOneField(
        "employees.Employee",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="user_account",
    )

    # Admin approval for new self-registered accounts
    is_approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_users",
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "first_name", "last_name"]

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["email"]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def save(self, *args, **kwargs):
        # Auto-set username from email if not provided
        if not self.username:
            self.username = self.email.split("@")[0]
        super().save(*args, **kwargs)

    @property
    def is_admin(self):
        return self.role == self.Role.ADMIN

    @property
    def is_hr(self):
        return self.role == self.Role.HR

    @property
    def is_finance(self):
        return self.role == self.Role.FINANCE

    @property
    def is_employee(self):
        return self.role == self.Role.EMPLOYEE
