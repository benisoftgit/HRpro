"""Loan serializers."""

from rest_framework import serializers
from .models import Loan, LoanRepayment


class LoanRepaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = LoanRepayment
        fields = [
            "id",
            "loan",
            "payroll",
            "amount",
            "payment_date",
            "balance_after",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class LoanSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_id_code = serializers.CharField(source="employee.employee_id", read_only=True)
    approved_by_name = serializers.SerializerMethodField()
    total_repayable = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    total_repaid = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    outstanding_balance = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    repayments = LoanRepaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Loan
        fields = [
            "id",
            "employee",
            "employee_name",
            "employee_id_code",
            "loan_type",
            "amount",
            "interest_rate",
            "repayment_months",
            "monthly_deduction",
            "disbursement_date",
            "status",
            "approved_by",
            "approved_by_name",
            "total_repayable",
            "total_repaid",
            "outstanding_balance",
            "notes",
            "repayments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "approved_by",
            "created_at",
            "updated_at",
        ]

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name()
        return None


class LoanApprovalSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=["approve", "reject"])
    disbursement_date = serializers.DateField(required=False)
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
