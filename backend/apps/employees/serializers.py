"""Employee serializers."""

from rest_framework import serializers
from .models import Employee


class EmployeeListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views and dropdowns."""

    department_name = serializers.CharField(source="department.name", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True)

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_id",
            "first_name",
            "last_name",
            "full_name",
            "department",
            "department_name",
            "position",
            "position_title",
            "employment_status",
            "employment_type",
            "profile_picture",
        ]
        read_only_fields = ["id", "employee_id", "full_name"]


class EmployeeSerializer(serializers.ModelSerializer):
    """Full employee serializer for create/update/detail."""

    department_name = serializers.CharField(source="department.name", read_only=True)
    position_title = serializers.CharField(source="position.title", read_only=True)
    full_name = serializers.CharField(read_only=True)
    age = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = [
            "id",
            "employee_id",
            # Personal
            "first_name",
            "last_name",
            "other_name",
            "full_name",
            "date_of_birth",
            "age",
            "gender",
            "national_id",
            "phone",
            "personal_email",
            "address",
            "profile_picture",
            # Employment
            "department",
            "department_name",
            "position",
            "position_title",
            "employment_type",
            "employment_status",
            "date_joined",
            "date_terminated",
            # Banking
            "bank_name",
            "bank_account_number",
            "bank_branch",
            # Statutory
            "ssnit_number",
            "tin_number",
            # Emergency
            "emergency_contact_name",
            "emergency_contact_phone",
            "emergency_contact_relationship",
            # Meta
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "employee_id", "full_name", "created_at", "updated_at"]

    def get_age(self, obj):
        from datetime import date
        today = date.today()
        dob = obj.date_of_birth
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
