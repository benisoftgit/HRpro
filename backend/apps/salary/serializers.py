"""Salary serializers."""

from rest_framework import serializers
from .models import SalaryStructure, AllowanceType, EmployeeAllowance, OvertimeRate, PayrollSettings, PAYETaxBand, BusinessProfile


class SalaryStructureSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_id = serializers.CharField(source="employee.employee_id", read_only=True)

    class Meta:
        model = SalaryStructure
        fields = [
            "id",
            "employee",
            "employee_name",
            "employee_id",
            "basic_salary",
            "effective_date",
            "is_active",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AllowanceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AllowanceType
        fields = ["id", "name", "description", "is_taxable", "is_fixed", "created_at"]
        read_only_fields = ["id", "created_at"]


class EmployeeAllowanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    allowance_name = serializers.CharField(source="allowance_type.name", read_only=True)
    is_taxable = serializers.BooleanField(source="allowance_type.is_taxable", read_only=True)

    class Meta:
        model = EmployeeAllowance
        fields = [
            "id",
            "employee",
            "employee_name",
            "allowance_type",
            "allowance_name",
            "is_taxable",
            "amount",
            "is_active",
            "effective_date",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class OvertimeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OvertimeRate
        fields = ["id", "name", "multiplier", "description", "is_active"]
        read_only_fields = ["id"]


class PayrollSettingsSerializer(serializers.ModelSerializer):
    ssnit_employee_percent = serializers.SerializerMethodField()
    ssnit_employer_percent = serializers.SerializerMethodField()
    tier2_employer_percent = serializers.SerializerMethodField()
    tier3_employee_percent = serializers.SerializerMethodField()
    tier3_employer_percent = serializers.SerializerMethodField()

    class Meta:
        model = PayrollSettings
        fields = [
            "id",
            "ssnit_employee_rate", "ssnit_employee_percent",
            "ssnit_employer_rate", "ssnit_employer_percent",
            "tier2_employer_rate", "tier2_employer_percent",
            "tier3_employee_rate", "tier3_employee_percent",
            "tier3_employer_rate", "tier3_employer_percent",
            "working_days_per_month",
            "working_hours_per_day",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]

    def get_ssnit_employee_percent(self, obj):
        return float(obj.ssnit_employee_rate) * 100

    def get_ssnit_employer_percent(self, obj):
        return float(obj.ssnit_employer_rate) * 100

    def get_tier2_employer_percent(self, obj):
        return float(obj.tier2_employer_rate) * 100

    def get_tier3_employee_percent(self, obj):
        return float(obj.tier3_employee_rate) * 100

    def get_tier3_employer_percent(self, obj):
        return float(obj.tier3_employer_rate) * 100


class BusinessProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessProfile
        fields = [
            "id", "company_name", "address", "phone", "email",
            "website", "tin_number", "ssnit_number", "logo", "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]


class PAYETaxBandSerializer(serializers.ModelSerializer):
    rate_percent = serializers.FloatField(read_only=True)

    class Meta:
        model = PAYETaxBand
        fields = ["id", "order", "annual_limit", "rate", "rate_percent", "description"]
        read_only_fields = ["id", "rate_percent"]
