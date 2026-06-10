# Generated manually — multi-stage leave approval

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def migrate_old_approvals(apps, schema_editor):
    LeaveRequest = apps.get_model("leave", "LeaveRequest")
    for req in LeaveRequest.objects.all():
        if req.status == "APPROVED":
            # Map old single-stage approval to HR authorization
            req.status = "HR_AUTHORIZED"
            req.hr_authorized_by = req.approved_by
            req.hr_authorized_at = req.updated_at
        elif req.status == "REJECTED":
            req.rejected_by = req.approved_by
            req.rejected_at = req.updated_at
        req.save()


class Migration(migrations.Migration):

    dependencies = [
        ("leave", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterField(
            model_name="leaverequest",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("MANAGER_APPROVED", "Manager Approved"),
                    ("HR_AUTHORIZED", "HR Authorized"),
                    ("MD_AUTHORIZED", "MD Authorized"),
                    ("REJECTED", "Rejected"),
                    ("CANCELLED", "Cancelled"),
                ],
                default="PENDING",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="leaverequest",
            name="manager_approved_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="leave_manager_approvals",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="leaverequest",
            name="manager_approved_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="leaverequest",
            name="hr_authorized_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="leave_hr_authorizations",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="leaverequest",
            name="hr_authorized_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="leaverequest",
            name="md_authorized_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="leave_md_authorizations",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="leaverequest",
            name="md_authorized_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="leaverequest",
            name="rejected_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="leave_rejections",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="leaverequest",
            name="rejected_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(migrate_old_approvals, reverse_code=migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="leaverequest",
            name="approved_by",
        ),
    ]
