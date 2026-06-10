"""Performance Management models.

Hierarchy:
  ReviewCycle  →  PerformanceReview  →  KPI  →  KPIAchievement
                                     →  ReviewComment
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class ReviewCycle(models.Model):
    """
    A named review period (e.g. 'Q1 2026', 'Annual 2025').
    All reviews and KPIs are scoped to a cycle.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        ACTIVE = "ACTIVE", "Active"
        CLOSED = "CLOSED", "Closed"

    name = models.CharField(max_length=150, unique=True)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_cycles",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.name} [{self.status}]"


class PerformanceReview(models.Model):
    """
    One review record per employee per cycle.
    Tracks overall rating and submission/approval state.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SELF_REVIEW = "SELF_REVIEW", "Self Review"
        MANAGER_REVIEW = "MANAGER_REVIEW", "Manager Review"
        HR_REVIEW = "HR_REVIEW", "HR Review"
        COMPLETED = "COMPLETED", "Completed"

    class Rating(models.IntegerChoices):
        OUTSTANDING = 5, "Outstanding"
        EXCEEDS = 4, "Exceeds Expectations"
        MEETS = 3, "Meets Expectations"
        BELOW = 2, "Below Expectations"
        UNSATISFACTORY = 1, "Unsatisfactory"

    cycle = models.ForeignKey(
        ReviewCycle,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    employee = models.ForeignKey(
        "employees.Employee",
        on_delete=models.CASCADE,
        related_name="performance_reviews",
    )
    reviewer = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews_given",
        help_text="Manager / HR officer conducting the review",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    # Scores — filled at different stages
    self_rating = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Employee self-rating (1-5)",
    )
    manager_rating = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Manager rating (1-5)",
    )
    final_rating = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Final agreed rating (1-5)",
    )

    # Narrative fields
    self_comments = models.TextField(blank=True, help_text="Employee's self-assessment narrative")
    manager_comments = models.TextField(blank=True, help_text="Manager's overall comments")
    hr_comments = models.TextField(blank=True, help_text="HR observations / notes")
    development_plan = models.TextField(blank=True, help_text="Agreed development actions")
    strengths = models.TextField(blank=True)
    areas_for_improvement = models.TextField(blank=True)

    submitted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["cycle", "employee"]

    def __str__(self):
        return f"{self.employee.full_name} — {self.cycle.name} [{self.status}]"

    @property
    def kpi_score(self):
        """Average weighted KPI achievement score (0-100)."""
        kpis = self.kpis.all()
        if not kpis:
            return None
        total_weight = sum(k.weight for k in kpis)
        if total_weight == 0:
            return None
        weighted = sum(
            (k.achievement_score or 0) * k.weight for k in kpis
        )
        return round(weighted / total_weight, 1)


class KPI(models.Model):
    """
    A Key Performance Indicator / Key Result Area linked to a review.
    Each KPI has a target, actual result, and a computed achievement score.
    """

    class Category(models.TextChoices):
        FINANCIAL = "FINANCIAL", "Financial"
        CUSTOMER = "CUSTOMER", "Customer"
        INTERNAL = "INTERNAL", "Internal Process"
        LEARNING = "LEARNING", "Learning & Growth"
        OPERATIONAL = "OPERATIONAL", "Operational"
        OTHER = "OTHER", "Other"

    review = models.ForeignKey(
        PerformanceReview,
        on_delete=models.CASCADE,
        related_name="kpis",
    )
    title = models.CharField(max_length=200, help_text="KPI / KRA title")
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20, choices=Category.choices, default=Category.OTHER
    )
    weight = models.DecimalField(
        max_digits=5, decimal_places=2, default=1,
        validators=[MinValueValidator(0)],
        help_text="Relative weight of this KPI (e.g. 20 means 20%)",
    )
    target = models.TextField(help_text="What success looks like / target value")
    target_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Numeric target (optional, for measurable KPIs)",
    )
    actual_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Actual result achieved",
    )
    achievement_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Score 0-100 for this KPI",
    )
    comments = models.TextField(blank=True, help_text="Notes on how this KPI was assessed")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category", "title"]

    def __str__(self):
        return f"{self.title} ({self.review.employee.full_name})"

    def save(self, *args, **kwargs):
        """Auto-compute achievement_score from actual vs target values if both present."""
        if (
            self.target_value is not None
            and self.actual_value is not None
            and float(self.target_value) > 0
            and self.achievement_score is None
        ):
            score = (float(self.actual_value) / float(self.target_value)) * 100
            self.achievement_score = min(round(score, 2), 100)
        super().save(*args, **kwargs)


class ReviewComment(models.Model):
    """Threaded comments on a performance review (for discussion trail)."""

    review = models.ForeignKey(
        PerformanceReview,
        on_delete=models.CASCADE,
        related_name="comments",
    )
    author = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="review_comments",
    )
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author} on {self.review}"
