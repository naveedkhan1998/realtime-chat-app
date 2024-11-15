# Generated by Django 5.1.3 on 2024-11-14 08:34

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ChatRoom',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(blank=True, max_length=255, null=True)),
                ('is_group_chat', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='ChatRoomParticipant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('chat_room', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='chat.chatroom')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='chatroom',
            name='participants',
            field=models.ManyToManyField(related_name='chat_rooms', through='chat.ChatRoomParticipant', to=settings.AUTH_USER_MODEL),
        ),
        migrations.CreateModel(
            name='Friendship',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('users', models.ManyToManyField(related_name='friendships', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Message',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField()),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('chat_room', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='chat.chatroom')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_messages', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddField(
            model_name='chatroomparticipant',
            name='last_read_message',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='chat.message'),
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('is_read', models.BooleanField(default=False)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='FriendRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('accepted', 'Accepted'), ('declined', 'Declined')], default='pending', max_length=10)),
                ('from_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_friend_requests', to=settings.AUTH_USER_MODEL)),
                ('to_user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='received_friend_requests', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('from_user', 'to_user')},
            },
        ),
        migrations.AlterUniqueTogether(
            name='chatroomparticipant',
            unique_together={('chat_room', 'user')},
        ),
        migrations.CreateModel(
            name='MessageReadReceipt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('read_at', models.DateTimeField(auto_now_add=True)),
                ('message', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='read_receipts', to='chat.message')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='message_read_receipts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('message', 'user')},
            },
        ),
        migrations.CreateModel(
            name='TypingStatus',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_typing', models.BooleanField(default=False)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('chat_room', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='typing_statuses', to='chat.chatroom')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='typing_statuses', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('chat_room', 'user')},
            },
        ),
    ]
