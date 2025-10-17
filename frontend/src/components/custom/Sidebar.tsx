import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  MessageSquareMore,
  UsersRound,
  PlusCircle,
  Loader2,
  LogOut,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logOut } from '@/features/authSlice';
import { useGetChatRoomsQuery, ChatRoom } from '@/services/chatApi';
import ThemeSwitch from './ThemeSwitch';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeChat: number | undefined;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
  isSidebarOpen: boolean;
  onClose: () => void;
  metadata: { title: string; description: string };
}

const navItems = [
  { label: 'Messages', icon: MessageSquareMore, to: '/chat' },
  { label: 'Connections', icon: UsersRound, to: '/friends' },
  { label: 'New chat', icon: PlusCircle, to: '/new-chat' },
];

const Sidebar: React.FC<SidebarProps> = ({
  activeChat,
  setActiveChat,
  isMobile,
  isSidebarOpen,
  onClose,
}) => {
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();
  const {
    data: chatRooms,
    isLoading: chatRoomsLoading,
    error: chatRoomsError,
  } = useGetChatRoomsQuery(undefined, { pollingInterval: 10000 });
  const location = useLocation();

  if (!user) return null;

  const onChatView = location.pathname.startsWith('/chat');
  const hideForActiveChat =
    isMobile && onChatView && !!activeChat && !isSidebarOpen;

  const handleLogout = () => {
    dispatch(logOut());
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-full max-w-xs flex-col border-r border-border bg-background text-foreground shadow-lg transition-transform duration-200 ease-in-out lg:relative lg:max-w-[300px] lg:translate-x-0 lg:shadow-none',
        isMobile
          ? isSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full'
          : 'translate-x-0',
        hideForActiveChat
          ? 'pointer-events-none opacity-0'
          : 'pointer-events-auto opacity-100'
      )}
    >
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="border h-11 w-11 border-border">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-sm font-semibold text-primary">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Workspace
              </span>
              <h2 className="text-base font-semibold text-foreground">
                {user.name}
              </h2>
            </div>
          </div>
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="border rounded-full border-border"
              onClick={() =>
                activeChat && onChatView ? setActiveChat(undefined) : onClose()
              }
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          ) : (
            <ThemeSwitch
              variant="ghost"
              className="hidden border rounded-full border-border bg-background/80 text-foreground hover:bg-muted lg:inline-flex"
            />
          )}
        </div>

        <div className="p-4 text-sm border shadow-inner rounded-2xl border-border bg-muted/40">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            Status
          </p>
          <p className="mt-2 font-medium text-foreground">Available</p>
          <p className="text-xs text-muted-foreground">
            Presence is shared across chats.
          </p>
        </div>

        <div>
          <div className="relative">
            <Search className="absolute w-4 h-4 -translate-y-1/2 left-4 top-1/2 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              className="text-sm border rounded-full h-11 border-border bg-background pl-11 focus:border-primary/30 focus:ring-2 focus:ring-primary/25"
            />
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map(item => (
            <SidebarLink
              key={item.to}
              item={item}
              onClick={() => {
                if (item.to === '/chat') {
                  setActiveChat(undefined);
                }
                if (isMobile) {
                  onClose();
                }
              }}
            />
          ))}
        </nav>
      </div>

      <div className="flex flex-col flex-1 px-4 pt-4 pb-6 overflow-hidden border-t border-border bg-background/80">
        <div className="flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
          <span>Conversations</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            Live
          </span>
        </div>
        <div className="flex-1 pr-1 mt-4 space-y-2 overflow-y-auto">
          {chatRoomsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : chatRoomsError ? (
            <p className="px-3 py-3 text-xs text-red-700 bg-red-100 border border-red-200 rounded-xl dark:border-red-400/60 dark:bg-red-900/30 dark:text-red-200">
              Unable to load chats. Please try again.
            </p>
          ) : chatRooms && chatRooms.length > 0 ? (
            chatRooms.map(room => (
              <ConversationRow
                key={room.id}
                room={room}
                active={activeChat === room.id}
                currentUserId={user.id}
                onSelect={() => {
                  setActiveChat(room.id);
                  if (isMobile) {
                    onClose();
                  }
                }}
              />
            ))
          ) : (
            <div className="px-4 py-6 text-sm border border-dashed rounded-xl border-border text-muted-foreground">
              You have no conversations yet. Start by inviting teammates or
              creating a new chat.
            </div>
          )}
        </div>
        <div className="px-4 py-3 mt-4 border rounded-xl border-border bg-background">
          <Button
            variant="ghost"
            className="flex items-center justify-center w-full gap-2 text-sm font-medium border rounded-full border-border"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Log out
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

function SidebarLink({
  item,
  onClick,
}: {
  item: { label: string; icon: React.ElementType; to: string };
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'border-primary/20 bg-primary/10 text-primary'
            : 'text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground'
        )
      }
    >
      <item.icon className="w-4 h-4" />
      {item.label}
    </NavLink>
  );
}

function ConversationRow({
  room,
  active,
  currentUserId,
  onSelect,
}: {
  room: ChatRoom;
  active: boolean;
  currentUserId: number;
  onSelect: () => void;
}) {
  const counterpart = room.is_group_chat
    ? null
    : room.participants.find(participant => participant.id !== currentUserId);
  const title = room.is_group_chat
    ? room.name
    : counterpart?.name ?? 'Direct message';
  const avatar = room.is_group_chat ? '' : counterpart?.avatar ?? '';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
        active
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border/60 bg-background hover:border-primary/20 hover:bg-primary/5'
      )}
    >
      <Avatar className="w-10 h-10 border border-border bg-background">
        <AvatarImage src={avatar} alt={title} />
        <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
          {title?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">
          {room.is_group_chat
            ? `${room.participants.length} participants`
            : 'Direct message'}
        </p>
      </div>
    </button>
  );
}
