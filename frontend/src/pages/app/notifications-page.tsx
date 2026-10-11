import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  UserPlus,
  Check,
  CheckCheck,
  Loader2,
  Radio,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  Notification,
} from '@/services/chatApi';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import { PageFrame, Module } from '@/components/console/PageFrame';
import { Led, channelNo } from '@/components/console';

type FilterType = 'all' | 'unread';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: notifications, isLoading } = useGetNotificationsQuery(
    undefined,
    { pollingInterval: 10000 }
  );
  const [markNotificationRead, { isLoading: _isMarkingOne }] =
    useMarkNotificationReadMutation();
  const [markAllNotificationsRead, { isLoading: isMarkingAll }] =
    useMarkAllNotificationsReadMutation();

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0;
  const totalCount = notifications?.length || 0;

  const filteredNotifications = (notifications || []).filter(item => {
    if (filter === 'unread') return !item.is_read;
    return true;
  });

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
    } else {
      navigate('/chat');
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
        typeLabel: 'VOX BROADCAST',
        icon: Radio,
        tone: 'live' as const,
      };
    }
    if (lower.includes('friend') || lower.includes('request') || lower.includes('connected')) {
      return {
        typeLabel: 'OPERATOR LINK',
        icon: UserPlus,
        tone: 'signal' as const,
      };
    }
    return {
      typeLabel: hasChatRoom ? 'CHANNEL PACKET' : 'DISPATCH SIGNAL',
      icon: MessageSquare,
      tone: 'off' as const,
    };
  };

  return (
    <>
      <Helmet>
        <title>Activity Signals | MNK Chat</title>
      </Helmet>

      <PageFrame
        code="03"
        section="Signals"
        title="Activity Log"
        description="Chronological log of transmissions, voice station invites, and operator alerts."
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAll}
              className="font-mono text-xs font-bold gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>ACKNOWLEDGE ALL</span>
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {/* Signal Filter Rocker */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-well shadow-well max-w-xs">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'flex-1 py-1 rounded-full font-mono text-xs font-bold transition-all',
                filter === 'all'
                  ? 'bg-card text-foreground shadow-key'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              ALL LOGS ({totalCount})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                'flex-1 py-1 rounded-full font-mono text-xs font-bold transition-all flex items-center justify-center gap-1.5',
                filter === 'unread'
                  ? 'bg-card text-foreground shadow-key'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {unreadCount > 0 && <Led tone="signal" />}
              <span>UNACKNOWLEDGED ({unreadCount})</span>
            </button>
          </div>

          {/* Activity Log Tape */}
          <Module label="SIGNAL FEED" title={`Logged Packets (${filteredNotifications.length})`}>
            {isLoading ? (
              <div className="flex items-center justify-center py-10 gap-2 font-mono text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>SYNCING SIGNAL FEED...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-16 h-8 mx-auto mb-3 grille opacity-40 rounded" />
                <p className="font-mono text-xs font-bold text-foreground">
                  NO SIGNALS LOGGED
                </p>
                <p className="font-mono text-[11px] text-muted-foreground mt-1">
                  {filter === 'unread'
                    ? 'All historical packets have been acknowledged.'
                    : 'System standby. Incoming dispatches will appear here.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border -mx-4 -my-4">
                {filteredNotifications.map(notification => {
                  const details = getNotificationDetails(
                    notification.content,
                    Boolean(notification.chat_room)
                  );
                  const Icon = details.icon;
                  const timeAgo = formatDistanceToNow(
                    new Date(notification.created_at),
                    { addSuffix: true }
                  ).toUpperCase();

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        'flex items-start gap-3 p-3.5 transition-colors cursor-pointer group',
                        !notification.is_read
                          ? 'bg-well/60 hover:bg-well'
                          : 'hover:bg-accent/40'
                      )}
                    >
                      {/* Left Status Icon */}
                      <div className="relative mt-0.5 shrink-0">
                        <div
                          className={cn(
                            'size-8 rounded-lg flex items-center justify-center key',
                            details.tone === 'live' && 'text-live',
                            details.tone === 'signal' && 'text-primary'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {!notification.is_read && (
                          <Led
                            tone="signal"
                            className="absolute -top-1 -right-1 ring-1 ring-card"
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {details.typeLabel}
                            {notification.chat_room && (
                              <span className="text-foreground ml-1">
                                [CH·{channelNo(notification.chat_room)}]
                              </span>
                            )}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground tabular shrink-0">
                            {timeAgo}
                          </span>
                        </div>

                        <p className={cn(
                          'text-xs mt-0.5 leading-relaxed',
                          !notification.is_read ? 'text-foreground font-semibold' : 'text-muted-foreground'
                        )}>
                          {notification.content}
                        </p>
                      </div>

                      {/* Right Action */}
                      {!notification.is_read && (
                        <button
                          type="button"
                          onClick={e => handleMarkAsRead(e, notification.id)}
                          className="size-7 rounded-md key flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                          title="Acknowledge packet"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Module>
        </div>
      </PageFrame>
    </>
  );
}
