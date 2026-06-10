"""Performance Management URL patterns."""

from django.urls import path
from .views import (
    ReviewCycleListCreateView,
    ReviewCycleDetailView,
    PerformanceReviewListCreateView,
    PerformanceReviewDetailView,
    ReviewStatusActionView,
    KPIListCreateView,
    KPIDetailView,
    ReviewCommentListCreateView,
    PerformanceDashboardView,
)

urlpatterns = [
    # Cycles
    path("cycles/", ReviewCycleListCreateView.as_view(), name="cycle-list"),
    path("cycles/<int:pk>/", ReviewCycleDetailView.as_view(), name="cycle-detail"),

    # Reviews
    path("reviews/", PerformanceReviewListCreateView.as_view(), name="review-list"),
    path("reviews/<int:pk>/", PerformanceReviewDetailView.as_view(), name="review-detail"),
    path("reviews/<int:pk>/action/", ReviewStatusActionView.as_view(), name="review-action"),

    # KPIs / KRAs
    path("kpis/", KPIListCreateView.as_view(), name="kpi-list"),
    path("kpis/<int:pk>/", KPIDetailView.as_view(), name="kpi-detail"),

    # Comments
    path("comments/", ReviewCommentListCreateView.as_view(), name="review-comment-list"),

    # Dashboard
    path("dashboard/", PerformanceDashboardView.as_view(), name="performance-dashboard"),
]
