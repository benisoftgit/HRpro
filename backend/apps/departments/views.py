"""Departments views."""

from rest_framework import generics, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Department, Position
from .serializers import (
    DepartmentSerializer,
    DepartmentListSerializer,
    PositionSerializer,
    PositionListSerializer,
)
from apps.accounts.permissions import IsAdminOrHR


class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset = Department.objects.all()
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "created_at"]

    def get_serializer_class(self):
        if self.request.query_params.get("simple"):
            return DepartmentListSerializer
        return DepartmentSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]


class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]


class PositionListCreateView(generics.ListCreateAPIView):
    serializer_class = PositionSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["is_active"]
    search_fields = ["title", "grade"]

    def get_serializer_class(self):
        if self.request.query_params.get("simple"):
            return PositionListSerializer
        return PositionSerializer

    def get_queryset(self):
        return Position.objects.all()

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]


class PositionDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Position.objects.all()
    serializer_class = PositionSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]


class PositionListView(generics.ListAPIView):
    """Read-only list for dropdowns (no pagination, simple fields)."""

    queryset = Position.objects.filter(is_active=True)
    serializer_class = PositionListSerializer
    pagination_class = None

    def get_permissions(self):
        return [IsAuthenticated()]
