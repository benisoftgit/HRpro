"""Leave URL patterns."""

from django.urls import path
from .views import (
    LeaveTypeListCreateView,
    LeaveTypeDetailView,
    LeaveBalanceListView,
    LeaveRequestListCreateView,
    LeaveRequestDetailView,
    LeaveApprovalView,
)

urlpatterns = [
    path("types/", LeaveTypeListCreateView.as_view(), name="leave-type-list"),
    path("types/<int:pk>/", LeaveTypeDetailView.as_view(), name="leave-type-detail"),
    path("balances/", LeaveBalanceListView.as_view(), name="leave-balance-list"),
    path("requests/", LeaveRequestListCreateView.as_view(), name="leave-request-list"),
    path("requests/<int:pk>/", LeaveRequestDetailView.as_view(), name="leave-request-detail"),
    path("requests/<int:pk>/action/", LeaveApprovalView.as_view(), name="leave-approval"),
]
