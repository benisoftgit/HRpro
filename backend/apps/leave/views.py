"""Leave views."""

from rest_framework import generics, filters, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import models
from django_filters.rest_framework import DjangoFilterBackend

from .models import LeaveType, LeaveBalance, LeaveRequest
from .serializers import (
    LeaveTypeSerializer,
    LeaveBalanceSerializer,
    LeaveRequestSerializer,
    LeaveApprovalSerializer,
)
from apps.accounts.permissions import IsAdminOrHR, IsAdminHROrFinance, IsManagerOrAbove, IsMDOrAbove


class LeaveTypeListCreateView(generics.ListCreateAPIView):
    queryset = LeaveType.objects.filter(is_active=True)
    serializer_class = LeaveTypeSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]


class LeaveTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LeaveType.objects.all()
    serializer_class = LeaveTypeSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]


class LeaveBalanceListView(generics.ListAPIView):
    serializer_class = LeaveBalanceSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["employee", "leave_type", "year"]

    def get_queryset(self):
        user = self.request.user
        qs = LeaveBalance.objects.select_related("employee", "leave_type").all()
        if user.role == "EMPLOYEE" and user.employee:
            qs = qs.filter(employee=user.employee)
        return qs

    def get_permissions(self):
        return [IsAuthenticated()]


class LeaveRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = LeaveRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["employee", "leave_type", "status"]
    ordering_fields = ["applied_at", "start_date"]
    ordering = ["-applied_at"]

    def get_queryset(self):
        user = self.request.user
        qs = LeaveRequest.objects.select_related(
            "employee", "leave_type",
            "manager_approved_by", "hr_authorized_by", "md_authorized_by", "rejected_by",
        ).all()
        if user.role == "EMPLOYEE":
            if user.employee:
                qs = qs.filter(employee=user.employee)
            else:
                qs = qs.none()
        elif user.role == "MANAGER" and user.employee:
            # Managers see their own requests + their direct reports' requests
            qs = qs.filter(
                models.Q(employee=user.employee)
                | models.Q(employee__manager=user.employee)
            )
        # ADMIN, HR, MD see all
        return qs

    def get_permissions(self):
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == "EMPLOYEE":
            if not user.employee:
                raise ValidationError(
                    {"employee": "Your account is not linked to an employee record. Contact HR."}
                )
            serializer.save(employee=user.employee)
        else:
            # HR / ADMIN must include employee in the request body
            serializer.save()


class LeaveRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LeaveRequest.objects.all()
    serializer_class = LeaveRequestSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]


class LeaveApprovalView(APIView):
    """
    POST /api/leave/requests/<id>/action/
    Multi-stage approval: manager_approve -> hr_authorize -> md_authorize (optional).
    Only the relevant role for each stage can act.
    """

    def post(self, request, pk):
        try:
            leave_request = LeaveRequest.objects.get(pk=pk)
        except LeaveRequest.DoesNotExist:
            return Response(
                {"detail": "Leave request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if leave_request.status == LeaveRequest.Status.REJECTED:
            return Response(
                {"detail": "This request has already been rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if leave_request.status == LeaveRequest.Status.CANCELLED:
            return Response(
                {"detail": "This request has been cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = LeaveApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data["action"]
        user = request.user

        # ── Manager approval ─────────────────────────────────────
        if action == "manager_approve":
            if leave_request.status != LeaveRequest.Status.PENDING:
                return Response(
                    {"detail": "Request must be PENDING for manager approval."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not can_act_as_manager(user, leave_request):
                return Response(
                    {"detail": "You are not authorized to approve this request at the manager level."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            leave_request.approve_by_manager(user)
            return Response(
                {"detail": "Manager approval recorded.", "status": "MANAGER_APPROVED"},
                status=status.HTTP_200_OK,
            )

        # ── HR authorization ─────────────────────────────────────
        if action == "hr_authorize":
            if leave_request.status != LeaveRequest.Status.MANAGER_APPROVED:
                return Response(
                    {"detail": "Request must be manager-approved for HR authorization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if user.role not in ("ADMIN", "HR"):
                return Response(
                    {"detail": "Only HR or Admin can authorize at this stage."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            leave_request.authorize_by_hr(user)
            return Response(
                {"detail": "HR authorization recorded.", "status": "HR_AUTHORIZED"},
                status=status.HTTP_200_OK,
            )

        # ── MD authorization (optional) ──────────────────────────
        if action == "md_authorize":
            if leave_request.status != LeaveRequest.Status.HR_AUTHORIZED:
                return Response(
                    {"detail": "Request must be HR-authorized for MD authorization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if user.role not in ("MD", "ADMIN"):
                return Response(
                    {"detail": "Only MD or Admin can authorize at this stage."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            leave_request.authorize_by_md(user)
            return Response(
                {"detail": "MD authorization recorded.", "status": "MD_AUTHORIZED"},
                status=status.HTTP_200_OK,
            )

        # ── Reject (any stage) ───────────────────────────────────
        if action == "reject":
            if leave_request.status in (
                LeaveRequest.Status.MD_AUTHORIZED,
                LeaveRequest.Status.CANCELLED,
            ):
                return Response(
                    {"detail": f"Cannot reject a request with status '{leave_request.status}'."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Who can reject: the relevant approver for the current stage
            if not can_reject(user, leave_request):
                return Response(
                    {"detail": "You are not authorized to reject this request."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            reason = serializer.validated_data.get("rejection_reason", "")
            leave_request.reject(user, reason)
            return Response(
                {"detail": "Leave request rejected.", "status": "REJECTED"},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "Invalid action."},
            status=status.HTTP_400_BAD_REQUEST,
        )


def can_act_as_manager(user, leave_request):
    """Check if user can act as the manager for this leave request."""
    if user.role in ("ADMIN", "HR"):
        return True
    if user.role == "MANAGER" and user.employee:
        return leave_request.employee.manager == user.employee
    return False


def can_reject(user, leave_request):
    """Check if user can reject this request at its current stage."""
    if user.role == "ADMIN":
        return True
    stage = leave_request.status
    if stage == LeaveRequest.Status.PENDING:
        return can_act_as_manager(user, leave_request)
    if stage == LeaveRequest.Status.MANAGER_APPROVED:
        return user.role in ("ADMIN", "HR") or can_act_as_manager(user, leave_request)
    if stage == LeaveRequest.Status.HR_AUTHORIZED:
        return user.role in ("MD", "ADMIN")
    if stage == LeaveRequest.Status.REJECTED:
        return False
    return False
