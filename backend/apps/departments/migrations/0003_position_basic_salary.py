from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('departments', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='position',
            name='basic_salary',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text=(
                    'Default basic salary for this position. '
                    'Used as payroll fallback when an employee has no individual salary structure.'
                ),
                max_digits=12,
                null=True,
            ),
        ),
    ]
