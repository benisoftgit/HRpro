"""Salary URL patterns."""

from django.urls import path
from .views import (
    SalaryStructureListCreateView,
    SalaryStructureDetailView,
    AllowanceTypeListCreateView,
    AllowanceTypeDetailView,
    EmployeeAllowanceListCreateView,
    EmployeeAllowanceDetailView,
    OvertimeRateListCreateView,
    OvertimeRateDetailView,
    PayrollSettingsView,
    BusinessProfileView,
    PAYETaxBandListView,
    PAYETaxBandDetailView,
)

urlpatterns = [
    path("structures/", SalaryStructureListCreateView.as_view(), name="salary-structure-list"),
    path("structures/<int:pk>/", SalaryStructureDetailView.as_view(), name="salary-structure-detail"),
    path("allowance-types/", AllowanceTypeListCreateView.as_view(), name="allowance-type-list"),
    path("allowance-types/<int:pk>/", AllowanceTypeDetailView.as_view(), name="allowance-type-detail"),
    path("allowances/", EmployeeAllowanceListCreateView.as_view(), name="employee-allowance-list"),
    path("allowances/<int:pk>/", EmployeeAllowanceDetailView.as_view(), name="employee-allowance-detail"),
    path("overtime-rates/", OvertimeRateListCreateView.as_view(), name="overtime-rate-list"),
    path("overtime-rates/<int:pk>/", OvertimeRateDetailView.as_view(), name="overtime-rate-detail"),
    path("payroll-settings/", PayrollSettingsView.as_view(), name="payroll-settings"),
    path("business-profile/", BusinessProfileView.as_view(), name="business-profile"),
    path("paye-bands/", PAYETaxBandListView.as_view(), name="paye-band-list"),
    path("paye-bands/<int:pk>/", PAYETaxBandDetailView.as_view(), name="paye-band-detail"),
]
