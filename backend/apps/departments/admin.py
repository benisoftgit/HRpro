"""Departments admin."""

from django.contrib import admin
from .models import Department, Position


class PositionInline(admin.TabularInline):
    model = Position
    extra = 1


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "head", "is_active"]
    search_fields = ["name", "code"]
    list_filter = ["is_active"]
    inlines = [PositionInline]


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ["title", "department", "grade", "is_active"]
    list_filter = ["department", "is_active"]
    search_fields = ["title", "grade"]
