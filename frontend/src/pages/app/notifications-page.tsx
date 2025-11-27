import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BellOff,
  MessageCircle,
  Check,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '@/services/chatApi';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const navigate = useNavigate();

  const { data: notifications, isLoading } = useGetNotificationsQuery();
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [markAllNotificationsRead, { isLoading: isMarkingAll }] =
    useMarkAllNotificationsReadMutation();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

  const handleMarkAsRead = async (id: number) => {
    await markNotificationRead({ id });
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsRead();
  };

  const handleNotificationClick = (notification: {
    id: number;
    chat_room: number | null;
    is_read: boolean;
  }) => {
    if (!notification.is_read) {
      markNotificationRead({ id: notification.id });
    }
    if (notification.chat_room) {
      navigate(`/chat/${notification.chat_room}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-xl border-border/50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Notifications
            </h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
        </div>

        {notifications && notifications.length > 0 && unreadCount > 0 && (
          <Button
            variant="ghost"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            {isMarkingAll ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Mark all as read
          </Button>
        )}
      </header>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {notifications && notifications.length > 0 ? (
          notifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={cn(
                'flex items-start gap-4 px-6 py-4 border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer',
                !notification.is_read && 'bg-primary/5'
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                  notification.chat_room ? 'bg-secondary/10' : 'bg-accent/10'
                )}
              >
                {notification.chat_room ? (
                  <MessageCircle className="w-5 h-5 text-secondary" />
                ) : (
                  <Bell className="w-5 h-5 text-accent" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-foreground',
                    !notification.is_read && 'font-medium'
                  )}
                >
                  {notification.content}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true,
                  })}
                </p>
              </div>

              {!notification.is_read ? (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                  className="p-2 transition-colors rounded-lg hover:bg-muted/50 group"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4 transition-colors text-muted-foreground group-hover:text-primary" />
                </button>
              ) : (
                <div className="p-2">
                  <CheckCheck className="w-4 h-4 text-primary/50" />
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-20 h-20 mb-4 bg-muted/30 rounded-2xl">
              <BellOff className="w-10 h-10 text-muted-foreground" />
            </div>
            <p className="mb-1 font-medium text-foreground">
              No notifications yet
            </p>
            <p className="text-sm text-muted-foreground">
              We'll notify you when something happens
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
