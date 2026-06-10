"""Employee model — core HR profile for Ghana."""

from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Employee(models.Model):
    """
    Core employee profile.
    Stores personal, employment, banking, and statutory information.
    """

    class Gender(models.TextChoices):
        MALE = "MALE", "Male"
        FEMALE = "FEMALE", "Female"
        OTHER = "OTHER", "Other"

    class EmploymentType(models.TextChoices):
        FULL_TIME = "FULL_TIME", "Full-time"
        PART_TIME = "PART_TIME", "Part-time"
        CONTRACT = "CONTRACT", "Contract"
        INTERN = "INTERN", "Intern"

    class EmploymentStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"
        TERMINATED = "TERMINATED", "Terminated"
        SUSPENDED = "SUSPENDED", "Suspended"
        ON_LEAVE = "ON_LEAVE", "On Leave"

    # Identification
    employee_id = models.CharField(max_length=20, unique=True, editable=False)

    # Personal info
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    other_name = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=Gender.choices)
    national_id = models.CharField(
        max_length=50,
        unique=True,
        help_text="Ghana Card number (GHA-XXXXXXXXX-X)",
    )
    phone = models.CharField(max_length=20)
    personal_email = models.EmailField(blank=True)
    address = models.TextField()
    profile_picture = models.ImageField(
        upload_to="employee_pictures/", null=True, blank=True
    )

    # Employment info
    department = models.ForeignKey(
        "departments.Department",
        on_delete=models.PROTECT,
        related_name="employees",
    )
    position = models.ForeignKey(
        "departments.Position",
        on_delete=models.PROTECT,
        related_name="employees",
    )
    employment_type = models.CharField(
        max_length=20, choices=EmploymentType.choices, default=EmploymentType.FULL_TIME
    )
    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
        default=EmploymentStatus.ACTIVE,
    )
    date_joined = models.DateField()
    date_terminated = models.DateField(null=True, blank=True)

    # Banking details
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_branch = models.CharField(max_length=100, blank=True)

    # Statutory numbers (Ghana)
    ssnit_number = models.CharField(
        max_length=30, blank=True, help_text="SSNIT membership number"
    )
    tin_number = models.CharField(
        max_length=30, blank=True, help_text="GRA Tax Identification Number"
    )

    # Emergency contact
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relationship = models.CharField(max_length=50, blank=True)

    # Reporting line
    manager = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="direct_reports",
        help_text="Direct line manager for this employee",
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["employee_id"]

    def __str__(self):
        return f"{self.employee_id} — {self.full_name}"

    @property
    def full_name(self):
        parts = [self.first_name, self.other_name, self.last_name]
        return " ".join(p for p in parts if p)

    def save(self, *args, **kwargs):
        if not self.employee_id:
            self.employee_id = self._generate_employee_id()
        super().save(*args, **kwargs)

    def _generate_employee_id(self):
        """Generate sequential employee ID like EMP001, EMP002, ..."""
        last = Employee.objects.order_by("id").last()
        if last:
            try:
                num = int(last.employee_id.replace("EMP", "")) + 1
            except (ValueError, AttributeError):
                num = 1
        else:
            num = 1
        return f"EMP{num:03d}"
