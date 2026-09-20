import { useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/hooks';

import {
  useGetChatRoomsQuery,
  useMarkRoomNotificationsReadMutation,
  chatApi,
} from '@/services/chatApi';
import { useRoomSubscription } from '@/hooks/useUnifiedWebSocket';
import { clearUnreadNotification } from '@/features/unifiedChatSlice';
import ChatWindow from '@/components/custom/ChatWindow';
import { AppShellContext } from '@/layouts/AppShell';
import {
  MessageSquarePlus,
  Bell,
  Radio,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';

export default function ChatPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { activeChat, setActiveChat, isMobile } =
    useOutletContext<AppShellContext>();
  const user = useAppSelector(state => state.auth.user);

  const { activeRoom } = useGetChatRoomsQuery(undefined, {
    selectFromResult: ({ data }) => ({
      activeRoom: data?.find(room => room.id === activeChat),
    }),
  });

  const [markRoomNotificationsRead] = useMarkRoomNotificationsReadMutation();

  // Mark notifications as read when opening a chat
  useEffect(() => {
    if (activeChat) {
      // Clear local Redux state immediately
      dispatch(clearUnreadNotification(activeChat));

      // Reset unread count in the chat rooms cache
      dispatch(
        chatApi.util.updateQueryData('getChatRooms', undefined, draft => {
          const room = draft.find(r => r.id === activeChat);
          if (room) {
            room.unread_count = 0;
          }
        })
      );

      // Mark notifications as read in the backend
      markRoomNotificationsRead({ chat_room_id: activeChat });
    }
  }, [activeChat, dispatch, markRoomNotificationsRead]);

  const pageTitle = activeRoom
    ? `${activeRoom.name || 'Chat'} | MNK Chat`
    : 'Conversations | MNK Chat';

  // Subscribe to the active chat room using the unified WebSocket
  useRoomSubscription(activeChat ?? null);

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 w-full h-full">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      {activeChat ? (
        <ChatWindow
          user={user}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          isMobile={isMobile}
          activeRoom={activeRoom}
        />
      ) : (
        <div className="relative flex flex-col items-center justify-center h-full p-6 sm:p-10 overflow-y-auto text-center custom-scrollbar">
          {/* Decorative ambient background glows */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-lg w-full space-y-8 my-auto py-8">
            {/* User Greeting Hero */}
            <div className="space-y-4 text-center">
              <div className="relative inline-block">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl border-2 border-border/80 shadow-xl ring-4 ring-primary/10">
                  <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/15 text-primary rounded-3xl">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-1.5 shadow-md border border-border">
                  <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                </div>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Welcome back, <span className="text-primary">{user.name}</span>
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground max-w-sm mx-auto">
                  Pick a conversation from the sidebar or start something new right away.
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
              <Button
                onClick={() => navigate('/new-chat')}
                className="h-12 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20 gap-2.5 font-semibold text-sm active:scale-95 transition-all"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>New Conversation</span>
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/notifications')}
                className="h-12 rounded-2xl border-border/80 bg-card/80 hover:bg-card hover:border-border text-foreground gap-2.5 font-semibold text-sm active:scale-95 transition-all"
              >
                <Bell className="w-4 h-4 text-primary" />
                <span>View Activity</span>
              </Button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 max-w-md mx-auto text-left">
              <div className="p-3 rounded-2xl bg-card/60 dark:bg-card/40 border border-border/60 backdrop-blur-md">
                <Zap className="w-4 h-4 text-primary mb-1.5" />
                <p className="text-xs font-bold text-foreground">Instant Sync</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Unified WebSocket feed
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-card/60 dark:bg-card/40 border border-border/60 backdrop-blur-md">
                <Radio className="w-4 h-4 text-emerald-500 mb-1.5" />
                <p className="text-xs font-bold text-foreground">Voice Calls</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Low latency WebRTC
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-card/60 dark:bg-card/40 border border-border/60 backdrop-blur-md">
                <Shield className="w-4 h-4 text-indigo-500 mb-1.5" />
                <p className="text-xs font-bold text-foreground">Realtime Media</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Photos, docs & files
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
