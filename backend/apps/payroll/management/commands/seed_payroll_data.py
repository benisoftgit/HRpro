"""
Management command to seed Ghana PAYE tax bands and default salary data.
Run: python manage.py seed_payroll_data
"""

from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone


PAYE_BANDS = [
    {"order": 1, "annual_limit": Decimal("4380.00"), "rate": Decimal("0.0000"), "description": "First GHS 4,380 — tax free"},
    {"order": 2, "annual_limit": Decimal("1320.00"), "rate": Decimal("0.0500"), "description": "Next GHS 1,320 — 5%"},
    {"order": 3, "annual_limit": Decimal("1560.00"), "rate": Decimal("0.1000"), "description": "Next GHS 1,560 — 10%"},
    {"order": 4, "annual_limit": Decimal("38000.00"), "rate": Decimal("0.1750"), "description": "Next GHS 38,000 — 17.5%"},
    {"order": 5, "annual_limit": Decimal("192000.00"), "rate": Decimal("0.2500"), "description": "Next GHS 192,000 — 25%"},
    {"order": 6, "annual_limit": None, "rate": Decimal("0.3000"), "description": "Above GHS 237,200 — 30%"},
]

DEFAULT_SALARIES = {
    "Senior Accountant": Decimal("4500.00"),
    "HR Manager": Decimal("5000.00"),
    "Administrative Manager": Decimal("4000.00"),
}


class Command(BaseCommand):
    help = "Seed Ghana PAYE tax bands and default salary data"

    def handle(self, *args, **options):
        self._seed_paye_bands()
        self._seed_position_salaries()
        self._seed_salary_structures()
        self.stdout.write(self.style.SUCCESS("\nDone. Payroll seed data complete."))

    def _seed_paye_bands(self):
        from apps.salary.models import PAYETaxBand

        created = 0
        skipped = 0

        for band in PAYE_BANDS:
            obj, was_created = PAYETaxBand.objects.get_or_create(
                order=band["order"],
                defaults={
                    "annual_limit": band["annual_limit"],
                    "rate": band["rate"],
                    "description": band["description"],
                },
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"  [OK] PAYE Band {obj.order}: {obj}"))
            else:
                skipped += 1
                self.stdout.write(f"  [--] PAYE Band {obj.order}: already exists")

        self.stdout.write(f"  PAYE bands: {created} created, {skipped} skipped")

    def _seed_position_salaries(self):
        from apps.departments.models import Position

        updated = 0
        skipped = 0

        for title, salary in DEFAULT_SALARIES.items():
            positions = Position.objects.filter(title=title, basic_salary__isnull=True)
            for pos in positions:
                pos.basic_salary = salary
                pos.save(update_fields=["basic_salary"])
                updated += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [OK] Set {pos.title} -> GHS {salary:,.2f}"
                    )
                )

            existing = Position.objects.filter(title=title, basic_salary__isnull=False).count()
            if existing:
                skipped += existing
                self.stdout.write(f"  [--] {title}: salary already set ({existing} position(s))")

        self.stdout.write(f"  Position salaries: {updated} updated, {skipped} skipped")

    def _seed_salary_structures(self):
        from apps.salary.models import SalaryStructure
        from apps.employees.models import Employee

        today = timezone.now().date()
        created = 0
        skipped = 0

        for employee in Employee.objects.filter(employment_status="ACTIVE"):
            existing = SalaryStructure.objects.filter(employee=employee, is_active=True).exists()
            if existing:
                skipped += 1
                self.stdout.write(f"  [--] {employee.full_name}: salary structure already exists")
                continue

            if employee.position and employee.position.basic_salary:
                SalaryStructure.objects.create(
                    employee=employee,
                    basic_salary=employee.position.basic_salary,
                    effective_date=today,
                    is_active=True,
                )
                created += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"  [OK] {employee.full_name}: salary structure GHS {employee.position.basic_salary:,.2f}"
                    )
                )
            else:
                skipped += 1
                self.stdout.write(
                    self.style.WARNING(f"  [!!] {employee.full_name}: no position salary, skipping")
                )

        self.stdout.write(f"  Salary structures: {created} created, {skipped} skipped")
