from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("petapp", "0012_notification_application_notification_conversation_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="adoptionapplication",
            name="visit_confirmed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="adoptionapplication",
            name="visit_proposed_by",
            field=models.CharField(
                blank=True,
                choices=[("adopter", "Adopter"), ("rehomer", "Rehomer")],
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="adoptionapplication",
            name="visit_status",
            field=models.CharField(
                choices=[
                    ("not_started", "Not Started"),
                    ("proposed", "Proposed"),
                    ("agreed", "Agreed"),
                ],
                default="not_started",
                max_length=20,
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
                    ("visit_agreed", "Visit Agreed"),
                ],
                max_length=50,
            ),
        ),
    ]
