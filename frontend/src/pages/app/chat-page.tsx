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
  Cpu,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getAvatarUrl } from '@/lib/utils';
import { Helmet } from 'react-helmet-async';
import { BrandMark } from '@/components/console/BrandMark';
import { Lcd, LcdClock, Led, channelNo } from '@/components/console';

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
    : 'Console | MNK Chat';

  // Subscribe to the active chat room using the unified WebSocket
  useRoomSubscription(activeChat ?? null);

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 w-full h-full bg-card overflow-hidden">
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
        <div className="relative flex flex-col items-center justify-center h-full p-4 sm:p-8 overflow-y-auto custom-scrollbar">
          {/* Hardware Perforation / Grille Accents */}
          <div className="absolute inset-x-8 top-8 h-8 grille opacity-30 pointer-events-none" />

          <div className="relative z-10 max-w-lg w-full space-y-6 my-auto py-6">
            {/* Status Panel Header */}
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <BrandMark size={32} />
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-foreground">
                  TRANSCEIVER READY
                </span>
              </div>
              <Lcd className="px-2.5 py-1 text-xs">
                <LcdClock />
              </Lcd>
            </div>

            {/* Operator Card */}
            <div className="panel p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-14 h-14 border border-border shadow-md">
                    <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
                    <AvatarFallback className="font-mono text-base font-bold bg-well">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Led tone="live" className="absolute bottom-0 right-0 ring-2 ring-card" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="display-wide text-xl font-bold text-foreground truncate">
                      {user.name}
                    </h2>
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground mt-0.5 tracking-wider">
                    OPERATOR ID: OP·{channelNo(user.id)} · SYSTEM NOMINAL
                  </p>
                </div>
              </div>

              <div className="ticks h-2 opacity-50" />

              <p className="text-xs text-muted-foreground leading-relaxed">
                Hardware bus connected. Select a frequency from the channel bank or initialize a new transmission patch.
              </p>

              {/* Action Keys */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <Button
                  onClick={() => navigate('/new-chat')}
                  variant="default"
                  className="h-10 font-mono text-xs tracking-wider gap-2 shadow-key"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>PATCH NEW CHANNEL</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/notifications')}
                  className="h-10 font-mono text-xs tracking-wider gap-2 shadow-key"
                >
                  <Bell className="w-4 h-4 text-primary" />
                  <span>SIGNALS LOG</span>
                </Button>
              </div>
            </div>

            {/* Module Specs Bar */}
            <div className="grid grid-cols-3 gap-2 text-left">
              <div className="p-2.5 rounded-lg bg-well shadow-well">
                <div className="flex items-center justify-between mb-1">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  <span className="font-mono text-[9px] text-muted-foreground">BUS 01</span>
                </div>
                <p className="font-mono text-[11px] font-bold text-foreground">WS / DISPATCH</p>
                <p className="font-mono text-[9px] text-muted-foreground">LOW LATENCY</p>
              </div>

              <div className="p-2.5 rounded-lg bg-well shadow-well">
                <div className="flex items-center justify-between mb-1">
                  <Radio className="w-3.5 h-3.5 text-live" />
                  <span className="font-mono text-[9px] text-muted-foreground">VOX 02</span>
                </div>
                <p className="font-mono text-[11px] font-bold text-foreground">WEBRTC SFU</p>
                <p className="font-mono text-[9px] text-muted-foreground">VOICE HUDDLES</p>
              </div>

              <div className="p-2.5 rounded-lg bg-well shadow-well">
                <div className="flex items-center justify-between mb-1">
                  <Layers className="w-3.5 h-3.5 text-foreground" />
                  <span className="font-mono text-[9px] text-muted-foreground">MEM 03</span>
                </div>
                <p className="font-mono text-[11px] font-bold text-foreground">RTK CACHE</p>
                <p className="font-mono text-[9px] text-muted-foreground">SYNC PERSIST</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
