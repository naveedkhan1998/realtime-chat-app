import { useEffect, useState } from 'react';
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '@/components/custom/Sidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-background selection:bg-primary/20">
      {/* Global Background Elements - Refined for Premium Feel */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02] pointer-events-none" />
      <div className="absolute -top-[20%] -right-[10%] w-[1000px] h-[1000px] bg-primary/5 rounded-full blur-[150px] pointer-events-none animate-pulse-slow" />
      <div className="absolute -bottom-[20%] -left-[10%] w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse-slow delay-1000" />

      <div className="relative z-10 flex h-[100dvh] w-full max-w-[1920px] mx-auto p-0 lg:p-4 gap-4">
        {/* Sidebar Container */}
        <Sidebar
          activeChat={activeChat}
          setActiveChat={handleSetActiveChat}
          isMobile={isMobile}
          isSidebarOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          metadata={metadata}
        />

        {/* Mobile Overlay */}
        <div
          className={cn(
            'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-300',
            isMobile && isSidebarOpen
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
            'bg-background/60 backdrop-blur-xl'
          )}
        >
          {isMobile && (
            <div className="absolute z-50 top-4 left-4">
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 border rounded-full shadow-sm bg-background/50 backdrop-blur-md border-white/10 hover:bg-primary/10"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          )}

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
