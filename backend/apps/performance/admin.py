from django.contrib import admin
from .models import ReviewCycle, PerformanceReview, KPI, ReviewComment


@admin.register(ReviewCycle)
class ReviewCycleAdmin(admin.ModelAdmin):
    list_display = ["name", "start_date", "end_date", "status"]
    list_filter = ["status"]
    search_fields = ["name"]


class KPIInline(admin.TabularInline):
    model = KPI
    extra = 1
    fields = ["title", "category", "weight", "target", "actual_value", "achievement_score"]


@admin.register(PerformanceReview)
class PerformanceReviewAdmin(admin.ModelAdmin):
    list_display = ["employee", "cycle", "status", "self_rating", "manager_rating", "final_rating"]
    list_filter = ["status", "cycle"]
    search_fields = ["employee__first_name", "employee__last_name"]
    inlines = [KPIInline]


@admin.register(KPI)
class KPIAdmin(admin.ModelAdmin):
    list_display = ["title", "review", "category", "weight", "achievement_score"]
    list_filter = ["category"]
    search_fields = ["title"]


@admin.register(ReviewComment)
class ReviewCommentAdmin(admin.ModelAdmin):
    list_display = ["review", "author", "created_at"]
