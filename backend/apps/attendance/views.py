"""Attendance views."""

import csv
import io
from decimal import Decimal
from datetime import date, datetime
from rest_framework import generics, filters, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction

from .models import AttendanceRecord
from .serializers import AttendanceRecordSerializer, AttendanceSummarySerializer
from apps.accounts.permissions import IsAdminOrHR, IsAdminHROrFinance
from apps.employees.models import Employee


class AttendanceListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/attendance/       — List attendance records
    POST /api/attendance/       — Create attendance record
    """

    serializer_class = AttendanceRecordSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["employee", "date", "status"]
    ordering_fields = ["date", "employee"]
    ordering = ["-date"]

    def get_queryset(self):
        user = self.request.user
        qs = AttendanceRecord.objects.select_related("employee").all()
        # Employees can only see their own records
        if user.role == "EMPLOYEE" and user.employee:
            qs = qs.filter(employee=user.employee)
        return qs

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class AttendanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = AttendanceRecord.objects.all()
    serializer_class = AttendanceRecordSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]


class AttendanceSummaryView(APIView):
    """
    GET /api/attendance/summary/?month=1&year=2024
    Returns attendance summary for all employees for a given month.
    """

    permission_classes = [IsAdminHROrFinance]

    def get(self, request):
        month = int(request.query_params.get("month", date.today().month))
        year = int(request.query_params.get("year", date.today().year))

        records = AttendanceRecord.objects.filter(
            date__month=month, date__year=year
        ).select_related("employee")

        # Group by employee
        from collections import defaultdict
        summary = defaultdict(lambda: {
            "present": 0, "absent": 0, "late": 0, "half_day": 0,
            "total_overtime_hours": 0, "total_days": 0,
        })

        for record in records:
            emp_key = record.employee.employee_id
            summary[emp_key]["employee_name"] = record.employee.full_name
            summary[emp_key]["employee_id"] = emp_key
            summary[emp_key]["total_days"] += 1
            status_key = record.status.lower()
            if status_key in summary[emp_key]:
                summary[emp_key][status_key] += 1
            summary[emp_key]["total_overtime_hours"] += float(record.overtime_hours)

        return Response(list(summary.values()))


def _parse_hhmm_to_minutes(value):
    """Convert 'HH:MM' string to total minutes. Returns 0 for empty/invalid."""
    if not value or not value.strip():
        return 0
    try:
        parts = value.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except (IndexError, ValueError):
        return 0


def _parse_time(value):
    """Parse 'HH:MM' time string to datetime.time. Returns None if empty."""
    if not value or not value.strip():
        return None
    try:
        return datetime.strptime(value.strip(), "%H:%M").time()
    except ValueError:
        return None


def _parse_date(value):
    """Parse date strings like '2/3/2026' or '2026-02-03'."""
    if not value or not value.strip():
        return None
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


class AttendanceImportView(APIView):
    """
    POST /api/attendance/import/
    Upload a CSV attendance report (matching the TSEL ATT report format).

    Expected CSV columns (case-insensitive, order flexible):
        Badge No. | Name | Date | Clock In | Clock Out | Late | Early | Absent | Work Time

    - Employees are looked up by Badge No. → EMP{badge:03d} (e.g. badge 1 → EMP001).
    - Rows where the employee is not found are collected in `skipped`.
    - Existing records for the same (employee, date) are updated (upsert).
    - Returns a summary: created, updated, skipped counts plus any row-level errors.
    """

    permission_classes = [IsAdminOrHR]
    parser_classes = [MultiPartParser, FormParser]

    # Map flexible column name variants to canonical keys
    COLUMN_MAP = {
        "badge no.": "badge", "badge no": "badge", "badge": "badge",
        "name": "name",
        "date": "date",
        "clock in": "clock_in", "clockin": "clock_in",
        "clock out": "clock_out", "clockout": "clock_out",
        "late": "late",
        "early": "early",
        "absent": "absent",
        "work time": "work_time", "worktime": "work_time",
        "overtime": "overtime", "ot hours": "overtime", "ot": "overtime",
    }

    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"detail": "No file provided. Send a CSV file as 'file' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Accept CSV or treat as text
        try:
            content = file_obj.read().decode("utf-8-sig")  # strip BOM if present
        except UnicodeDecodeError:
            content = file_obj.read().decode("latin-1")

        reader = csv.DictReader(io.StringIO(content))

        # Normalise header names
        if not reader.fieldnames:
            return Response(
                {"detail": "File appears empty or has no headers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalised_fields = {
            f.strip().lower(): f for f in reader.fieldnames
        }
        col = {}
        for norm_key, canonical in self.COLUMN_MAP.items():
            if norm_key in normalised_fields:
                col[canonical] = normalised_fields[norm_key]

        if "badge" not in col or "date" not in col:
            return Response(
                {
                    "detail": (
                        "Could not find required columns 'Badge No.' and 'Date'. "
                        f"Headers found: {list(reader.fieldnames)}"
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build badge → Employee lookup cache
        employee_cache = {}
        for emp in Employee.objects.filter(employment_status="ACTIVE"):
            try:
                badge_num = int(emp.employee_id.replace("EMP", ""))
                employee_cache[badge_num] = emp
            except (ValueError, AttributeError):
                pass

        created = 0
        updated = 0
        skipped = []
        errors = []

        rows = list(reader)

        with transaction.atomic():
            for row_num, row in enumerate(rows, start=2):  # row 1 = header
                badge_raw = row.get(col.get("badge", ""), "").strip()
                date_raw = row.get(col.get("date", ""), "").strip()

                if not badge_raw or not date_raw:
                    continue  # blank rows between employee sections

                # Parse badge number
                try:
                    badge_int = int(float(badge_raw))
                except (ValueError, TypeError):
                    errors.append({"row": row_num, "reason": f"Invalid badge: '{badge_raw}'"})
                    continue

                employee = employee_cache.get(badge_int)
                if not employee:
                    skipped.append({
                        "row": row_num,
                        "badge": badge_int,
                        "name": row.get(col.get("name", ""), ""),
                        "reason": "No active employee found with this badge number.",
                    })
                    continue

                record_date = _parse_date(date_raw)
                if not record_date:
                    errors.append({"row": row_num, "reason": f"Cannot parse date: '{date_raw}'"})
                    continue

                # Determine absent flag
                absent_raw = row.get(col.get("absent", ""), "").strip().lower()
                is_absent = absent_raw == "absent"

                clock_in = _parse_time(row.get(col.get("clock_in", ""), ""))
                clock_out = _parse_time(row.get(col.get("clock_out", ""), ""))
                late_minutes = _parse_hhmm_to_minutes(row.get(col.get("late", ""), ""))
                early_minutes = _parse_hhmm_to_minutes(row.get(col.get("early", ""), ""))
                overtime_raw = row.get(col.get("overtime", ""), "").strip()
                overtime = Decimal(overtime_raw) if overtime_raw else Decimal("0.00")

                # Derive status
                if is_absent:
                    rec_status = AttendanceRecord.Status.ABSENT
                elif late_minutes > 0:
                    rec_status = AttendanceRecord.Status.LATE
                else:
                    rec_status = AttendanceRecord.Status.PRESENT

                defaults = {
                    "clock_in": clock_in,
                    "clock_out": clock_out,
                    "status": rec_status,
                    "late_minutes": late_minutes,
                    "early_minutes": early_minutes,
                    "overtime_hours": overtime,
                    "recorded_by": request.user,
                }

                _, is_new = AttendanceRecord.objects.update_or_create(
                    employee=employee,
                    date=record_date,
                    defaults=defaults,
                )
                if is_new:
                    created += 1
                else:
                    updated += 1

        return Response(
            {
                "detail": f"Import complete. {created} created, {updated} updated, {len(skipped)} skipped.",
                "created": created,
                "updated": updated,
                "skipped_count": len(skipped),
                "skipped": skipped[:50],   # cap to avoid huge responses
                "errors": errors[:50],
            },
            status=status.HTTP_200_OK,
        )
