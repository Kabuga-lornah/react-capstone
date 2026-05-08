from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("petapp", "0013_adoptionapplication_visit_fields_and_notification_visit_agreed"),
    ]

    operations = [
        migrations.AddField(
            model_name="pet",
            name="deworming_proof_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="pet",
            name="neutering_proof_url",
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name="pet",
            name="vaccination_proof_url",
            field=models.URLField(blank=True),
        ),
    ]
