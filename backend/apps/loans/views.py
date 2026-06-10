"""Loan views."""

from rest_framework import generics, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .models import Loan, LoanRepayment
from .serializers import LoanSerializer, LoanRepaymentSerializer, LoanApprovalSerializer
from apps.accounts.permissions import IsAdminOrFinance, IsAdminHROrFinance


class LoanListCreateView(generics.ListCreateAPIView):
    serializer_class = LoanSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["employee", "loan_type", "status"]
    ordering_fields = ["created_at", "amount"]
    ordering = ["-created_at"]

    def get_queryset(self):
        user = self.request.user
        qs = Loan.objects.select_related("employee", "approved_by").prefetch_related("repayments")
        if user.role == "EMPLOYEE" and user.employee:
            qs = qs.filter(employee=user.employee)
        return qs

    def get_permissions(self):
        return [IsAuthenticated()]


class LoanDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Loan.objects.all()
    serializer_class = LoanSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrFinance()]


class LoanApprovalView(APIView):
    """
    POST /api/loans/<id>/action/
    Approve or reject a loan application.
    """

    permission_classes = [IsAdminOrFinance]

    def post(self, request, pk):
        try:
            loan = Loan.objects.get(pk=pk)
        except Loan.DoesNotExist:
            return Response(
                {"detail": "Loan not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if loan.status != Loan.Status.PENDING:
            return Response(
                {"detail": f"Cannot action a loan with status '{loan.status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = LoanApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data["action"]
        if action == "approve":
            loan.status = Loan.Status.ACTIVE
            loan.approved_by = request.user
            if serializer.validated_data.get("disbursement_date"):
                loan.disbursement_date = serializer.validated_data["disbursement_date"]
            loan.save()
            return Response(
                {"detail": "Loan approved.", "status": "ACTIVE"},
                status=status.HTTP_200_OK,
            )
        else:
            loan.status = Loan.Status.REJECTED
            loan.approved_by = request.user
            loan.notes = serializer.validated_data.get("rejection_reason", "")
            loan.save()
            return Response(
                {"detail": "Loan rejected.", "status": "REJECTED"},
                status=status.HTTP_200_OK,
            )


class LoanRepaymentListCreateView(generics.ListCreateAPIView):
    serializer_class = LoanRepaymentSerializer
    permission_classes = [IsAdminHROrFinance]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["loan", "payroll"]

    def get_queryset(self):
        return LoanRepayment.objects.select_related("loan", "payroll").all()
