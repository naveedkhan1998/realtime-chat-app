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
        'fixed inset-y-0 left-0 z-40 flex w-full max-w-xs flex-col glass-strong shadow-2xl transition-transform duration-200 ease-in-out lg:relative lg:max-w-[300px] lg:translate-x-0',
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
            <Avatar className="border-2 h-11 w-11 border-primary/20 shadow-md">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-sm font-semibold gradient-primary text-white">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-xs font-medium uppercase text-muted-foreground">
                Workspace
              </span>
              <h2 className="text-base font-bold text-foreground">
                {user.name}
              </h2>
            </div>
          </div>
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="glass rounded-2xl hover:shadow-md transition-all duration-300"
              onClick={() =>
                activeChat && onChatView ? setActiveChat(undefined) : onClose()
              }
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          ) : (
            <ThemeSwitch
              variant="ghost"
              className="hidden glass rounded-2xl hover:shadow-md transition-all duration-300 lg:inline-flex"
            />
          )}
        </div>

        <div className="p-4 text-sm glass-card rounded-2xl shadow-md">
          <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
            Status
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-glow"></span>
            <p className="font-semibold text-foreground">Available</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Presence is shared across chats.
          </p>
        </div>

        <div>
          <div className="relative">
            <Search className="absolute w-4 h-4 -translate-y-1/2 left-4 top-1/2 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              className="text-sm glass-card h-11 pl-11 rounded-2xl shadow-sm focus:shadow-md transition-all duration-300 border-0"
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

      <div className="flex flex-col flex-1 px-4 pt-4 pb-6 overflow-hidden border-t border-border/50">
        <div className="flex items-center justify-between text-xs font-bold uppercase text-muted-foreground tracking-wider">
          <span>Conversations</span>
          <span className="glass rounded-full px-2.5 py-1 text-[11px] font-bold shadow-sm">
            Live
          </span>
        </div>
        <div className="flex-1 pr-1 mt-4 space-y-2 overflow-y-auto">
          {chatRoomsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : chatRoomsError ? (
            <p className="glass-card px-3 py-3 text-xs font-medium text-red-600 dark:text-red-400 rounded-2xl shadow-md">
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
            <div className="px-4 py-6 text-sm glass-card rounded-2xl text-muted-foreground shadow-inner">
              You have no conversations yet. Start by inviting teammates or
              creating a new chat.
            </div>
          )}
        </div>
        <div className="glass-card px-4 py-3 mt-4 rounded-2xl shadow-md">
          <Button
            variant="ghost"
            className="flex items-center justify-center w-full gap-2 text-sm font-medium glass rounded-2xl hover:shadow-md transition-all duration-300"
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
          'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-300',
          isActive
            ? 'glass-card shadow-md text-primary'
            : 'glass text-muted-foreground hover:shadow-md hover:text-foreground'
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
        'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-300',
        active
          ? 'glass-card shadow-md text-primary'
          : 'glass hover:shadow-md'
      )}
    >
      <Avatar className="w-10 h-10 border-2 border-primary/20 shadow-sm">
        <AvatarImage src={avatar} alt={title} />
        <AvatarFallback className="text-sm font-semibold gradient-primary text-white">
          {title?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">
          {room.is_group_chat
            ? `${room.participants.length} participants`
            : 'Direct message'}
        </p>
      </div>
    </button>
  );
}
