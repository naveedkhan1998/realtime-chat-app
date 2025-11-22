import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  MessageSquareMore,
  UsersRound,
  Plus,
  Loader2,
  LogOut,
  Search,
  X,
  Sparkles,
  Zap,
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
  { label: 'Chats', icon: MessageSquareMore, to: '/chat' },
  { label: 'Friends', icon: UsersRound, to: '/friends' },
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

  if (!user) return null;

  const handleLogout = () => {
    dispatch(logOut());
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[320px] flex-col gap-4 transition-transform duration-300 ease-out lg:relative lg:translate-x-0',
        isMobile
          ? isSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full'
          : 'translate-x-0'
      )}
    >
      {/* Glass Container */}
      <div className="flex flex-col h-full w-full rounded-none lg:rounded-3xl bg-background/80 backdrop-blur-2xl border-r lg:border border-white/10 shadow-2xl overflow-hidden">
        
        {/* Brand Header */}
        <div className="p-6 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="h-5 w-5 text-white fill-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight leading-none">Antigravity</h1>
              <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase mt-0.5">Workspace</p>
            </div>
          </div>
          {isMobile ? (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <ThemeSwitch variant="ghost" className="h-8 w-8 rounded-full hover:bg-primary/10" />
          )}
        </div>

        {/* User Profile Card */}
        <div className="px-4 py-4">
          <div className="p-3 rounded-2xl bg-secondary/30 border border-white/5 flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background ring-1 ring-green-500/20" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">Online</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation & Search */}
        <div className="px-4 space-y-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search conversations..." 
              className="h-10 pl-9 bg-secondary/50 border-transparent hover:bg-secondary/80 focus:bg-background focus:border-primary/20 rounded-xl transition-all placeholder:text-muted-foreground/70"
            />
          </div>

          <nav className="flex p-1 space-x-1 bg-secondary/30 rounded-xl">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (item.to === '/chat') setActiveChat(undefined);
                  if (isMobile) onClose();
                }}
                className={({ isActive }) => cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-background text-primary shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 mt-2 custom-scrollbar">
          <div className="flex items-center justify-between px-4 py-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">Recent Messages</span>
            <NavLink to="/new-chat">
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </Button>
            </NavLink>
          </div>

          <div className="space-y-1 px-2">
            {chatRoomsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
              </div>
            ) : chatRoomsError ? (
              <div className="p-4 text-center">
                <p className="text-xs text-destructive">Failed to load chats</p>
              </div>
            ) : chatRooms && chatRooms.length > 0 ? (
              chatRooms.map(room => (
                <ConversationRow
                  key={room.id}
                  room={room}
                  active={activeChat === room.id}
                  currentUserId={user.id}
                  onSelect={() => {
                    setActiveChat(room.id);
                    if (isMobile) onClose();
                  }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3 opacity-60">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">No conversations yet. Start a new chat!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

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
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group relative overflow-hidden",
        active 
          ? "bg-primary/10 shadow-sm border border-primary/10" 
          : "hover:bg-secondary/40 border border-transparent"
      )}
    >
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}
      
      <Avatar className={cn(
        "h-11 w-11 border-2 transition-all duration-300",
        active ? "border-primary ring-2 ring-primary/20" : "border-transparent group-hover:border-primary/30"
      )}>
        <AvatarImage src={avatar} alt={title} />
        <AvatarFallback className={cn(
          "text-xs font-bold",
          active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
        )}>
          {title?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 ml-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className={cn(
            "text-sm font-semibold truncate transition-colors",
            active ? "text-primary" : "text-foreground"
          )}>
            {title}
          </span>
          {/* You might want to add a timestamp here if available in the room object */}
        </div>
        <p className={cn(
          "text-xs truncate transition-colors",
          active ? "text-primary/70" : "text-muted-foreground opacity-80"
        )}>
          {room.is_group_chat
            ? `${room.participants.length} members`
            : 'Click to open chat'}
        </p>
      </div>
    </button>
  );
}
