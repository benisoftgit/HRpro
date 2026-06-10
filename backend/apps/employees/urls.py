"""Employee URL patterns."""

from django.urls import path
from .views import (
    EmployeeListCreateView,
    EmployeeDetailView,
    EmployeeSelfView,
    EmployeeImportTemplateView,
    EmployeeImportView,
)

urlpatterns = [
    path("", EmployeeListCreateView.as_view(), name="employee-list"),
    path("me/", EmployeeSelfView.as_view(), name="employee-self"),
    path("import-template/", EmployeeImportTemplateView.as_view(), name="employee-import-template"),
    path("import/", EmployeeImportView.as_view(), name="employee-import"),
    path("<int:pk>/", EmployeeDetailView.as_view(), name="employee-detail"),
]
