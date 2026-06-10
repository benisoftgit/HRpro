"""Performance Management views."""

from django.utils import timezone
from rest_framework import generics, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .models import ReviewCycle, PerformanceReview, KPI, ReviewComment
from .serializers import (
    ReviewCycleSerializer,
    PerformanceReviewListSerializer,
    PerformanceReviewDetailSerializer,
    KPISerializer,
    ReviewCommentSerializer,
)
from apps.accounts.permissions import IsAdminOrHR


# ---------------------------------------------------------------------------
# Review Cycles
# ---------------------------------------------------------------------------

class ReviewCycleListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/performance/cycles/      — List all cycles
    POST /api/performance/cycles/      — Create a new cycle (Admin/HR)
    """
    serializer_class = ReviewCycleSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status"]
    ordering_fields = ["start_date", "end_date", "name"]
    ordering = ["-start_date"]

    def get_queryset(self):
        return ReviewCycle.objects.all()

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ReviewCycleDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/performance/cycles/<id>/  — Retrieve
    PATCH  /api/performance/cycles/<id>/  — Update (Admin/HR)
    DELETE /api/performance/cycles/<id>/  — Delete (Admin only)
    """
    queryset = ReviewCycle.objects.all()
    serializer_class = ReviewCycleSerializer

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]


# ---------------------------------------------------------------------------
# Performance Reviews
# ---------------------------------------------------------------------------

class PerformanceReviewListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/performance/reviews/      — List reviews (scoped by role)
    POST /api/performance/reviews/      — Create review (Admin/HR)
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["cycle", "employee", "status", "reviewer"]
    search_fields = ["employee__first_name", "employee__last_name", "employee__employee_id"]
    ordering_fields = ["created_at", "final_rating", "employee__last_name"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        return PerformanceReviewListSerializer

    def get_queryset(self):
        user = self.request.user
        qs = PerformanceReview.objects.select_related(
            "cycle", "employee", "employee__department",
            "employee__position", "reviewer"
        ).prefetch_related("kpis")

        if user.role == "EMPLOYEE" and user.employee:
            # Employees see only their own reviews
            return qs.filter(employee=user.employee)
        if user.role == "MANAGER" and user.employee:
            # Managers see their direct reports' reviews
            return qs.filter(employee__manager=user.employee)
        return qs.all()

    def get_permissions(self):
        if self.request.method == "GET":
            return [IsAuthenticated()]
        return [IsAdminOrHR()]

    def perform_create(self, serializer):
        employee = serializer.validated_data.get("employee")
        reviewer = None
        if employee and employee.manager:
            try:
                reviewer = employee.manager.user_account
            except Exception:
                reviewer = None
        serializer.save(reviewer=reviewer)


class PerformanceReviewDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/performance/reviews/<id>/  — Full detail with KPIs + comments
    PATCH /api/performance/reviews/<id>/  — Update review fields
    """
    serializer_class = PerformanceReviewDetailSerializer

    def get_queryset(self):
        return PerformanceReview.objects.select_related(
            "cycle", "employee", "employee__department",
            "employee__position", "reviewer"
        ).prefetch_related("kpis", "comments__author")

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_object(self):
        obj = super().get_object()
        user = self.request.user
        # Employees can only view/update their own review
        if user.role == "EMPLOYEE":
            if not user.employee or user.employee.id != obj.employee.id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only access your own review.")
        return obj


class ReviewStatusActionView(APIView):
    """
    POST /api/performance/reviews/<id>/action/
    Advance a review through its workflow stages.

    Body: { "action": "submit_self" | "submit_manager" | "submit_hr" | "complete" }
    """
    permission_classes = [IsAuthenticated]

    VALID_ACTIONS = ["submit_self", "submit_manager", "submit_hr", "complete"]

    def post(self, request, pk):
        try:
            review = PerformanceReview.objects.get(pk=pk)
        except PerformanceReview.DoesNotExist:
            return Response({"detail": "Review not found."}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get("action")
        if action not in self.VALID_ACTIONS:
            return Response(
                {"detail": f"Invalid action. Choose from: {self.VALID_ACTIONS}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        now = timezone.now()

        if action == "submit_self":
            if review.status != PerformanceReview.Status.PENDING:
                return Response({"detail": "Review is not in PENDING state."}, status=400)
            if user.role != "EMPLOYEE" and user.role not in ("ADMIN", "HR"):
                return Response({"detail": "Only the employee can submit self-review."}, status=403)
            review.status = PerformanceReview.Status.SELF_REVIEW
            review.submitted_at = now

        elif action == "submit_manager":
            if review.status != PerformanceReview.Status.SELF_REVIEW:
                return Response({"detail": "Review is not in SELF_REVIEW state."}, status=400)
            if user.role not in ("MANAGER", "ADMIN", "HR"):
                return Response({"detail": "Only a manager can submit the manager review."}, status=403)
            review.status = PerformanceReview.Status.MANAGER_REVIEW
            review.reviewer = user

        elif action == "submit_hr":
            if review.status != PerformanceReview.Status.MANAGER_REVIEW:
                return Response({"detail": "Review is not in MANAGER_REVIEW state."}, status=400)
            if user.role not in ("ADMIN", "HR"):
                return Response({"detail": "Only HR/Admin can submit HR review."}, status=403)
            review.status = PerformanceReview.Status.HR_REVIEW

        elif action == "complete":
            if review.status != PerformanceReview.Status.HR_REVIEW:
                return Response({"detail": "Review is not in HR_REVIEW state."}, status=400)
            if user.role not in ("ADMIN", "HR"):
                return Response({"detail": "Only HR/Admin can complete a review."}, status=403)
            review.status = PerformanceReview.Status.COMPLETED
            review.completed_at = now

        review.save()
        serializer = PerformanceReviewDetailSerializer(review)
        return Response(serializer.data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# KPIs
# ---------------------------------------------------------------------------

class KPIListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/performance/kpis/?review=<id>   — List KPIs for a review
    POST /api/performance/kpis/               — Add a KPI
    """
    serializer_class = KPISerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["review", "category"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return KPI.objects.select_related("review__employee").all()


class KPIDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = KPI.objects.all()
    serializer_class = KPISerializer
    permission_classes = [IsAuthenticated]


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

class ReviewCommentListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/performance/comments/?review=<id>  — List comments for a review
    POST /api/performance/comments/              — Add a comment
    """
    serializer_class = ReviewCommentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["review"]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReviewComment.objects.select_related("author").all()

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# ---------------------------------------------------------------------------
# Dashboard / Summary
# ---------------------------------------------------------------------------

class PerformanceDashboardView(APIView):
    """
    GET /api/performance/dashboard/?cycle=<id>
    Returns high-level stats for a given review cycle.
    """
    permission_classes = [IsAdminOrHR]

    def get(self, request):
        cycle_id = request.query_params.get("cycle")
        qs = PerformanceReview.objects.all()
        if cycle_id:
            qs = qs.filter(cycle_id=cycle_id)

        total = qs.count()
        by_status = {}
        for s in PerformanceReview.Status:
            by_status[s.value] = qs.filter(status=s.value).count()

        # Average final ratings (only where set)
        rated = [r.final_rating for r in qs if r.final_rating is not None]
        avg_rating = round(sum(rated) / len(rated), 2) if rated else None

        # Rating distribution
        distribution = {str(i): rated.count(i) for i in range(1, 6)}

        return Response({
            "total_reviews": total,
            "by_status": by_status,
            "average_final_rating": avg_rating,
            "rating_distribution": distribution,
        })
