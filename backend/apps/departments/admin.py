"""Departments admin."""

from django.contrib import admin
from .models import Department, Position


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "head", "is_active"]
    search_fields = ["name", "code"]
    list_filter = ["is_active"]


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ["title", "grade", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["title", "grade"]
