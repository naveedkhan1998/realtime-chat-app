import { useEffect, useState } from 'react';
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import NavigationRail from '@/components/custom/NavigationRail';
import Sidebar from '@/components/custom/Sidebar';
import HuddleBar from '@/components/custom/HuddleBar';
import { cn } from '@/lib/utils';
import { BackgroundBlobs } from '@/components/ui/background-blobs';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppSelector } from '@/app/hooks';
import { selectActiveHuddleRoomIds } from '@/features/unifiedChatSlice';

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
  const [isVoiceFilterActive, setIsVoiceFilterActive] = useState(false);

  const activeVoiceRoomIds = useAppSelector(selectActiveHuddleRoomIds);

  const isMobileChatList = isMobile && location.pathname === '/chat';

  // Initialize notifications - handles sound, desktop notifications, and title updates
  useNotifications(activeChat);

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

      <div className="relative z-10 flex h-[100dvh] w-full overflow-hidden p-0 gap-0">
        {/* Column 1: Slim Icon Navigation Rail (Slack & Discord Architecture) */}
        <NavigationRail
          isVoiceFilterActive={isVoiceFilterActive}
          onVoiceFilterToggle={() => setIsVoiceFilterActive(prev => !prev)}
          activeVoiceCount={activeVoiceRoomIds.length}
          isMobile={isMobile}
          activeChat={activeChat}
          className="hidden md:flex border-r border-border/60 z-30 flex-shrink-0"
        />

        {/* Column 2: Channel & Conversation Lounge Sidebar */}
        <Sidebar
          activeChat={activeChat}
          setActiveChat={handleSetActiveChat}
          isMobile={isMobile}
          isSidebarOpen={isMobileChatList || isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          metadata={metadata}
          voiceFilterOnly={isVoiceFilterActive}
          onClearVoiceFilter={() => setIsVoiceFilterActive(false)}
          className={cn(
            isMobileChatList ? 'w-full translate-x-0 relative z-0' : '',
            isMobile && !activeChat ? 'pb-14 md:pb-0' : ''
          )}
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

        {/* Column 3: Main Central Stage (Chat Window, Friends, Settings, etc.) */}
        <main
          className={cn(
            'relative flex flex-col flex-1 h-full overflow-hidden transition-all duration-300',
            'bg-background/50 backdrop-blur-xl',
            isMobileChatList ? 'hidden' : 'flex',
            isMobile && !activeChat ? 'pb-14 md:pb-0' : ''
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

      {/* Global Persistent Audio Huddle Dock */}
      <HuddleBar />
    </div>
  );
}
