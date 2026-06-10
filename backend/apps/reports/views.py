"""
Reports views — GRA PAYE, SSNIT schedules, and payroll summaries.

All reports return structured JSON data suitable for rendering in the
frontend or exporting to Excel/PDF.
"""

import calendar
from decimal import Decimal

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdminHROrFinance, IsAdminOrFinance
from apps.payroll.models import PayrollRun, Payslip
from apps.employees.models import Employee


class GRAMonthlyReportView(APIView):
    """
    GET /api/reports/gra/?month=1&year=2024

    Returns PAYE data for all employees for a given month.
    Used for GRA monthly PAYE filing.
    """

    permission_classes = [IsAdminOrFinance]

    def get(self, request):
        month = int(request.query_params.get("month", 1))
        year = int(request.query_params.get("year", 2024))

        try:
            payroll_run = PayrollRun.objects.get(month=month, year=year)
        except PayrollRun.DoesNotExist:
            return Response(
                {"detail": f"No payroll run found for {calendar.month_name[month]} {year}."},
                status=404,
            )

        payslips = Payslip.objects.filter(
            payroll_run=payroll_run
        ).select_related("employee", "employee__department")

        report_data = []
        total_taxable = Decimal("0.00")
        total_paye = Decimal("0.00")

        for payslip in payslips:
            emp = payslip.employee
            row = {
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "tin_number": emp.tin_number,
                "department": emp.department.name,
                "basic_salary": str(payslip.basic_salary),
                "total_allowances": str(payslip.total_allowances),
                "gross_salary": str(payslip.gross_salary),
                "ssnit_employee": str(payslip.ssnit_employee),
                "taxable_income": str(payslip.taxable_income),
                "paye_tax": str(payslip.paye_tax),
            }
            report_data.append(row)
            total_taxable += payslip.taxable_income
            total_paye += payslip.paye_tax

        return Response({
            "month": month,
            "month_name": calendar.month_name[month],
            "year": year,
            "total_employees": len(report_data),
            "total_taxable_income": str(total_taxable),
            "total_paye_tax": str(total_paye),
            "records": report_data,
        })


class SSNITScheduleView(APIView):
    """
    GET /api/reports/ssnit/?month=1&year=2024

    Returns SSNIT contribution schedule for all employees.
    Used for monthly SSNIT filing.
    """

    permission_classes = [IsAdminOrFinance]

    def get(self, request):
        month = int(request.query_params.get("month", 1))
        year = int(request.query_params.get("year", 2024))

        try:
            payroll_run = PayrollRun.objects.get(month=month, year=year)
        except PayrollRun.DoesNotExist:
            return Response(
                {"detail": f"No payroll run found for {calendar.month_name[month]} {year}."},
                status=404,
            )

        payslips = Payslip.objects.filter(
            payroll_run=payroll_run
        ).select_related("employee")

        schedule = []
        total_employee = Decimal("0.00")
        total_employer = Decimal("0.00")
        total_tier2 = Decimal("0.00")

        for payslip in payslips:
            emp = payslip.employee
            row = {
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "ssnit_number": emp.ssnit_number,
                "basic_salary": str(payslip.basic_salary),
                "ssnit_employee": str(payslip.ssnit_employee),
                "ssnit_employer": str(payslip.ssnit_employer),
                "tier2_employer": str(payslip.tier2_employer),
                "total_ssnit": str(payslip.ssnit_employee + payslip.ssnit_employer),
            }
            schedule.append(row)
            total_employee += payslip.ssnit_employee
            total_employer += payslip.ssnit_employer
            total_tier2 += payslip.tier2_employer

        return Response({
            "month": month,
            "month_name": calendar.month_name[month],
            "year": year,
            "total_employees": len(schedule),
            "total_ssnit_employee": str(total_employee),
            "total_ssnit_employer": str(total_employer),
            "total_tier2_employer": str(total_tier2),
            "total_ssnit_combined": str(total_employee + total_employer),
            "schedule": schedule,
        })


