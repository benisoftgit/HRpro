"""
Management command to seed default Ghana leave types.
Run: python manage.py seed_leave_types
"""

from django.core.management.base import BaseCommand
from apps.leave.models import LeaveType


LEAVE_TYPES = [
    {
        "name": "Annual Leave",
        "days_allowed": 15,
        "is_paid": True,
        "description": "Yearly paid vacation leave entitlement.",
        "requires_documentation": False,
    },
    {
        "name": "Sick Leave",
        "days_allowed": 12,
        "is_paid": True,
        "description": "Leave due to illness or medical condition.",
        "requires_documentation": True,
    },
    {
        "name": "Maternity Leave",
        "days_allowed": 84,
        "is_paid": True,
        "description": "Paid maternity leave for female employees (12 weeks as per Ghana Labour Act).",
        "requires_documentation": True,
    },
    {
        "name": "Paternity Leave",
        "days_allowed": 5,
        "is_paid": True,
        "description": "Paid leave for fathers upon birth of a child.",
        "requires_documentation": True,
    },
    {
        "name": "Casual Leave",
        "days_allowed": 5,
        "is_paid": True,
        "description": "Short-notice leave for personal matters.",
        "requires_documentation": False,
    },
    {
        "name": "Compassionate Leave",
        "days_allowed": 5,
        "is_paid": True,
        "description": "Leave granted for bereavement or family emergency.",
        "requires_documentation": False,
    },
    {
        "name": "Study Leave",
        "days_allowed": 10,
        "is_paid": False,
        "description": "Leave for examinations or approved study programmes.",
        "requires_documentation": True,
    },
    {
        "name": "Unpaid Leave",
        "days_allowed": 30,
        "is_paid": False,
        "description": "Unpaid leave approved by management.",
        "requires_documentation": False,
    },
]


class Command(BaseCommand):
    help = "Seed default Ghana leave types into the database"

    def handle(self, *args, **options):
        created = 0
        skipped = 0

        for lt in LEAVE_TYPES:
            obj, was_created = LeaveType.objects.get_or_create(
                name=lt["name"],
                defaults={
                    "days_allowed": lt["days_allowed"],
                    "is_paid": lt["is_paid"],
                    "description": lt["description"],
                    "requires_documentation": lt["requires_documentation"],
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ Created: {obj.name}"))
            else:
                skipped += 1
                self.stdout.write(f"  — Skipped (exists): {obj.name}")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone. {created} leave types created, {skipped} already existed."
            )
        )
