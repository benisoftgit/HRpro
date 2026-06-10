"""Payroll views — run processing, payslip management."""

from datetime import datetime
from decimal import Decimal

from django.core.mail import EmailMessage
from django.conf import settings
from rest_framework import generics, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from django.db.models import Sum, Count
from .models import PayrollRun, Payslip, PayrollRunAdjustment
from .serializers import (
    PayrollRunAdjustmentSerializer,
    PayrollRunSerializer,
    PayrollRunDetailSerializer,
    PayslipSerializer,
)
from .utils import compute_payslip, generate_payslip_pdf
from apps.accounts.permissions import IsAdminOrFinance, IsAdminHROrFinance
from apps.employees.models import Employee
from apps.attendance.models import AttendanceRecord


class PayrollRunListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/payroll/runs/   — List all payroll runs
    POST /api/payroll/runs/   — Create a new payroll run (draft)
    """

    serializer_class = PayrollRunSerializer
    permission_classes = [IsAdminHROrFinance]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["month", "year", "status"]
    ordering = ["-year", "-month"]

    def get_queryset(self):
        return PayrollRun.objects.prefetch_related("payslips").all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PayrollRunDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/payroll/runs/<id>/  — Get payroll run with all payslips
    PATCH  /api/payroll/runs/<id>/  — Update payroll run
    DELETE /api/payroll/runs/<id>/  — Delete payroll run (DRAFT only)
    """

    permission_classes = [IsAdminHROrFinance]

    def get_queryset(self):
        return PayrollRun.objects.prefetch_related("payslips__employee").all()

    def get_serializer_class(self):
        if self.request.method == "GET":
            return PayrollRunDetailSerializer
        return PayrollRunSerializer

    def destroy(self, request, *args, **kwargs):
        run = self.get_object()
        if run.status != PayrollRun.Status.DRAFT:
            return Response(
                {"detail": "Only draft payroll runs can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


class ProcessPayrollView(APIView):
    """
    POST /api/payroll/runs/<id>/process/
    Generate payslips for all active employees for this payroll run.
    """

    permission_classes = [IsAdminOrFinance]

    def post(self, request, pk):
        try:
            payroll_run = PayrollRun.objects.get(pk=pk)
        except PayrollRun.DoesNotExist:
            return Response(
                {"detail": "Payroll run not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if payroll_run.status == PayrollRun.Status.COMPLETED:
            return Response(
                {"detail": "This payroll run has already been completed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payroll_run.status = PayrollRun.Status.PROCESSING
        payroll_run.save()

        active_employees = Employee.objects.filter(
            employment_status="ACTIVE"
        ).select_related("department", "position")

        # Pre-load adjustments for this run
        adjustments = {
            a.employee_id: a
            for a in PayrollRunAdjustment.objects.filter(payroll_run=payroll_run)
        }

        created_count = 0
        errors = []

        for employee in active_employees:
            try:
                # Get attendance records for this employee/month/year
                attendance_records = list(
                    AttendanceRecord.objects.filter(
                        employee=employee,
                        date__month=payroll_run.month,
                        date__year=payroll_run.year,
                    )
                )
                overtime_hours = sum(
                    r.overtime_hours for r in attendance_records
                )

                # Get per-run adjustment if any
                adj = adjustments.get(employee.id)

                # Compute payslip figures
                figures = compute_payslip(
                    employee,
                    payroll_run.month,
                    payroll_run.year,
                    Decimal(str(overtime_hours)),
                    adjustment=adj,
                    calculation_mode=payroll_run.calculation_mode,
                    attendance_records=attendance_records
                    if payroll_run.calculation_mode == "TIMESHEET"
                    else None,
                )

                # Create or update payslip
                payslip, created = Payslip.objects.update_or_create(
                    payroll_run=payroll_run,
                    employee=employee,
                    defaults={**figures, "status": Payslip.Status.DRAFT},
                )
                created_count += 1

            except Exception as e:
                errors.append(
                    {"employee": employee.employee_id, "error": str(e)}
                )

        if errors and created_count == 0:
            payroll_run.status = PayrollRun.Status.DRAFT
        else:
            payroll_run.status = PayrollRun.Status.COMPLETED
        payroll_run.processed_at = datetime.now()
        payroll_run.save()

        return Response(
            {
                "detail": f"Payroll processed. {created_count} payslips generated.",
                "payslips_generated": created_count,
                "errors": errors,
            },
            status=status.HTTP_200_OK if created_count > 0 else status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class FinalizePayrollView(APIView):
    """
    POST /api/payroll/runs/<id>/finalize/
    Mark all draft payslips as Final.
    """

    permission_classes = [IsAdminOrFinance]

    def post(self, request, pk):
        try:
            payroll_run = PayrollRun.objects.get(pk=pk)
        except PayrollRun.DoesNotExist:
            return Response(
                {"detail": "Payroll run not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        updated = payroll_run.payslips.filter(
            status=Payslip.Status.DRAFT
        ).update(status=Payslip.Status.FINAL)

        return Response(
            {"detail": f"{updated} payslips finalized."},
            status=status.HTTP_200_OK,
        )


class SendPayslipsView(APIView):
    """
    POST /api/payroll/runs/<id>/send-payslips/
    Email payslips to all employees in this payroll run.
    """

    permission_classes = [IsAdminOrFinance]

    def post(self, request, pk):
        try:
            payroll_run = PayrollRun.objects.get(pk=pk)
        except PayrollRun.DoesNotExist:
            return Response(
                {"detail": "Payroll run not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        import calendar
        month_name = calendar.month_name[payroll_run.month]
        sent_count = 0
        errors = []
        for payslip in payroll_run.payslips.select_related("employee").filter(
            status=Payslip.Status.FINAL
        ):
            employee = payslip.employee
            email = employee.personal_email
            if not email:
                errors.append(f"{employee.full_name}: no email address")
                continue

            subject = f"HR Pro — Your Payslip for {month_name} {payroll_run.year}"
            message = (
                f"Dear {employee.first_name},\n\n"
                f"Please find below your payslip summary for {month_name} {payroll_run.year}:\n\n"
                f"  Basic Salary:      GHS {payslip.basic_salary:,.2f}\n"
                f"  Total Allowances:  GHS {payslip.total_allowances:,.2f}\n"
                f"  Gross Salary:      GHS {payslip.gross_salary:,.2f}\n"
                f"  SSNIT (Employee):  GHS {payslip.ssnit_employee:,.2f}\n"
                f"  PAYE Tax:          GHS {payslip.paye_tax:,.2f}\n"
                f"  Loan Deduction:    GHS {payslip.loan_deduction:,.2f}\n"
                f"  Total Deductions:  GHS {payslip.total_deductions:,.2f}\n"
                f"  NET SALARY:        GHS {payslip.net_salary:,.2f}\n\n"
                f"For queries, contact HR.\n\nHR Pro — Ghana"
            )

            try:
                pdf_bytes = generate_payslip_pdf(payslip)
                attach_filename = (
                    f"payslip-{employee.employee_id}"
                    f"-{month_name}-{payroll_run.year}.pdf"
                )
                msg = EmailMessage(
                    subject, message,
                    settings.DEFAULT_FROM_EMAIL, [email],
                )
                msg.attach(attach_filename, pdf_bytes, "application/pdf")
                msg.send(fail_silently=False)
                payslip.email_sent = True
                payslip.save(update_fields=["email_sent"])
                sent_count += 1
            except Exception as e:
                errors.append(f"{employee.full_name}: {str(e)}")

        detail = f"Payslips emailed to {sent_count} employees."
        if errors:
            detail += f" ({len(errors)} failed)"
        resp = {"detail": detail, "sent": sent_count, "errors": errors}
        if errors:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning("Bulk payslip email errors: %s", errors)

        return Response(resp, status=status.HTTP_200_OK)


class CancelPayrollView(APIView):
    """
    POST /api/payroll/runs/<id>/cancel/
    Cancel a payroll run — moves it to CANCELLED status.
    All payslips are removed to prevent further processing.
    """

    permission_classes = [IsAdminOrFinance]

    def post(self, request, pk):
        try:
            payroll_run = PayrollRun.objects.get(pk=pk)
        except PayrollRun.DoesNotExist:
            return Response(
                {"detail": "Payroll run not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if payroll_run.status in (PayrollRun.Status.CANCELLED, PayrollRun.Status.DRAFT):
            return Response(
                {"detail": f"Payroll run is already {payroll_run.status}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payroll_run.status = PayrollRun.Status.CANCELLED
        payroll_run.save()
        payroll_run.payslips.all().delete()

        return Response(
            {"detail": "Payroll run cancelled. Payslips have been removed."},
            status=status.HTTP_200_OK,
        )


class ReopenPayrollView(APIView):
    """
    POST /api/payroll/runs/<id>/reopen/
    Reopen a cancelled or completed payroll run back to DRAFT for reprocessing.
    """

    permission_classes = [IsAdminOrFinance]

    def post(self, request, pk):
        try:
            payroll_run = PayrollRun.objects.get(pk=pk)
        except PayrollRun.DoesNotExist:
            return Response(
                {"detail": "Payroll run not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if payroll_run.status == PayrollRun.Status.DRAFT:
            return Response(
                {"detail": "Payroll run is already in draft."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payroll_run.status == PayrollRun.Status.PROCESSING:
            return Response(
                {"detail": "Cannot reopen a payroll run while it is processing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payroll_run.status = PayrollRun.Status.DRAFT
        payroll_run.processed_at = None
        payroll_run.save()
        payroll_run.payslips.all().delete()

        return Response(
            {"detail": "Payroll run reopened as draft. Previous payslips have been removed."},
            status=status.HTTP_200_OK,
        )


class PayslipListView(generics.ListAPIView):
    """
    GET /api/payroll/payslips/  — List payslips (filtered by employee/run)
    """

    serializer_class = PayslipSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["payroll_run", "employee", "status"]

    def get_queryset(self):
        user = self.request.user
        qs = Payslip.objects.select_related(
            "employee", "employee__department", "employee__position", "payroll_run"
        ).all()
        if user.role == "EMPLOYEE" and user.employee:
            qs = qs.filter(employee=user.employee)
        return qs

    def get_permissions(self):
        return [IsAuthenticated()]


class PayslipDetailView(generics.RetrieveAPIView):
    queryset = Payslip.objects.all()
    serializer_class = PayslipSerializer
    permission_classes = [IsAuthenticated]


class PayslipSendView(APIView):
    """
    POST /api/payroll/payslips/<id>/send/
    Email an individual payslip to the employee and return the contact info for WhatsApp sharing.
    """

    permission_classes = [IsAdminOrFinance]

    def post(self, request, pk):
        try:
            payslip = Payslip.objects.select_related(
                "employee", "payroll_run"
            ).get(pk=pk)
        except Payslip.DoesNotExist:
            return Response(
                {"detail": "Payslip not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        import calendar
        month_name = calendar.month_name[payslip.payroll_run.month]
        employee = payslip.employee
        email = employee.personal_email

        if not email:
            return Response(
                {"detail": "Employee has no email address on file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        subject = f"HR Pro — Your Payslip for {month_name} {payslip.payroll_run.year}"
        message = (
            f"Dear {employee.first_name},\n\n"
            f"Please find below your payslip summary for {month_name} {payslip.payroll_run.year}:\n\n"
            f"  Basic Salary:      GHS {payslip.basic_salary:,.2f}\n"
            f"  Total Allowances:  GHS {payslip.total_allowances:,.2f}\n"
            f"  Gross Salary:      GHS {payslip.gross_salary:,.2f}\n"
            f"  SSNIT (Employee):  GHS {payslip.ssnit_employee:,.2f}\n"
            f"  PAYE Tax:          GHS {payslip.paye_tax:,.2f}\n"
            f"  Loan Deduction:    GHS {payslip.loan_deduction:,.2f}\n"
            f"  Total Deductions:  GHS {payslip.total_deductions:,.2f}\n"
            f"  NET SALARY:        GHS {payslip.net_salary:,.2f}\n\n"
            f"For queries, contact HR.\n\nHR Pro — Ghana"
        )

        try:
            pdf_bytes = generate_payslip_pdf(payslip)
            attach_filename = (
                f"payslip-{employee.employee_id}"
                f"-{month_name}-{payslip.payroll_run.year}.pdf"
            )
            msg = EmailMessage(
                subject, message,
                settings.DEFAULT_FROM_EMAIL, [email],
            )
            msg.attach(attach_filename, pdf_bytes, "application/pdf")
            msg.send(fail_silently=False)
            payslip.email_sent = True
            payslip.save(update_fields=["email_sent"])
            return Response({
                "detail": f"Payslip emailed to {employee.full_name} ({email}).",
                "employee_phone": employee.phone,
            })
        except Exception as e:
            return Response(
                {"detail": f"Failed to send email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class PayslipPDFView(APIView):
    """
    GET /api/payroll/payslips/<id>/pdf/
    Download a payslip as a PDF file.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            payslip = Payslip.objects.select_related(
                "employee", "employee__department", "employee__position", "payroll_run"
            ).get(pk=pk)
        except Payslip.DoesNotExist:
            return Response(
                {"detail": "Payslip not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        from django.http import HttpResponse
        import calendar
        month_name = calendar.month_name[payslip.payroll_run.month]
        pdf_bytes = generate_payslip_pdf(payslip)
        filename = (
            f"payslip-{payslip.employee.employee_id}"
            f"-{month_name}-{payslip.payroll_run.year}.pdf"
        )
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response


class PayrollTrendsView(APIView):
    """
    GET /api/payroll/trends/
    Returns monthly aggregated payroll data for the dashboard chart.
    """
    permission_classes = [IsAdminHROrFinance]

    def get(self, request):
        monthly = (
            PayrollRun.objects
            .filter(status=PayrollRun.Status.COMPLETED)
            .annotate(
                total_gross=Sum("payslips__gross_salary"),
                total_net=Sum("payslips__net_salary"),
                total_paye=Sum("payslips__paye_tax"),
                total_ssnit_employee=Sum("payslips__ssnit_employee"),
                employee_count=Count("payslips"),
            )
            .values(
                "month", "year", "total_gross", "total_net",
                "total_paye", "total_ssnit_employee", "employee_count",
            )
            .order_by("year", "month")
        )
        return Response(list(monthly))


class PayrollRunAdjustmentListView(generics.ListCreateAPIView):
    """
    GET   /api/payroll/runs/<run_id>/adjustments/  — List adjustments
    POST  /api/payroll/runs/<run_id>/adjustments/  — Create/update adjustments
    """

    permission_classes = [IsAdminOrFinance]
    serializer_class = PayrollRunAdjustmentSerializer

    def get_queryset(self):
        return PayrollRunAdjustment.objects.filter(
            payroll_run_id=self.kwargs["run_id"]
        ).select_related("employee")

    def perform_create(self, serializer):
        serializer.save(payroll_run_id=self.kwargs["run_id"])


class PayrollRunAdjustmentDetailView(generics.UpdateAPIView):
    """
    PATCH /api/payroll/runs/<run_id>/adjustments/<pk>/
    Update a single adjustment (overtime_hours, additional_allowance, etc.)
    """

    permission_classes = [IsAdminOrFinance]
    serializer_class = PayrollRunAdjustmentSerializer
    queryset = PayrollRunAdjustment.objects.all()


class PayrollRunEligibleEmployeesView(APIView):
    """
    GET /api/payroll/runs/<run_id>/eligible-employees/
    Returns all ACTIVE employees with their current salary/allowance info,
    and whether they already have an adjustment record.
    """

    permission_classes = [IsAdminOrFinance]

    def get(self, request, run_id):
        from apps.salary.models import SalaryStructure, EmployeeAllowance

        employees = Employee.objects.filter(
            employment_status="ACTIVE"
        ).select_related("department", "position")

        existing_adjustments = {
            a.employee_id: a
            for a in PayrollRunAdjustment.objects.filter(payroll_run_id=run_id)
        }

        result = []
        for emp in employees:
            ss = SalaryStructure.objects.filter(employee=emp, is_active=True).first()
            basic = ss.basic_salary if ss else (emp.position.basic_salary if emp.position_id else 0)

            allowances = EmployeeAllowance.objects.filter(
                employee=emp, is_active=True
            ).select_related("allowance_type")
            allowance_list = [
                {"name": a.allowance_type.name, "amount": str(a.amount)}
                for a in allowances
            ]

            adj = existing_adjustments.get(emp.id)

            from apps.payroll.utils import calculate_monthly_hourly_rate
            pos = emp.position
            if pos and pos.regular_ot_rate is not None:
                regular_ot_rate = str(pos.regular_ot_rate)
            else:
                regular_ot_rate = str(calculate_monthly_hourly_rate(basic))
            if pos and pos.holiday_ot_rate is not None:
                holiday_ot_rate = str(pos.holiday_ot_rate)
            else:
                holiday_ot_rate = str(calculate_monthly_hourly_rate(basic))

            result.append({
                "employee_id": emp.id,
                "employee_name": emp.full_name,
                "employee_code": emp.employee_id,
                "department": emp.department.name if emp.department_id else None,
                "grade": pos.grade if pos else None,
                "basic_salary": str(basic),
                "regular_ot_rate": regular_ot_rate,
                "holiday_ot_rate": holiday_ot_rate,
                "allowances": allowance_list,
                "total_allowances": str(sum(Decimal(a["amount"]) for a in allowance_list)),
                "adjustment_id": adj.id if adj else None,
                "regular_ot_hours": str(adj.regular_ot_hours) if adj else "0.00",
                "holiday_ot_hours": str(adj.holiday_ot_hours) if adj else "0.00",
                "additional_allowance": str(adj.additional_allowance) if adj else "0.00",
                "additional_allowance_label": adj.additional_allowance_label if adj else "",
            })

        return Response(result)
