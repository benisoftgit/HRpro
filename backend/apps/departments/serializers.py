"""Departments serializers."""

from rest_framework import serializers
from .models import Department, Position


class PositionSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.name", read_only=True)

    class Meta:
        model = Position
        fields = [
            "id",
            "title",
            "department",
            "department_name",
            "grade",
            "basic_salary",
            "description",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class DepartmentSerializer(serializers.ModelSerializer):
    positions = PositionSerializer(many=True, read_only=True)
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
            "positions",
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
