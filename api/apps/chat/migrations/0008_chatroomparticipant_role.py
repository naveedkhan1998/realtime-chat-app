# Generated migration for adding role field to ChatRoomParticipant

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0007_message_attachment_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='chatroomparticipant',
            name='role',
            field=models.CharField(
                choices=[('admin', 'Admin'), ('member', 'Member')],
                default='member',
                max_length=10,
            ),
        ),
    ]
