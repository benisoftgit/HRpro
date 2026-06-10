"""Payroll URL patterns."""

from django.urls import path
from .views import (
    CancelPayrollView,
    FinalizePayrollView,
    PayrollRunAdjustmentDetailView,
    PayrollRunAdjustmentListView,
    PayrollRunDetailView,
    PayrollRunEligibleEmployeesView,
    PayrollRunListCreateView,
    PayslipDetailView,
    PayslipListView,
    PayslipPDFView,
    PayslipSendView,
    PayrollTrendsView,
    ProcessPayrollView,
    ReopenPayrollView,
    SendPayslipsView,
)

urlpatterns = [
    path("runs/", PayrollRunListCreateView.as_view(), name="payroll-run-list"),
    path("runs/<int:pk>/", PayrollRunDetailView.as_view(), name="payroll-run-detail"),
    path("runs/<int:pk>/process/", ProcessPayrollView.as_view(), name="payroll-process"),
    path("runs/<int:pk>/finalize/", FinalizePayrollView.as_view(), name="payroll-finalize"),
    path("runs/<int:pk>/send-payslips/", SendPayslipsView.as_view(), name="payroll-send"),
    path("runs/<int:pk>/cancel/", CancelPayrollView.as_view(), name="payroll-cancel"),
    path("runs/<int:pk>/reopen/", ReopenPayrollView.as_view(), name="payroll-reopen"),
    path(
        "runs/<int:run_id>/adjustments/",
        PayrollRunAdjustmentListView.as_view(),
        name="payroll-adjustment-list",
    ),
    path(
        "runs/<int:run_id>/adjustments/<int:pk>/",
        PayrollRunAdjustmentDetailView.as_view(),
        name="payroll-adjustment-detail",
    ),
    path(
        "runs/<int:run_id>/eligible-employees/",
        PayrollRunEligibleEmployeesView.as_view(),
        name="payroll-eligible-employees",
    ),
    path("payslips/", PayslipListView.as_view(), name="payslip-list"),
    path("payslips/<int:pk>/", PayslipDetailView.as_view(), name="payslip-detail"),
    path("payslips/<int:pk>/send/", PayslipSendView.as_view(), name="payslip-send"),
    path("payslips/<int:pk>/pdf/", PayslipPDFView.as_view(), name="payslip-pdf"),
    path("trends/", PayrollTrendsView.as_view(), name="payroll-trends"),
]
