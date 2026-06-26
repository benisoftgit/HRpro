"""Departments serializers."""

from rest_framework import serializers
from .models import Department, Position


class PositionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Position
        fields = [
            "id",
            "title",
            "grade",
            "basic_salary",
            "regular_ot_rate",
            "holiday_ot_rate",
            "description",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class PositionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdowns."""

    class Meta:
        model = Position
        fields = ["id", "title"]


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.SerializerMethodField()
    employee_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "code",
            "description",
            "head",
            "head_name",
            "employee_count",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_head_name(self, obj):
        if obj.head:
            return obj.head.full_name
        return None

    def get_employee_count(self, obj):
        return obj.employees.filter(employment_status="ACTIVE").count()


class DepartmentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdowns."""

    class Meta:
        model = Department
        fields = ["id", "name", "code"]
