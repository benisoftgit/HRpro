"""Employee views."""

import csv
import io
from datetime import datetime

from rest_framework import generics, filters, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend

from .models import Employee
from .serializers import EmployeeSerializer, EmployeeListSerializer
from apps.accounts.permissions import IsAdminOrHR, IsAdminHROrFinance
from apps.departments.models import Department, Position


# ---------------------------------------------------------------------------
# Template column definitions — single source of truth for both download & import
# ---------------------------------------------------------------------------
EMPLOYEE_IMPORT_COLUMNS = [
    # (csv_header, field_name, required, notes)
    ("first_name",                  "first_name",                   True,  ""),
    ("last_name",                   "last_name",                    True,  ""),
    ("other_name",                  "other_name",                   False, "Middle name (optional)"),
    ("date_of_birth",               "date_of_birth",                True,  "YYYY-MM-DD"),
    ("gender",                      "gender",                       True,  "MALE | FEMALE | OTHER"),
    ("national_id",                 "national_id",                  True,  "Ghana Card e.g. GHA-123456789-0"),
    ("phone",                       "phone",                        True,  ""),
    ("personal_email",              "personal_email",               False, ""),
    ("address",                     "address",                      True,  ""),
    ("department",                  "department",                   True,  "Exact department name"),
    ("position",                    "position",                     True,  "Exact position title"),
    ("employment_type",             "employment_type",              True,  "FULL_TIME | PART_TIME | CONTRACT | INTERN"),
    ("employment_status",           "employment_status",            False, "ACTIVE (default) | INACTIVE | TERMINATED | SUSPENDED"),
    ("date_joined",                 "date_joined",                  True,  "YYYY-MM-DD"),
    ("date_terminated",             "date_terminated",              False, "YYYY-MM-DD or leave blank"),
    ("bank_name",                   "bank_name",                    False, ""),
    ("bank_account_number",         "bank_account_number",          False, ""),
    ("bank_branch",                 "bank_branch",                  False, ""),
    ("ssnit_number",                "ssnit_number",                 False, "SSNIT membership number"),
    ("tin_number",                  "tin_number",                   False, "GRA Tax Identification Number"),
    ("emergency_contact_name",      "emergency_contact_name",       False, ""),
    ("emergency_contact_phone",     "emergency_contact_phone",      False, ""),
    ("emergency_contact_relationship", "emergency_contact_relationship", False, ""),
]

HEADERS = [col[0] for col in EMPLOYEE_IMPORT_COLUMNS]


def _parse_date_field(value):
    """Parse date from YYYY-MM-DD or DD/MM/YYYY or M/D/YYYY."""
    if not value or not str(value).strip():
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    return None


class EmployeeListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/employees/       — List all employees (with search/filter)
    POST /api/employees/       — Create new employee (Admin/HR only)
    """

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["department", "employment_status", "employment_type", "gender"]
    search_fields = [
        "first_name",
        "last_name",
        "employee_id",
        "national_id",
        "phone",
        "personal_email",
    ]
    ordering_fields = ["employee_id", "first_name", "last_name", "date_joined"]
    ordering = ["employee_id"]

    def get_queryset(self):
        return Employee.objects.select_related("department", "position").all()

    def get_serializer_class(self):
        if self.request.method == "GET":
            return EmployeeListSerializer
        return EmployeeSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAdminHROrFinance()]
        return [IsAdminOrHR()]


class EmployeeDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/employees/<id>/  — Get employee details
    PUT    /api/employees/<id>/  — Update employee
    DELETE /api/employees/<id>/  — Delete employee (Admin only)
    """

    queryset = Employee.objects.select_related("department", "position").all()
    serializer_class = EmployeeSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        if self.request.method == "DELETE":
            from apps.accounts.permissions import IsAdminUser
            return [IsAdminUser()]
        return [IsAdminOrHR()]

    def get_object(self):
        obj = super().get_object()
        # Employees can only view their own profile
        user = self.request.user
        if user.role == "EMPLOYEE":
            if not user.employee or user.employee.id != obj.id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only view your own profile.")
        return obj


