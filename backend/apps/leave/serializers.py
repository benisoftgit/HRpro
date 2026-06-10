"""Leave serializers."""

from rest_framework import serializers
from .models import LeaveType, LeaveBalance, LeaveRequest


class LeaveTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaveType
        fields = [
            "id",
            "name",
            "days_allowed",
            "is_paid",
            "description",
            "requires_documentation",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class LeaveBalanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    remaining_days = serializers.FloatField(read_only=True)

    class Meta:
        model = LeaveBalance
        fields = [
            "id",
            "employee",
            "employee_name",
            "leave_type",
            "leave_type_name",
            "year",
            "total_days",
            "used_days",
            "carried_over",
            "remaining_days",
        ]
        read_only_fields = ["id", "remaining_days"]


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_id_code = serializers.CharField(source="employee.employee_id", read_only=True)
    leave_type_name = serializers.CharField(source="leave_type.name", read_only=True)
    stage_label = serializers.CharField(read_only=True)
    manager_approved_by_name = serializers.SerializerMethodField()
    hr_authorized_by_name = serializers.SerializerMethodField()
    md_authorized_by_name = serializers.SerializerMethodField()
    rejected_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "employee",
            "employee_name",
            "employee_id_code",
            "leave_type",
            "leave_type_name",
            "start_date",
            "end_date",
            "days_requested",
            "reason",
            "status",
            "stage_label",
            "manager_approved_by",
            "manager_approved_by_name",
            "manager_approved_at",
            "hr_authorized_by",
            "hr_authorized_by_name",
            "hr_authorized_at",
            "md_authorized_by",
            "md_authorized_by_name",
            "md_authorized_at",
            "rejected_by",
            "rejected_by_name",
            "rejection_reason",
            "rejected_at",
            "applied_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "status",
            "stage_label",
            "manager_approved_by",
            "manager_approved_by_name",
            "manager_approved_at",
            "hr_authorized_by",
            "hr_authorized_by_name",
            "hr_authorized_at",
            "md_authorized_by",
            "md_authorized_by_name",
            "md_authorized_at",
            "rejected_by",
            "rejected_by_name",
            "rejection_reason",
            "rejected_at",
            "applied_at",
            "updated_at",
        ]
        extra_kwargs = {
            "employee": {"required": False},
        }

    def get_manager_approved_by_name(self, obj):
        return obj.manager_approved_by.get_full_name() if obj.manager_approved_by else None

    def get_hr_authorized_by_name(self, obj):
        return obj.hr_authorized_by.get_full_name() if obj.hr_authorized_by else None

    def get_md_authorized_by_name(self, obj):
        return obj.md_authorized_by.get_full_name() if obj.md_authorized_by else None

    def get_rejected_by_name(self, obj):
        return obj.rejected_by.get_full_name() if obj.rejected_by else None

    def validate(self, attrs):
        start = attrs.get("start_date")
        end = attrs.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError(
                {"end_date": "End date must be on or after start date."}
            )
        return attrs


class LeaveApprovalSerializer(serializers.Serializer):
    """Used for multi-stage approve/reject actions."""

    action = serializers.ChoiceField(
        choices=["manager_approve", "hr_authorize", "md_authorize", "reject"]
    )
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
