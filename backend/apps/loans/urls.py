"""Loans URL patterns."""

from django.urls import path
from .views import (
    LoanListCreateView,
    LoanDetailView,
    LoanApprovalView,
    LoanRepaymentListCreateView,
)

urlpatterns = [
    path("", LoanListCreateView.as_view(), name="loan-list"),
    path("<int:pk>/", LoanDetailView.as_view(), name="loan-detail"),
    path("<int:pk>/action/", LoanApprovalView.as_view(), name="loan-approval"),
    path("repayments/", LoanRepaymentListCreateView.as_view(), name="loan-repayment-list"),
]
