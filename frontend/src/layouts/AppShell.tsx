import { useEffect, useState } from 'react';
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/custom/Sidebar';
import { cn } from '@/lib/utils';
import { BackgroundBlobs } from '@/components/ui/background-blobs';
import { useAppSelector } from '@/app/hooks';
import { GlobalWebSocketService } from '@/utils/websocket';

export interface AppShellContext {
  activeChat: number | undefined;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
}

interface AppShellProps {
  isMobile: boolean;
}

const routeMetadata: Record<string, { title: string; description: string }> = {
  '/chat': {
    title: 'Conversations',
    description: 'Stay in sync with every thread and team.',
  },
  '/friends': {
    title: 'Connections',
    description: 'Manage the people you collaborate with.',
  },
  '/new-chat': {
    title: 'Start Something New',
    description: 'Spin up a private or group space in seconds.',
  },
};

export default function AppShell({ isMobile }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const chatMatch = useMatch('/chat/:chatId');
  const activeChat = chatMatch?.params?.chatId
    ? Number(chatMatch.params.chatId)
    : undefined;
  const basePath = location.pathname.startsWith('/chat/')
    ? '/chat'
    : location.pathname;
  const metadata = routeMetadata[basePath] ?? {
    title: 'Workspace',
    description: 'Navigate your real-time collaboration hub.',
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const accessToken = useAppSelector(state => state.auth.accessToken);

  const isMobileChatList = isMobile && location.pathname === '/chat';

  useEffect(() => {
    if (accessToken) {
      const ws = GlobalWebSocketService.getInstance();
      ws.connect(accessToken);
      return () => {
        ws.disconnect();
      };
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const handleSetActiveChat = (chatId: number | undefined) => {
    if (typeof chatId === 'number' && !Number.isNaN(chatId)) {
      navigate(`/chat/${chatId}`);
    } else {
      navigate('/chat');
    }
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-background/80 selection:bg-primary/60">
      <BackgroundBlobs />

      <div className="relative z-10 flex h-[100dvh] w-full max-w-[1920px] mx-auto p-0 lg:p-4 gap-4">
        {/* Sidebar Container */}
        <Sidebar
          activeChat={activeChat}
          setActiveChat={handleSetActiveChat}
          isMobile={isMobile}
          isSidebarOpen={isMobileChatList || isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          metadata={metadata}
          className={
            isMobileChatList ? 'w-full translate-x-0 relative z-0' : ''
          }
          showCloseButton={!isMobileChatList}
        />

        {/* Mobile Overlay */}
        <div
          className={cn(
            'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-300',
            isMobile && isSidebarOpen && !isMobileChatList
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          )}
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main
          className={cn(
            'relative flex flex-col flex-1 h-full overflow-hidden transition-all duration-300',
            'lg:rounded-3xl lg:border lg:border-white/10 lg:shadow-2xl',
            'bg-background/40 backdrop-blur-xl',
            isMobileChatList ? 'hidden' : 'flex'
          )}
        >
          <div className="flex-1 h-full overflow-hidden">
            <Outlet
              context={{
                activeChat,
                setActiveChat: handleSetActiveChat,
                isMobile,
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
