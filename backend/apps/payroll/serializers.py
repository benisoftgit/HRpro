"""Payroll serializers."""

import calendar
from rest_framework import serializers
from .models import PayrollRun, Payslip, PayrollRunAdjustment


class PayslipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_id_code = serializers.CharField(source="employee.employee_id", read_only=True)
    employee_email = serializers.CharField(source="employee.personal_email", read_only=True)
    employee_phone = serializers.CharField(source="employee.phone", read_only=True)
    department = serializers.CharField(source="employee.department.name", read_only=True)
    position = serializers.CharField(source="employee.position.title", read_only=True)

    class Meta:
        model = Payslip
        fields = [
            "id",
            "payroll_run",
            "employee",
            "employee_name",
            "employee_id_code",
            "employee_email",
            "employee_phone",
            "department",
            "position",
            # Earnings
            "basic_salary",
            "total_allowances",
            "overtime_amount",
            "gross_salary",
            # Statutory
            "ssnit_employee",
            "ssnit_employer",
            "tier2_employee",
            "tier2_employer",
            "tier3_employee",
            "tier3_employer",
            # Tax
            "taxable_income",
            "paye_tax",
            # Deductions
            "loan_deduction",
            "other_deductions",
            "total_deductions",
            # Net
            "net_salary",
            # Meta
            "status",
            "email_sent",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class PayrollRunSerializer(serializers.ModelSerializer):
    month_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    payslip_count = serializers.SerializerMethodField()
    total_gross = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_net = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_paye = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_ssnit_employee = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_ssnit_employer = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = PayrollRun
        fields = [
            "id",
            "month",
            "month_name",
            "year",
            "status",
            "calculation_mode",
            "notes",
            "created_by",
            "created_by_name",
            "payslip_count",
            "total_gross",
            "total_net",
            "total_paye",
            "total_ssnit_employee",
            "total_ssnit_employer",
            "created_at",
            "processed_at",
        ]
        read_only_fields = ["id", "created_at", "processed_at"]

    def get_month_name(self, obj):
        return calendar.month_name[obj.month]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name()
        return None

    def get_payslip_count(self, obj):
        return obj.payslips.count()


class PayrollRunDetailSerializer(PayrollRunSerializer):
    """Includes full payslip list."""

    payslips = PayslipSerializer(many=True, read_only=True)

    class Meta(PayrollRunSerializer.Meta):
        fields = PayrollRunSerializer.Meta.fields + ["payslips"]


class PayrollRunAdjustmentSerializer(serializers.ModelSerializer):
    """Serializer for per-run employee adjustments."""

    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_id_code = serializers.CharField(source="employee.employee_id", read_only=True)
    basic_salary = serializers.SerializerMethodField()
    current_allowances = serializers.SerializerMethodField()

    class Meta:
        model = PayrollRunAdjustment
        fields = [
            "id",
            "payroll_run",
            "employee",
            "employee_name",
            "employee_id_code",
            "basic_salary",
            "current_allowances",
            "regular_ot_hours",
            "holiday_ot_hours",
            "additional_allowance",
            "additional_allowance_label",
        ]
        read_only_fields = ["id", "payroll_run"]

    def get_basic_salary(self, obj):
        from apps.salary.models import SalaryStructure
        ss = SalaryStructure.objects.filter(employee=obj.employee, is_active=True).first()
        if ss:
            return str(ss.basic_salary)
        if obj.employee.position_id and obj.employee.position.basic_salary is not None:
            return str(obj.employee.position.basic_salary)
        return "0.00"

    def get_current_allowances(self, obj):
        from apps.salary.models import EmployeeAllowance
        allowances = EmployeeAllowance.objects.filter(
            employee=obj.employee, is_active=True
        ).select_related("allowance_type")
        return [
            {"name": a.allowance_type.name, "amount": str(a.amount)}
            for a in allowances
        ]
