"""Reports URL patterns."""

from django.urls import path
from .views import (
    GRAMonthlyReportView,
    SSNITScheduleView,
    PayrollSummaryView,
    HeadcountReportView,
    BankScheduleView,
)

urlpatterns = [
    path("gra/", GRAMonthlyReportView.as_view(), name="report-gra"),
    path("ssnit/", SSNITScheduleView.as_view(), name="report-ssnit"),
    path("payroll-summary/", PayrollSummaryView.as_view(), name="report-payroll-summary"),
    path("headcount/", HeadcountReportView.as_view(), name="report-headcount"),
    path("bank-schedule/", BankScheduleView.as_view(), name="report-bank-schedule"),
]
