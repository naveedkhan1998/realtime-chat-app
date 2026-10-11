import { useEffect } from 'react';
import { Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import NavigationRail, { MobileDock } from '@/components/custom/NavigationRail';
import Sidebar from '@/components/custom/Sidebar';
import HuddleBar from '@/components/custom/HuddleBar';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/useNotifications';
import { useAppSelector } from '@/app/hooks';
import { selectActiveHuddleRoomIds } from '@/features/unifiedChatSlice';
import { useState } from 'react';

export interface AppShellContext {
  activeChat: number | undefined;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
}

interface AppShellProps {
  isMobile: boolean;
}

/**
 * The device body.
 *
 *  ≥ md   [ rail (on chassis) ] [ channel bank panel ] [ main stage panel ]
 *  < md   one full-bleed view at a time + bottom dock (hidden inside a chat)
 *
 * Exposes `--dock-h` so anything pinned to the bottom on mobile can sit
 * above the dock.
 */
export default function AppShell({ isMobile }: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const chatMatch = useMatch('/chat/:chatId');
  const activeChat = chatMatch?.params?.chatId
    ? Number(chatMatch.params.chatId)
    : undefined;

  const [isVoiceFilterActive, setIsVoiceFilterActive] = useState(false);
  const activeVoiceRoomIds = useAppSelector(selectActiveHuddleRoomIds);

  const isChatRoute = location.pathname.startsWith('/chat');
  const isMobileChatList = isMobile && location.pathname === '/chat';
  const showDock = isMobile && !activeChat;

  // Sound, desktop notifications and document title updates
  useNotifications(activeChat);

  // Leaving the chat area drops the voice filter so the bank isn't stuck on VOX
  useEffect(() => {
    if (!isChatRoute) setIsVoiceFilterActive(false);
  }, [isChatRoute]);

  // Mobile virtual keyboard viewport height sync
  useEffect(() => {
    if (!window.visualViewport) return;

    const updateVisualHeight = () => {
      const height = window.visualViewport?.height;
      if (height && height > 0) {
        document.documentElement.style.setProperty(
          '--app-height',
          `${Math.round(height)}px`
        );
      }
    };

    updateVisualHeight();
    const vv = window.visualViewport;
    vv.addEventListener('resize', updateVisualHeight);

    return () => {
      vv.removeEventListener('resize', updateVisualHeight);
      document.documentElement.style.removeProperty('--app-height');
    };
  }, []);

  const handleSetActiveChat = (chatId: number | undefined) => {
    if (typeof chatId === 'number' && !Number.isNaN(chatId)) {
      navigate(`/chat/${chatId}`);
    } else {
      navigate('/chat');
    }
  };

  const toggleVoiceFilter = () => setIsVoiceFilterActive(prev => !prev);

  return (
    <div
      className="relative w-full overflow-hidden bg-background"
      style={{
        height: 'var(--app-height, 100dvh)',
        '--dock-h': showDock ? '4rem' : '0px',
      } as React.CSSProperties}
    >
      <div className="flex h-full w-full md:gap-2 md:p-2 md:pl-0 lg:gap-2.5 lg:p-2.5 lg:pl-0">
        {/* Column 1 — control rail, mounted straight onto the chassis */}
        <NavigationRail
          isVoiceFilterActive={isVoiceFilterActive}
          onVoiceFilterToggle={toggleVoiceFilter}
          activeVoiceCount={activeVoiceRoomIds.length}
          className="hidden md:flex"
        />

        {/* Column 2 — channel bank. Full screen on the mobile /chat route. */}
        <Sidebar
          activeChat={activeChat}
          setActiveChat={handleSetActiveChat}
          isMobile={isMobile}
          isSidebarOpen={isMobileChatList}
          onClose={() => undefined}
          metadata={{ title: 'Channels', description: '' }}
          voiceFilterOnly={isVoiceFilterActive}
          onClearVoiceFilter={() => setIsVoiceFilterActive(false)}
          showCloseButton={false}
          className={cn(
            isMobile && !isMobileChatList && 'hidden',
            isMobileChatList &&
              'pb-[calc(var(--dock-h)+env(safe-area-inset-bottom,0px))]'
          )}
        />

        {/* Column 3 — main stage */}
        <main
          className={cn(
            'relative flex min-w-0 flex-1 flex-col overflow-hidden bg-card',
            'md:rounded-xl md:shadow-panel',
            isMobileChatList && 'hidden'
          )}
        >
          <Outlet
            context={{
              activeChat,
              setActiveChat: handleSetActiveChat,
              isMobile,
            }}
          />
        </main>
      </div>

      {showDock && (
        <MobileDock
          isVoiceFilterActive={isVoiceFilterActive}
          onVoiceFilterToggle={toggleVoiceFilter}
          activeVoiceCount={activeVoiceRoomIds.length}
        />
      )}

      {/* Global floating huddle remote */}
      <HuddleBar />
    </div>
  );
}
