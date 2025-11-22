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
        'fixed inset-y-0 left-0 z-40 flex w-full max-w-xs flex-col bg-card border-r border-border shadow-xl transition-transform duration-300 ease-in-out lg:relative lg:max-w-[300px] lg:translate-x-0 lg:shadow-none',
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
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-sm font-semibold bg-primary text-primary-foreground">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Workspace
              </span>
              <h2 className="text-sm font-bold text-foreground truncate max-w-[140px]">
                {user.name}
              </h2>
            </div>
          </div>
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-accent"
              onClick={() =>
                activeChat && onChatView ? setActiveChat(undefined) : onClose()
              }
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          ) : (
            <ThemeSwitch
              variant="ghost"
              className="hidden h-8 w-8 rounded-full hover:bg-accent lg:inline-flex"
            />
          )}
        </div>

        <div className="p-3 text-sm bg-muted/30 rounded-xl border border-border/50">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
              Status
            </p>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          </div>
          <p className="mt-1 font-medium text-foreground text-xs">Available</p>
        </div>

        <div>
          <div className="relative">
            <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              className="h-10 pl-9 bg-muted/50 border-transparent focus:bg-background focus:border-primary/20 transition-all duration-200 rounded-xl text-sm"
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
        <div className="flex items-center justify-between text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-2">
          <span>Conversations</span>
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[10px]">
            Live
          </span>
        </div>
        <div className="flex-1 -mx-2 px-2 space-y-1 overflow-y-auto custom-scrollbar">
          {chatRoomsLoading ? (
            <div className="flex items-center justify-center h-20">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : chatRoomsError ? (
            <p className="p-3 text-xs text-destructive bg-destructive/10 rounded-xl">
              Unable to load chats.
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
            <div className="p-4 text-xs text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border">
              No conversations yet.
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-border/50">
          <Button
            variant="ghost"
            className="flex items-center justify-start w-full gap-3 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
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
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-primary/10 text-primary shadow-sm'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
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
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 group',
        active
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'hover:bg-muted/50'
      )}
    >
      <Avatar className={cn("w-9 h-9 border", active ? "border-primary-foreground/20" : "border-border")}>
        <AvatarImage src={avatar} alt={title} />
        <AvatarFallback className={cn("text-xs font-semibold", active ? "bg-primary-foreground text-primary" : "bg-muted text-muted-foreground")}>
          {title?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-semibold truncate", active ? "text-primary-foreground" : "text-foreground")}>{title}</p>
        <p className={cn("text-xs truncate", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
          {room.is_group_chat
            ? `${room.participants.length} participants`
            : 'Direct message'}
        </p>
      </div>
    </button>
  );
}
