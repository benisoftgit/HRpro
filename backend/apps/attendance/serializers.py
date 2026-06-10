"""Attendance serializers."""

from rest_framework import serializers
from .models import AttendanceRecord


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.full_name", read_only=True)
    employee_id = serializers.CharField(source="employee.employee_id", read_only=True)
    hours_worked = serializers.FloatField(read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "employee",
            "employee_name",
            "employee_id",
            "date",
            "clock_in",
            "clock_out",
            "hours_worked",
            "status",
            "late_minutes",
            "early_minutes",
            "overtime_hours",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "hours_worked"]

    def validate(self, attrs):
        # Check for duplicate (employee, date) record
        employee = attrs.get("employee")
        date = attrs.get("date")
        if employee and date:
            instance = self.instance
            qs = AttendanceRecord.objects.filter(employee=employee, date=date)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    f"An attendance record already exists for this employee on {date}."
                )
        return attrs


class AttendanceSummarySerializer(serializers.Serializer):
    """Summary of attendance for a given period."""

    employee_id = serializers.CharField()
    employee_name = serializers.CharField()
    total_days = serializers.IntegerField()
    present = serializers.IntegerField()
    absent = serializers.IntegerField()
    late = serializers.IntegerField()
    half_day = serializers.IntegerField()
    total_overtime_hours = serializers.FloatField()
