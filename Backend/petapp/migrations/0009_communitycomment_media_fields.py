from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('petapp', '0008_conversation_conversationmessage_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='communitycomment',
            name='image_url',
            field=models.URLField(blank=True),
        ),
        migrations.AddField(
            model_name='communitycomment',
            name='sticker',
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name='communitycomment',
            name='video_url',
            field=models.URLField(blank=True),
        ),
        migrations.AlterField(
            model_name='communitycomment',
            name='body',
            field=models.TextField(blank=True),
        ),
    ]
