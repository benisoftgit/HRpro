"""Performance Management serializers."""

from rest_framework import serializers
from .models import ReviewCycle, PerformanceReview, KPI, ReviewComment


class ReviewCycleSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    review_count = serializers.SerializerMethodField()

    class Meta:
        model = ReviewCycle
        fields = [
            "id", "name", "description", "start_date", "end_date",
            "status", "created_by", "created_by_name", "review_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def get_review_count(self, obj):
        return obj.reviews.count()

    def validate(self, attrs):
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        if start and end and end <= start:
            raise serializers.ValidationError(
                {"end_date": "End date must be after start date."}
            )
        return attrs


class KPISerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )

    class Meta:
        model = KPI
        fields = [
            "id", "review", "title", "description", "category", "category_display",
            "weight", "target", "target_value", "actual_value",
            "achievement_score", "comments", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_weight(self, value):
        if value < 0:
            raise serializers.ValidationError("Weight must be non-negative.")
        return value


class ReviewCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(
        source="author.get_full_name", read_only=True
    )

    class Meta:
        model = ReviewComment
        fields = ["id", "review", "author", "author_name", "comment", "created_at"]
        read_only_fields = ["id", "author", "created_at"]


class PerformanceReviewListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    employee_name = serializers.CharField(
        source="employee.full_name", read_only=True
    )
    employee_id_code = serializers.CharField(
        source="employee.employee_id", read_only=True
    )
    department_name = serializers.CharField(
        source="employee.department.name", read_only=True
    )
    cycle_name = serializers.CharField(source="cycle.name", read_only=True)
    reviewer_name = serializers.CharField(
        source="reviewer.get_full_name", read_only=True
    )
    kpi_score = serializers.FloatField(read_only=True)
    kpi_count = serializers.SerializerMethodField()

    class Meta:
        model = PerformanceReview
        fields = [
            "id", "cycle", "cycle_name", "employee", "employee_name",
            "employee_id_code", "department_name", "reviewer", "reviewer_name",
            "status", "self_rating", "manager_rating", "final_rating",
            "kpi_score", "kpi_count", "submitted_at", "completed_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_kpi_count(self, obj):
        return obj.kpis.count()


class PerformanceReviewDetailSerializer(serializers.ModelSerializer):
    """Full serializer including nested KPIs and comments."""
    employee_name = serializers.CharField(
        source="employee.full_name", read_only=True
    )
    employee_id_code = serializers.CharField(
        source="employee.employee_id", read_only=True
    )
    department_name = serializers.CharField(
        source="employee.department.name", read_only=True
    )
    position_title = serializers.CharField(
        source="employee.position.title", read_only=True
    )
    cycle_name = serializers.CharField(source="cycle.name", read_only=True)
    reviewer_name = serializers.CharField(
        source="reviewer.get_full_name", read_only=True
    )
    kpi_score = serializers.FloatField(read_only=True)
    kpis = KPISerializer(many=True, read_only=True)
    comments = ReviewCommentSerializer(many=True, read_only=True)

    class Meta:
        model = PerformanceReview
        fields = [
            "id", "cycle", "cycle_name",
            "employee", "employee_name", "employee_id_code",
            "department_name", "position_title",
            "reviewer", "reviewer_name",
            "status",
            "self_rating", "self_comments",
            "manager_rating", "manager_comments",
            "final_rating", "hr_comments",
            "development_plan", "strengths", "areas_for_improvement",
            "kpi_score", "kpis", "comments",
            "submitted_at", "completed_at",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "kpi_score", "submitted_at", "completed_at",
            "created_at", "updated_at",
        ]
