from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('petapp', '0010_pet_custom_species'),
    ]

    operations = [
        migrations.AddField(
            model_name='adoptionapplication',
            name='meeting_location_notes',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='adoptionapplication',
            name='meeting_preference',
            field=models.CharField(blank=True, choices=[('rehomer_home', 'Visit the rehomer / pet location'), ('adopter_home', 'Rehomer visits my place'), ('neutral_place', 'Meet at a neutral place')], max_length=30),
        ),
    ]