class EmployeeSelfView(generics.RetrieveUpdateAPIView):
    """
    GET /api/employees/me/  — Get own employee profile
    PUT /api/employees/me/  — Update own limited fields
    """

    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeSerializer

    def get_object(self):
        user = self.request.user
        if not user.employee:
            from rest_framework.exceptions import NotFound
            raise NotFound("No employee profile linked to your account.")
        return user.employee


class EmployeeImportTemplateView(APIView):
    """
    GET /api/employees/import-template/
    Returns a pre-built CSV template with all importable columns plus a
    sample row and a notes row so HR knows exactly what to fill in.
    """

    permission_classes = [IsAdminOrHR]

    def get(self, request):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="employee_import_template.csv"'

        writer = csv.writer(response)

        # Row 1 — column headers
        writer.writerow(HEADERS)

        # Row 2 — notes / allowed values  (prefixed with # so importers can skip)
        notes_row = ["# " + col[3] if col[3] else ("# required" if col[2] else "# optional")
                     for col in EMPLOYEE_IMPORT_COLUMNS]
        writer.writerow(notes_row)

        # Row 3 — a realistic sample row
        writer.writerow([
            "Kwame",            # first_name
            "Mensah",           # last_name
            "Asante",           # other_name
            "1990-05-15",       # date_of_birth
            "MALE",             # gender
            "GHA-123456789-0",  # national_id
            "0244000000",       # phone
            "kwame@example.com",# personal_email
            "12 Ring Road, Accra",  # address
            "Finance",          # department  ← must match an existing department name
            "Accountant",       # position    ← must match a position title in that dept
            "FULL_TIME",        # employment_type
            "ACTIVE",           # employment_status
            "2023-01-02",       # date_joined
            "",                 # date_terminated
            "GCB Bank",         # bank_name
            "1234567890",       # bank_account_number
            "Accra Main",       # bank_branch
            "SSNIT-0001",       # ssnit_number
            "GRA-0001",         # tin_number
            "Ama Mensah",       # emergency_contact_name
            "0200000000",       # emergency_contact_phone
            "Spouse",           # emergency_contact_relationship
        ])

        return response


