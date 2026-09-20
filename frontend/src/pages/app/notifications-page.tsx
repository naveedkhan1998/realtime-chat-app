import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BellOff,
  MessageSquare,
  UserPlus,
  Check,
  CheckCheck,
  Loader2,
  ChevronRight,
  Sparkles,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  Notification,
} from '@/services/chatApi';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';

type FilterType = 'all' | 'unread';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: notifications, isLoading } = useGetNotificationsQuery(
    undefined,
    {
      pollingInterval: 10000,
    }
  );
  const [markNotificationRead, { isLoading: isMarkingOne }] =
    useMarkNotificationReadMutation();
  const [markAllNotificationsRead, { isLoading: isMarkingAll }] =
    useMarkAllNotificationsReadMutation();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  const totalCount = notifications?.length || 0;

  const filteredNotifications = (notifications || []).filter(item => {
    if (filter === 'unread') return !item.is_read;
    return true;
  });

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/chat');
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await markNotificationRead({ id }).unwrap();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead().unwrap();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead({ id: notification.id }).unwrap();
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }
    if (notification.chat_room) {
      navigate(`/chat/${notification.chat_room}`);
    } else if (
      notification.content.toLowerCase().includes('friend') ||
      notification.content.toLowerCase().includes('request')
    ) {
      navigate('/friends');
    }
  };

  const getNotificationDetails = (content: string, hasChatRoom: boolean) => {
    const lower = content.toLowerCase();
    if (
      lower.includes('huddle') ||
      lower.includes('voice') ||
      lower.includes('call')
    ) {
      return {
        icon: Radio,
        color: 'text-purple-400',
        bg: 'bg-purple-500/15 border-purple-500/25',
        category: 'Audio Huddle',
      };
    }
    if (hasChatRoom || lower.includes('message') || lower.includes('sent')) {
      return {
        icon: MessageSquare,
        color: 'text-primary',
        bg: 'bg-primary/15 border-primary/25',
        category: 'Conversation',
      };
    }
    if (
      lower.includes('friend') ||
      lower.includes('request') ||
      lower.includes('connect')
    ) {
      return {
        icon: UserPlus,
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/15 border-emerald-500/25',
        category: 'Connection',
      };
    }
    return {
      icon: Bell,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/15 border-indigo-500/25',
      category: 'Workspace Alert',
    };
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/50">
      <Helmet>
        <title>Alerts & Notifications | MNK Chat</title>
        <meta
          name="description"
          content="Review activity, unread chat mentions, and friend requests"
        />
      </Helmet>

      {/* Header - Modern Glass Banner */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b bg-card/60 backdrop-blur-xl border-border/50">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            aria-label="Back to chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold truncate text-foreground tracking-tight flex items-center gap-2">
              <span>Notifications & Activity</span>
            </h1>
            <p className="text-xs sm:text-sm truncate text-muted-foreground hidden xs:block">
              {unreadCount > 0
                ? `You have ${unreadCount} unread ${unreadCount === 1 ? 'alert' : 'alerts'}`
                : 'All activity caught up and acknowledged'}
            </p>
          </div>
        </div>

        {/* Quick Header Action */}
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="h-9 px-3 rounded-xl border-border/60 text-xs font-semibold text-primary hover:bg-primary/10 hover:border-primary/30 transition-all gap-1.5 shadow-sm"
            >
              {isMarkingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Mark all as read</span>
            </Button>
          )}
        </div>
      </header>

      {/* Modern Filter Segmented Bar */}
      <div className="px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-border/40 bg-card/30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200',
              filter === 'all'
                ? 'bg-card text-foreground shadow-sm border border-border/50 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            )}
          >
            <span>All Activity</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-bold">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 relative',
              filter === 'unread'
                ? 'bg-card text-foreground shadow-sm border border-border/50 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            )}
          >
            <span>Unread</span>
            {unreadCount > 0 ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground font-bold animate-pulse">
                {unreadCount}
              </span>
            ) : (
              <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground font-bold">
                0
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications Scroll Container */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 py-4 pb-28 sm:pb-12">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Loading notifications...
              </p>
            </div>
          ) : filteredNotifications.length > 0 ? (
            <div className="space-y-3">
              {filteredNotifications.map(notification => {
                const details = getNotificationDetails(
                  notification.content,
                  Boolean(notification.chat_room)
                );
                const IconComponent = details.icon;

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'group relative flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 cursor-pointer backdrop-blur-xl overflow-hidden',
                      !notification.is_read
                        ? 'bg-card/85 border-primary/40 hover:border-primary/60 shadow-md shadow-primary/5 ring-1 ring-primary/20'
                        : 'bg-card/40 border-border/40 hover:bg-card/65 hover:border-border/60'
                    )}
                  >
                    {/* Linear-style Left Active Bar for unread items */}
                    {!notification.is_read && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-indigo-500 rounded-r-full" />
                    )}

                    {/* Category Icon */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm',
                        details.bg,
                        details.color
                      )}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold py-0 px-1.5 rounded-md border-border/50 text-muted-foreground"
                        >
                          {details.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground/80">
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            { addSuffix: true }
                          )}
                        </span>
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse ml-auto" />
                        )}
                      </div>

                      <p
                        className={cn(
                          'text-sm sm:text-base leading-snug',
                          !notification.is_read
                            ? 'font-bold text-foreground'
                            : 'font-normal text-foreground/80'
                        )}
                      >
                        {notification.content}
                      </p>

                      {notification.chat_room && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                            Open Conversation
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Action: Mark as Read */}
                    <div className="flex items-center gap-1 shrink-0 self-center">
                      {!notification.is_read ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => handleMarkAsRead(e, notification.id)}
                          disabled={isMarkingOne}
                          className="w-8 h-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Mark as read"
                          aria-label="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      ) : (
                        <div className="w-8 h-8 flex items-center justify-center text-muted-foreground/40">
                          <CheckCheck className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : filter === 'unread' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
              <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                All caught up!
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                You have no unread notifications. New mentions, direct messages,
                and requests will appear here in real-time.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter('all')}
                className="mt-5 rounded-xl border-border/60 text-xs font-semibold hover:bg-card transition-all"
              >
                View all activity
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
              <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-3xl bg-muted/40 border border-border/60 text-muted-foreground/70 shadow-inner">
                <BellOff className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                No notifications yet
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                We'll keep you updated when team members send messages, invite
                you to channels, or start voice huddles.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
