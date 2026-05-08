from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('petapp', '0009_communitycomment_media_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='pet',
            name='custom_species',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