class EmployeeImportView(APIView):
    """
    POST /api/employees/import/
    Upload a populated CSV (based on the template) to bulk-create employees.

    - Rows starting with '#' are skipped (notes rows from the template).
    - Department and Position are looked up by name (case-insensitive).
    - Duplicate national_id rows are skipped with an explanation.
    - Returns counts: created, skipped, errors.
    """

    permission_classes = [IsAdminOrHR]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response(
                {"detail": "No file provided. Send a CSV as the 'file' field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            content = file_obj.read().decode("utf-8-sig")
        except UnicodeDecodeError:
            content = file_obj.read().decode("latin-1")

        reader = csv.DictReader(io.StringIO(content))

        if not reader.fieldnames:
            return Response(
                {"detail": "File appears empty or has no headers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Normalise fieldnames to lowercase stripped
        norm_fields = {f.strip().lower(): f for f in reader.fieldnames}
        missing = [h for h in HEADERS if h not in norm_fields]
        if missing:
            return Response(
                {
                    "detail": f"Missing required columns: {missing}. "
                              f"Please use the official template."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build lookup caches
        dept_cache = {d.name.lower(): d for d in Department.objects.filter(is_active=True)}
        pos_cache = {p.title.lower(): p for p in Position.objects.filter(is_active=True)}

        existing_national_ids = set(
            Employee.objects.values_list("national_id", flat=True)
        )

        created = 0
        skipped = []
        errors = []
        new_employees = []

        rows = list(reader)

        for row_num, row in enumerate(rows, start=2):
            # Skip comment / notes rows
            first_val = row.get(reader.fieldnames[0], "").strip()
            if first_val.startswith("#"):
                continue

            # Skip entirely blank rows
            if not any(v.strip() for v in row.values()):
                continue

            def get(col):
                return row.get(norm_fields.get(col, col), "").strip()

            # --- Required field validation ---
            missing_required = []
            for csv_col, _, required, _ in EMPLOYEE_IMPORT_COLUMNS:
                if required and not get(csv_col):
                    missing_required.append(csv_col)

            if missing_required:
                errors.append({
                    "row": row_num,
                    "name": f"{get('first_name')} {get('last_name')}".strip(),
                    "reason": f"Missing required fields: {', '.join(missing_required)}",
                })
                continue

            # --- Department lookup ---
            dept_name = get("department").lower()
            department = dept_cache.get(dept_name)
            if not department:
                errors.append({
                    "row": row_num,
                    "name": f"{get('first_name')} {get('last_name')}".strip(),
                    "reason": f"Department '{get('department')}' not found. "
                              f"Available: {[d.name for d in dept_cache.values()]}",
                })
                continue

            # --- Position lookup ---
            pos_title = get("position").lower()
            position = pos_cache.get(pos_title)
            if not position:
                errors.append({
                    "row": row_num,
                    "name": f"{get('first_name')} {get('last_name')}".strip(),
                    "reason": f"Position '{get('position')}' not found.",
                })
                continue

            # --- Duplicate national_id check ---
            national_id = get("national_id")
            if national_id in existing_national_ids:
                skipped.append({
                    "row": row_num,
                    "name": f"{get('first_name')} {get('last_name')}".strip(),
                    "reason": f"Employee with national ID '{national_id}' already exists.",
                })
                continue

            # --- Date parsing ---
            dob = _parse_date_field(get("date_of_birth"))
            date_joined = _parse_date_field(get("date_joined"))
            date_terminated = _parse_date_field(get("date_terminated")) if get("date_terminated") else None

            if not dob:
                errors.append({"row": row_num, "name": f"{get('first_name')} {get('last_name')}".strip(),
                                "reason": f"Cannot parse date_of_birth: '{get('date_of_birth')}'"})
                continue
            if not date_joined:
                errors.append({"row": row_num, "name": f"{get('first_name')} {get('last_name')}".strip(),
                                "reason": f"Cannot parse date_joined: '{get('date_joined')}'"})
                continue

            # --- Choice field validation ---
            gender = get("gender").upper()
            if gender not in ("MALE", "FEMALE", "OTHER"):
                errors.append({"row": row_num, "name": f"{get('first_name')} {get('last_name')}".strip(),
                                "reason": f"Invalid gender '{gender}'. Must be MALE, FEMALE or OTHER."})
                continue

            emp_type = get("employment_type").upper()
            if emp_type not in ("FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"):
                errors.append({"row": row_num, "name": f"{get('first_name')} {get('last_name')}".strip(),
                                "reason": f"Invalid employment_type '{emp_type}'."})
                continue

            emp_status = get("employment_status").upper() or "ACTIVE"
            if emp_status not in ("ACTIVE", "INACTIVE", "TERMINATED", "SUSPENDED", "ON_LEAVE"):
                emp_status = "ACTIVE"

            new_employees.append(Employee(
                first_name=get("first_name"),
                last_name=get("last_name"),
                other_name=get("other_name"),
                date_of_birth=dob,
                gender=gender,
                national_id=national_id,
                phone=get("phone"),
                personal_email=get("personal_email"),
                address=get("address"),
                department=department,
                position=position,
                employment_type=emp_type,
                employment_status=emp_status,
                date_joined=date_joined,
                date_terminated=date_terminated,
                bank_name=get("bank_name"),
                bank_account_number=get("bank_account_number"),
                bank_branch=get("bank_branch"),
                ssnit_number=get("ssnit_number"),
                tin_number=get("tin_number"),
                emergency_contact_name=get("emergency_contact_name"),
                emergency_contact_phone=get("emergency_contact_phone"),
                emergency_contact_relationship=get("emergency_contact_relationship"),
            ))
            existing_national_ids.add(national_id)  # prevent same-file duplicates

        # Bulk create inside a transaction
        with transaction.atomic():
            for emp in new_employees:
                emp.save()  # use save() so employee_id auto-generation fires
            created = len(new_employees)

        return Response(
            {
                "detail": f"Import complete. {created} created, "
                          f"{len(skipped)} skipped, {len(errors)} errors.",
                "created": created,
                "skipped_count": len(skipped),
                "skipped": skipped[:50],
                "errors": errors[:50],
            },
            status=status.HTTP_200_OK,
        )
