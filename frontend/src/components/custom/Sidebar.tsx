import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  MessageSquareMore,
  UsersRound,
  Plus,
  Loader2,
  LogOut,
  Search,
  X,
  Sparkles,
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
  const location = useLocation();

  if (!user) return null;

  const handleLogout = () => {
    dispatch(logOut());
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col gap-4 transition-transform duration-300 ease-out lg:relative lg:translate-x-0',
        isMobile
          ? isSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full'
          : 'translate-x-0'
      )}
    >
      {/* Glass Container */}
      <div className="flex flex-col h-full w-full rounded-none lg:rounded-3xl bg-background/60 backdrop-blur-xl border-r lg:border border-white/10 shadow-2xl overflow-hidden">
        
        {/* Header Profile Section */}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground leading-none">{user.name}</span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">Online</span>
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

          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search..." 
              className="h-10 pl-9 bg-primary/5 border-transparent hover:bg-primary/10 focus:bg-background focus:border-primary/20 rounded-xl transition-all"
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4">
          <nav className="flex p-1 space-x-1 bg-primary/5 rounded-xl">
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
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/5"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
          <div className="flex items-center justify-between px-2 py-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent Messages</span>
            <NavLink to="/new-chat">
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-primary/10 text-primary">
                <Plus className="h-4 w-4" />
              </Button>
            </NavLink>
          </div>

          <div className="space-y-1">
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

        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-primary/5">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="font-medium">Sign out</span>
          </Button>
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
        "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group",
        active 
          ? "bg-primary/10 shadow-sm border border-primary/10" 
          : "hover:bg-white/5 border border-transparent"
      )}
    >
      <Avatar className={cn(
        "h-10 w-10 border-2 transition-colors",
        active ? "border-primary" : "border-transparent group-hover:border-primary/30"
      )}>
        <AvatarImage src={avatar} alt={title} />
        <AvatarFallback className={cn(
          "text-xs font-bold",
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {title?.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={cn(
            "text-sm font-semibold truncate transition-colors",
            active ? "text-primary" : "text-foreground"
          )}>
            {title}
          </span>
          {active && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
        </div>
        <p className="text-xs text-muted-foreground truncate opacity-80">
          {room.is_group_chat
            ? `${room.participants.length} members`
            : 'Click to open chat'}
        </p>
      </div>
    </button>
  );
}