class PayrollSummaryView(APIView):
    """
    GET /api/reports/payroll-summary/?month=1&year=2024

    Returns a high-level payroll summary for a given month including:
    - Per-employee breakdown with all incomes and deductions
    - Allowance breakdown (itemised, optional via ?include_allowances=true)
    - Department totals
    - Grand totals
    """

    permission_classes = [IsAdminHROrFinance]

    def get(self, request):
        month = int(request.query_params.get("month", 1))
        year = int(request.query_params.get("year", 2024))
        include_allowances = request.query_params.get("include_allowances", "false").lower() == "true"

        try:
            payroll_run = PayrollRun.objects.get(month=month, year=year)
        except PayrollRun.DoesNotExist:
            return Response(
                {"detail": f"No payroll run found for {calendar.month_name[month]} {year}."},
                status=404,
            )

        payslips = payroll_run.payslips.select_related(
            "employee", "employee__department", "employee__position"
        ).all()

        # ── Per-employee detail rows ──────────────────────────────────────────
        employee_rows = []
        dept_summary = {}

        for payslip in payslips:
            emp = payslip.employee
            dept_name = emp.department.name

            row = {
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "department": dept_name,
                "position": emp.position.title,
                # Earnings
                "basic_salary": str(payslip.basic_salary),
                "total_allowances": str(payslip.total_allowances),
                "overtime_amount": str(payslip.overtime_amount),
                "gross_salary": str(payslip.gross_salary),
                # Statutory deductions
                "ssnit_employee": str(payslip.ssnit_employee),
                "paye_tax": str(payslip.paye_tax),
                # Other deductions
                "loan_deduction": str(payslip.loan_deduction),
                "other_deductions": str(payslip.other_deductions),
                "total_deductions": str(payslip.total_deductions),
                # Net
                "net_salary": str(payslip.net_salary),
            }

            # Optional: itemised allowance breakdown per employee
            if include_allowances:
                from apps.salary.models import EmployeeAllowance
                emp_allowances = EmployeeAllowance.objects.filter(
                    employee=emp, is_active=True
                ).select_related("allowance_type")
                row["allowances"] = [
                    {
                        "name": a.allowance_type.name,
                        "amount": str(a.amount),
                        "is_taxable": a.allowance_type.is_taxable,
                    }
                    for a in emp_allowances
                ]

            employee_rows.append(row)

            # Department accumulator
            if dept_name not in dept_summary:
                dept_summary[dept_name] = {
                    "department": dept_name,
                    "employee_count": 0,
                    "total_basic": Decimal("0.00"),
                    "total_allowances": Decimal("0.00"),
                    "total_overtime": Decimal("0.00"),
                    "total_gross": Decimal("0.00"),
                    "total_ssnit_employee": Decimal("0.00"),
                    "total_paye": Decimal("0.00"),
                    "total_loan_deductions": Decimal("0.00"),
                    "total_other_deductions": Decimal("0.00"),
                    "total_deductions": Decimal("0.00"),
                    "total_net": Decimal("0.00"),
                }
            d = dept_summary[dept_name]
            d["employee_count"] += 1
            d["total_basic"] += payslip.basic_salary
            d["total_allowances"] += payslip.total_allowances
            d["total_overtime"] += payslip.overtime_amount
            d["total_gross"] += payslip.gross_salary
            d["total_ssnit_employee"] += payslip.ssnit_employee
            d["total_paye"] += payslip.paye_tax
            d["total_loan_deductions"] += payslip.loan_deduction
            d["total_other_deductions"] += payslip.other_deductions
            d["total_deductions"] += payslip.total_deductions
            d["total_net"] += payslip.net_salary

        # Stringify department Decimals
        dept_list = []
        for d in dept_summary.values():
            dept_list.append({k: str(v) if isinstance(v, Decimal) else v for k, v in d.items()})

        # ── Allowance type summary (totals per allowance type across all employees) ──
        allowance_summary = []
        if include_allowances:
            from apps.salary.models import EmployeeAllowance, AllowanceType
            from django.db.models import Sum
            emp_ids = [p.employee_id for p in payslips]
            allowance_totals = (
                EmployeeAllowance.objects
                .filter(employee_id__in=emp_ids, is_active=True)
                .values("allowance_type__name", "allowance_type__is_taxable")
                .annotate(total=Sum("amount"))
                .order_by("allowance_type__name")
            )
            allowance_summary = [
                {
                    "name": row["allowance_type__name"],
                    "is_taxable": row["allowance_type__is_taxable"],
                    "total": str(row["total"]),
                }
                for row in allowance_totals
            ]

        return Response({
            "month": month,
            "month_name": calendar.month_name[month],
            "year": year,
            "payroll_status": payroll_run.status,
            "total_employees": payslips.count(),
            # Grand totals
            "total_basic_salary": str(sum(p.basic_salary for p in payslips)),
            "total_allowances": str(payroll_run.total_gross - sum(p.basic_salary + p.overtime_amount for p in payslips)),
            "total_overtime": str(sum(p.overtime_amount for p in payslips)),
            "total_gross_salary": str(payroll_run.total_gross),
            "total_ssnit_employee": str(payroll_run.total_ssnit_employee),
            "total_ssnit_employer": str(payroll_run.total_ssnit_employer),
            "total_paye_tax": str(payroll_run.total_paye),
            "total_loan_deductions": str(sum(p.loan_deduction for p in payslips)),
            "total_other_deductions": str(sum(p.other_deductions for p in payslips)),
            "total_net_salary": str(payroll_run.total_net),
            # Breakdowns
            "department_breakdown": dept_list,
            "employee_breakdown": employee_rows,
            "allowance_summary": allowance_summary,
        })


