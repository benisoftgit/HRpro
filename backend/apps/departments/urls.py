"""Departments URL patterns."""

from django.urls import path
from .views import (
    DepartmentListCreateView,
    DepartmentDetailView,
    PositionListCreateView,
    PositionDetailView,
)

urlpatterns = [
    path("", DepartmentListCreateView.as_view(), name="department-list"),
    path("<int:pk>/", DepartmentDetailView.as_view(), name="department-detail"),
    path("positions/", PositionListCreateView.as_view(), name="position-list"),
    path("positions/<int:pk>/", PositionDetailView.as_view(), name="position-detail"),
]
