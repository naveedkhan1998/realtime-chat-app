import { useOutletContext } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';

import { useGetChatRoomsQuery } from '@/services/chatApi';
import { useRoomSubscription } from '@/hooks/useUnifiedWebSocket';
import ChatWindow from '@/components/custom/ChatWindow';
import { AppShellContext } from '@/layouts/AppShell';
import { MessageSquareMore, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function ChatPage() {
  const { activeChat, setActiveChat, isMobile } =
    useOutletContext<AppShellContext>();
  const user = useAppSelector(state => state.auth.user);

  const { activeRoom } = useGetChatRoomsQuery(undefined, {
    selectFromResult: ({ data }) => ({
      activeRoom: data?.find(room => room.id === activeChat),
    }),
  });

  const pageTitle = activeRoom
    ? `${activeRoom.name || 'Chat'} | MNK Chat`
    : 'Chat | MNK Chat';

  // Subscribe to the active chat room using the unified WebSocket
  // This hook automatically handles:
  // - Subscribing/unsubscribing on room change
  // - All chat events (messages, typing, presence, collab, cursor, huddle)
  // - Dispatching to Redux unifiedChat slice
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
        <div className="relative flex flex-col items-center justify-center h-full p-8 overflow-hidden text-center">
          {/* Decorative background elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-md space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 bg-primary/60 rounded-3xl rotate-6 blur-sm" />
              <div className="relative flex items-center justify-center w-full h-full border shadow-2xl bg-card/50 backdrop-blur-xl border-border rounded-3xl">
                <MessageSquareMore className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 bg-background/50 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-border">
                <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome back, <span className="text-primary">{user.name}</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Select a conversation from the sidebar to start chatting or
                create a new one.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
