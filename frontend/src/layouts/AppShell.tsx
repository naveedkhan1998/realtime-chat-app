import { useEffect, useState } from 'react';
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '@/components/custom/Sidebar';
import { Button } from '@/components/ui/button';

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
    <div className="min-h-screen bg-muted/30">
      <div className="flex flex-col w-full min-h-screen mx-auto lg:flex-row">
        <Sidebar
          activeChat={activeChat}
          setActiveChat={handleSetActiveChat}
          isMobile={isMobile}
          isSidebarOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          metadata={metadata}
        />
        {isMobile && isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        <main className="relative flex flex-col flex-1 min-h-screen bg-background">
          {isMobile && (
            <div className="fixed top-0 px-4 pt-4 sm:px-6">
              <Button
                variant="outline"
                size="icon"
                className="border rounded-full border-border"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          )}
          <div className="flex-1 overflow-y-auto ">
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
