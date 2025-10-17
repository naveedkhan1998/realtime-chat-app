from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("chat", "0002_friendshipnew_delete_friendship"),
    ]

    operations = [
        migrations.AddField(
            model_name="message",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
    ]