class HeadcountReportView(APIView):
    """
    GET /api/reports/headcount/
    Returns employee headcount by department, status, and type.
    """

    permission_classes = [IsAdminHROrFinance]

    def get(self, request):
        from django.db.models import Count
        from apps.departments.models import Department

        departments = Department.objects.annotate(
            active_count=Count(
                "employees",
                filter=__import__("django.db.models", fromlist=["Q"]).Q(
                    employees__employment_status="ACTIVE"
                ),
            )
        ).values("name", "code", "active_count")

        total_active = Employee.objects.filter(employment_status="ACTIVE").count()
        total_inactive = Employee.objects.filter(employment_status="INACTIVE").count()
        total_terminated = Employee.objects.filter(employment_status="TERMINATED").count()

        return Response({
            "total_employees": Employee.objects.count(),
            "active": total_active,
            "inactive": total_inactive,
            "terminated": total_terminated,
            "by_department": list(departments),
        })


class BankScheduleView(APIView):
    """
    GET /api/reports/bank-schedule/?month=1&year=2024

    Returns a bank payment schedule listing each employee's:
    - Full name
    - Bank name
    - Account number
    - Branch
    - Net salary to be credited

    Used to submit to the bank for bulk salary payment.
    """

    permission_classes = [IsAdminOrFinance]

    def get(self, request):
        month = int(request.query_params.get("month", 1))
        year = int(request.query_params.get("year", 2024))

        try:
            payroll_run = PayrollRun.objects.get(month=month, year=year)
        except PayrollRun.DoesNotExist:
            return Response(
                {"detail": f"No payroll run found for {calendar.month_name[month]} {year}."},
                status=404,
            )

        payslips = payroll_run.payslips.select_related("employee").order_by(
            "employee__last_name", "employee__first_name"
        )

        schedule = []
        total_net = Decimal("0.00")

        for payslip in payslips:
            emp = payslip.employee
            schedule.append({
                "employee_id": emp.employee_id,
                "full_name": emp.full_name,
                "bank_name": emp.bank_name or "—",
                "account_number": emp.bank_account_number or "—",
                "branch": emp.bank_branch or "—",
                "net_salary": str(payslip.net_salary),
            })
            total_net += payslip.net_salary

        return Response({
            "month": month,
            "month_name": calendar.month_name[month],
            "year": year,
            "total_employees": len(schedule),
            "total_net_salary": str(total_net),
            "schedule": schedule,
        })
