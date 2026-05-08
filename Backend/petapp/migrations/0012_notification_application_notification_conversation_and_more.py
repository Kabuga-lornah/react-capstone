from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("petapp", "0011_adoptionapplication_meeting_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="notification",
            name="application",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="notifications",
                to="petapp.adoptionapplication",
            ),
        ),
        migrations.AddField(
            model_name="notification",
            name="conversation",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="notifications",
                to="petapp.conversation",
            ),
        ),
        migrations.AlterField(
            model_name="notification",
            name="type",
            field=models.CharField(
                choices=[
                    ("wishlist_saved", "Wishlist Saved"),
                    ("chat_message", "Chat Message"),
                    ("application_submitted", "Application Submitted"),
                    ("application_approved", "Application Approved"),
                    ("application_rejected", "Application Rejected"),
                    ("visit_proposed", "Visit Proposed"),
                ],
                max_length=50,
            ),
        ),
    ]
