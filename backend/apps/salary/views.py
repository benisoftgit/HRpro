"""Salary views."""

from rest_framework import generics, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .models import SalaryStructure, AllowanceType, EmployeeAllowance, OvertimeRate, PayrollSettings, PAYETaxBand, BusinessProfile
from .serializers import (
    SalaryStructureSerializer,
    AllowanceTypeSerializer,
    EmployeeAllowanceSerializer,
    OvertimeRateSerializer,
    PayrollSettingsSerializer,
    PAYETaxBandSerializer,
    BusinessProfileSerializer,
)
from apps.accounts.permissions import IsAdminOrFinance, IsAdminHROrFinance


class SalaryStructureListCreateView(generics.ListCreateAPIView):
    serializer_class = SalaryStructureSerializer
    permission_classes = [IsAdminHROrFinance]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["employee", "is_active"]
    ordering_fields = ["effective_date", "basic_salary"]

    def get_queryset(self):
        return SalaryStructure.objects.select_related("employee").all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class SalaryStructureDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SalaryStructure.objects.all()
    serializer_class = SalaryStructureSerializer
    permission_classes = [IsAdminHROrFinance]


class AllowanceTypeListCreateView(generics.ListCreateAPIView):
    queryset = AllowanceType.objects.all()
    serializer_class = AllowanceTypeSerializer
    permission_classes = [IsAdminHROrFinance]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name"]


class AllowanceTypeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = AllowanceType.objects.all()
    serializer_class = AllowanceTypeSerializer
    permission_classes = [IsAdminHROrFinance]


class EmployeeAllowanceListCreateView(generics.ListCreateAPIView):
    serializer_class = EmployeeAllowanceSerializer
    permission_classes = [IsAdminHROrFinance]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["employee", "allowance_type", "is_active"]

    def get_queryset(self):
        return EmployeeAllowance.objects.select_related(
            "employee", "allowance_type"
        ).all()


class EmployeeAllowanceDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = EmployeeAllowance.objects.all()
    serializer_class = EmployeeAllowanceSerializer
    permission_classes = [IsAdminHROrFinance]


class OvertimeRateListCreateView(generics.ListCreateAPIView):
    queryset = OvertimeRate.objects.all()
    serializer_class = OvertimeRateSerializer
    permission_classes = [IsAdminHROrFinance]


class OvertimeRateDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = OvertimeRate.objects.all()
    serializer_class = OvertimeRateSerializer
    permission_classes = [IsAdminHROrFinance]


class PayrollSettingsView(APIView):
    """
    GET  /api/salary/payroll-settings/  — Get statutory rates
    PUT  /api/salary/payroll-settings/  — Update statutory rates (Admin/Finance only)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings = PayrollSettings.get_settings()
        return Response(PayrollSettingsSerializer(settings).data)

    def put(self, request):
        if request.user.role not in ("ADMIN", "FINANCE"):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        settings = PayrollSettings.get_settings()
        serializer = PayrollSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class BusinessProfileView(APIView):
    """
    GET  /api/salary/business-profile/  — Get company info
    PUT  /api/salary/business-profile/  — Update company info (Admin only)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = BusinessProfile.get_profile()
        return Response(BusinessProfileSerializer(profile).data)

    def put(self, request):
        if request.user.role not in ("ADMIN",):
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        profile = BusinessProfile.get_profile()
        serializer = BusinessProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PAYETaxBandListView(generics.ListCreateAPIView):
    """
    GET  /api/salary/paye-bands/  — List all PAYE tax bands
    POST /api/salary/paye-bands/  — Add a new band (Admin/Finance only)
    """
    queryset = PAYETaxBand.objects.all()
    serializer_class = PAYETaxBandSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrFinance()]


class PAYETaxBandDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PAYETaxBand.objects.all()
    serializer_class = PAYETaxBandSerializer
    permission_classes = [IsAdminOrFinance]
