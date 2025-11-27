import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  MessageSquareMore,
  Plus,
  Loader2,
  LogOut,
  Search,
  X,
  Sparkles,
  UserPlus,
  Headphones,
  Settings,
  Bell,
  UsersRound,
  Paperclip,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logOut } from '@/features/authSlice';
import {
  setUnreadNotification,
  clearUnreadNotification,
  selectGlobalOnlineUsers,
  selectHasUnreadNotification,
} from '@/features/unifiedChatSlice';
import {
  useGetChatRoomsQuery,
  ChatRoom,
  chatApi,
  useCreateChatRoomMutation,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
} from '@/services/chatApi';
import { useSearchUsersQuery } from '@/services/userApi';
import { baseApi } from '@/services/baseApi';
import {
  useOnChatRoomCreated,
  useWebSocketEvent,
} from '@/hooks/useUnifiedWebSocket';
import type {
  GlobalChatRoomCreatedEvent,
  GlobalNewMessageNotificationEvent,
} from '@/utils/unifiedWebSocket';
import { useDebounce } from '@/utils/hooks';
import { useHuddle } from '@/contexts/HuddleContext';
import ThemeSwitch from './ThemeSwitch';
import { cn, getAvatarUrl } from '@/lib/utils';

interface SidebarProps {
  activeChat: number | undefined;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
  isSidebarOpen: boolean;
  onClose: () => void;
  metadata: { title: string; description: string };
  className?: string;
  showCloseButton?: boolean;
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
  className,
  showCloseButton = true,
}) => {
  const user = useAppSelector(state => state.auth.user);
  const globalOnlineUsers = useAppSelector(selectGlobalOnlineUsers);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isHuddleActive, huddleChatId } = useHuddle();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const {
    data: chatRooms,
    isLoading: chatRoomsLoading,
    error: chatRoomsError,
  } = useGetChatRoomsQuery();

  const { data: notifications } = useGetNotificationsQuery();
  const [markNotificationRead] = useMarkNotificationReadMutation();

  const { data: searchResults, isLoading: isSearchingUsers } =
    useSearchUsersQuery(
      { query: debouncedSearchQuery },
      { skip: !debouncedSearchQuery }
    );

  const [createChatRoom] = useCreateChatRoomMutation();

  useEffect(() => {
    if (notifications) {
      notifications.forEach(notification => {
        if (!notification.is_read && notification.chat_room) {
          dispatch(setUnreadNotification(notification.chat_room));
        }
      });
    }
  }, [notifications, dispatch]);

  // Handle chat room creation events via unified WebSocket
  const handleChatRoomCreated = useCallback(
    (event: GlobalChatRoomCreatedEvent) => {
      dispatch(
        chatApi.util.updateQueryData('getChatRooms', undefined, draft => {
          // Check if room already exists to avoid duplicates
          if (!draft.find(room => room.id === event.room.id)) {
            draft.unshift(event.room);
          }
        })
      );
    },
    [dispatch]
  );
  useOnChatRoomCreated(handleChatRoomCreated);

  // Handle new message notifications via unified WebSocket
  const handleNewMessageNotification = useCallback(
    (event: GlobalNewMessageNotificationEvent) => {
      // Update unread notification state for chats not currently active
      if (event.chat_room_id !== activeChat) {
        dispatch(setUnreadNotification(event.chat_room_id));
      }

      // Update the last_message and unread_count in the chat rooms cache
      dispatch(
        chatApi.util.updateQueryData('getChatRooms', undefined, draft => {
          const roomIndex = draft.findIndex(
            room => room.id === event.chat_room_id
          );
          if (roomIndex !== -1) {
            const room = draft[roomIndex];
            // Update last message
            room.last_message = {
              id: Date.now(), // Temporary ID
              sender: {
                id: event.sender_id,
                name: event.sender_name || 'Unknown',
                avatar: undefined,
              },
              content: event.message_content || '',
              attachment: event.has_attachment ? 'attachment' : undefined,
              timestamp: new Date().toISOString(),
            };
            // Increment unread count if not the active chat
            if (event.chat_room_id !== activeChat) {
              room.unread_count = (room.unread_count || 0) + 1;
            }
            // Move room to top of list
            draft.splice(roomIndex, 1);
            draft.unshift(room);
          }
        })
      );
    },
    [dispatch, activeChat]
  );
  useWebSocketEvent(
    'global.new_message_notification',
    handleNewMessageNotification
  );

  if (!user) return null;

  const handleLogout = () => {
    dispatch(logOut());
    dispatch(baseApi.util.resetApiState());
  };

  // Filter and sort existing chats
  const filteredChatRooms = chatRooms
    ?.filter(room => {
      if (!debouncedSearchQuery) return true;

      // Check room name (for groups)
      if (room.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
        return true;

      // Check participants (for DMs and Groups)
      return room.participants.some(
        p =>
          p.id !== user.id &&
          p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      const getOnlineCount = (room: ChatRoom) => {
        return room.participants.filter(
          p => p.id !== user.id && globalOnlineUsers.includes(p.id)
        ).length;
      };

      const aOnline = getOnlineCount(a);
      const bOnline = getOnlineCount(b);

      // Sort by online count descending
      return bOnline - aOnline;
    });

  // Identify users who are already in DM chats to exclude them from "New People"
  const existingDMParticipantIds = new Set(
    chatRooms
      ?.filter(r => !r.is_group_chat)
      .flatMap(r => r.participants)
      .filter(p => p.id !== user.id)
      .map(p => p.id)
  );

  const potentialNewChats =
    searchResults?.filter(
      u => u.id !== user.id && !existingDMParticipantIds.has(u.id)
    ) || [];

  const handleCreateChat = async (userId: number) => {
    try {
      const res = await createChatRoom({ participant_ids: [userId] }).unwrap();
      setActiveChat(res.id);
      navigate(`/chat/${res.id}`);
      if (isMobile) onClose();
      setSearchQuery(''); // Clear search
    } catch (e) {
      console.error('Failed to create chat', e);
    }
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-[320px] flex-col gap-4 transition-transform duration-300 ease-out lg:relative lg:translate-x-0',
        isMobile
          ? isSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full'
          : 'translate-x-0',
        className
      )}
    >
      {/* Glass Container */}
      <div className="flex flex-col w-full h-full overflow-hidden border-r rounded-none shadow-2xl lg:rounded-3xl bg-background/80 backdrop-blur-2xl lg:border border-border">
        {/* Brand Header */}
        <div className="flex items-center justify-between p-6 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center overflow-hidden shadow-lg h-9 w-9 rounded-xl bg-primary shadow-primary/20">
              <img
                src="/apple-touch-icon.png"
                alt="Logo"
                className="object-cover w-full h-full"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none tracking-tight">
                Your Workspace
              </h1>
              <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase mt-0.5">
                Workspace
              </p>
            </div>
          </div>
          {isMobile && showCloseButton ? (
            <div className="flex items-center gap-2">
              <ThemeSwitch
                variant="ghost"
                className="w-8 h-8 rounded-full hover:bg-primary/10"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : !isMobile ? (
            <ThemeSwitch
              variant="ghost"
              className="w-8 h-8 rounded-full hover:bg-primary/10"
            />
          ) : (
            <ThemeSwitch
              variant="ghost"
              className="w-8 h-8 rounded-full hover:bg-primary/10"
            />
          )}
        </div>

        {/* User Profile Card */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-3 p-3 border rounded-2xl bg-muted/30 border-border">
            <Link
              to="/profile"
              className="relative"
              onClick={() => isMobile && onClose()}
            >
              <Avatar className="w-10 h-10 transition-all border-2 shadow-sm cursor-pointer border-background hover:ring-2 hover:ring-primary/30">
                <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
                <AvatarFallback className="font-bold bg-primary/10 text-primary">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 rounded-full border-background ring-1 ring-green-500/20" />
            </Link>
            <Link
              to="/profile"
              className="flex-1 min-w-0"
              onClick={() => isMobile && onClose()}
            >
              <p className="text-sm font-bold truncate transition-colors cursor-pointer hover:text-primary">
                {user.name}
              </p>
              <p className="text-xs truncate text-muted-foreground">Online</p>
            </Link>
            <div className="flex items-center gap-1">
              <Link to="/notifications" onClick={() => isMobile && onClose()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <Bell className="w-4 h-4" />
                  {notifications &&
                    notifications.filter(n => !n.is_read).length > 0 && (
                      <span className="absolute top-0 right-0 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {notifications.filter(n => !n.is_read).length > 9
                          ? '9+'
                          : notifications.filter(n => !n.is_read).length}
                      </span>
                    )}
                </Button>
              </Link>
              <Link to="/settings" onClick={() => isMobile && onClose()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation & Search */}
        <div className="px-4 space-y-4">
          <div className="relative group">
            <Search className="absolute w-4 h-4 transition-colors -translate-y-1/2 left-3 top-1/2 text-muted-foreground group-focus-within:text-primary" />
            <Input
              placeholder="Search conversations..."
              className="h-10 transition-all border-transparent pl-9 bg-muted/50 hover:bg-muted/80 focus:bg-background focus:border-primary/20 rounded-xl placeholder:text-muted-foreground/70"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <nav className="flex p-1 space-x-1 bg-muted/30 rounded-xl">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (item.to === '/chat') setActiveChat(undefined);
                  if (isMobile) onClose();
                }}
                className={({ isActive }) =>
                  cn(
                    'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-background text-primary shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <NavLink to="/new-chat" onClick={() => isMobile && onClose()}>
            <Button
              variant="default"
              className="justify-start w-full h-10 gap-2 font-semibold border shadow-none rounded-xl bg-primary/10 text-primary hover:bg-primary/60 border-primary/20"
            >
              <Plus className="w-4 h-4" />
              Start New Chat
            </Button>
          </NavLink>
        </div>

        {/* Chat List */}
        <div className="flex-1 px-2 py-2 mt-2 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {searchQuery ? 'Search Results' : 'Recent Messages'}
            </span>
          </div>

          <div className="px-2 space-y-1">
            {chatRoomsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
              </div>
            ) : chatRoomsError ? (
              <div className="p-4 text-center">
                <p className="text-xs text-destructive">Failed to load chats</p>
              </div>
            ) : (
              <>
                {/* Existing Chats */}
                {filteredChatRooms && filteredChatRooms.length > 0 && (
                  <>
                    {searchQuery && (
                      <p className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">
                        Existing Chats
                      </p>
                    )}
                    {filteredChatRooms.map(room => (
                      <ConversationRow
                        key={room.id}
                        room={room}
                        active={activeChat === room.id}
                        currentUserId={user.id}
                        onlineUsers={globalOnlineUsers}
                        huddleChatId={isHuddleActive ? huddleChatId : null}
                        onSelect={() => {
                          setActiveChat(room.id);
                          dispatch(clearUnreadNotification(room.id));

                          // Reset unread count in the cache
                          dispatch(
                            chatApi.util.updateQueryData(
                              'getChatRooms',
                              undefined,
                              draft => {
                                const r = draft.find(r => r.id === room.id);
                                if (r) {
                                  r.unread_count = 0;
                                }
                              }
                            )
                          );

                          // Find and mark notification as read
                          const notification = notifications?.find(
                            n => n.chat_room === room.id && !n.is_read
                          );
                          if (notification) {
                            markNotificationRead({ id: notification.id });
                          }

                          if (isMobile) onClose();
                          setSearchQuery('');
                        }}
                      />
                    ))}
                  </>
                )}

                {/* New People (Only when searching) */}
                {searchQuery && potentialNewChats.length > 0 && (
                  <>
                    <p className="px-2 py-1 mt-4 text-[10px] font-semibold text-muted-foreground uppercase">
                      New People
                    </p>
                    {potentialNewChats.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleCreateChat(u.id)}
                        className="flex items-center w-full gap-3 p-3 text-left transition-all duration-200 border border-transparent rounded-xl hover:bg-secondary/40 group"
                      >
                        <Avatar className="transition-all border-2 border-transparent h-11 w-11 group-hover:border-primary/30">
                          <AvatarImage
                            src={getAvatarUrl(u.avatar)}
                            alt={u.name}
                          />
                          <AvatarFallback className="text-xs font-bold bg-secondary text-muted-foreground">
                            {u.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 ml-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-sm font-semibold truncate text-foreground">
                              {u.name}
                            </span>
                          </div>
                          <p className="flex items-center gap-1 text-xs truncate text-muted-foreground opacity-80">
                            <UserPlus className="w-3 h-3" />
                            Start new chat
                          </p>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                {/* No Results State */}
                {searchQuery &&
                  (!filteredChatRooms || filteredChatRooms.length === 0) &&
                  (!potentialNewChats || potentialNewChats.length === 0) &&
                  !isSearchingUsers && (
                    <div className="flex flex-col items-center justify-center px-4 py-8 text-center opacity-60">
                      <p className="text-sm text-muted-foreground">
                        No results found for "{searchQuery}"
                      </p>
                    </div>
                  )}

                {/* Empty State (No chats, no search) */}
                {!searchQuery && (!chatRooms || chatRooms.length === 0) && (
                  <div className="flex flex-col items-center justify-center px-4 py-12 space-y-3 text-center opacity-60">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No conversations yet. Start a new chat!
                    </p>
                  </div>
                )}
              </>
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
  onlineUsers,
  huddleChatId,
  onSelect,
}: {
  room: ChatRoom;
  active: boolean;
  currentUserId: number;
  onlineUsers: number[];
  huddleChatId: number | null;
  onSelect: () => void;
}) {
  const counterpart = room.is_group_chat
    ? null
    : room.participants.find(participant => participant.id !== currentUserId);
  const title = room.is_group_chat
    ? room.name
    : (counterpart?.name ?? 'Direct message');
  const avatar = room.is_group_chat ? '' : (counterpart?.avatar ?? '');

  const isOnline = counterpart ? onlineUsers.includes(counterpart.id) : false;
  // Use unread_count from API, fall back to notification state
  const hasUnreadFromApi = (room.unread_count ?? 0) > 0;
  const hasUnreadFromState = useAppSelector(state =>
    selectHasUnreadNotification(state, room.id)
  );
  const hasUnread = hasUnreadFromApi || hasUnreadFromState;
  const hasActiveHuddle = huddleChatId === room.id;

  // Format last message preview
  const getLastMessagePreview = () => {
    if (hasActiveHuddle) return 'Huddle in progress';

    if (room.last_message) {
      const isOwnMessage = room.last_message.sender.id === currentUserId;

      if (room.last_message.attachment) {
        return (
          <>
            {isOwnMessage && <span className="opacity-60">You: </span>}
            <Paperclip className="inline w-3 h-3 mr-1" />
            Sent an attachment
          </>
        );
      }

      const content = room.last_message.content;
      const truncated =
        content.length > 35 ? content.substring(0, 35) + '...' : content;

      return (
        <>
          {isOwnMessage && <span className="opacity-60">You: </span>}
          {truncated}
        </>
      );
    }

    if (room.is_group_chat) {
      return `${room.participants.length} members`;
    }

    return 'Click to open chat';
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group relative overflow-hidden',
        active
          ? 'bg-primary/10 shadow-sm border border-primary/10'
          : hasActiveHuddle
            ? 'bg-green-500/10 border border-green-500/20'
            : 'hover:bg-secondary/40 border border-transparent'
      )}
    >
      {active && (
        <div className="absolute left-0 w-1 h-8 -translate-y-1/2 rounded-r-full top-1/2 bg-primary" />
      )}

      <div className="relative">
        <Avatar
          className={cn(
            'h-11 w-11 border-2 transition-all duration-300',
            active
              ? 'border-primary ring-2 ring-primary/20'
              : 'border-transparent group-hover:border-primary/30'
          )}
        >
          <AvatarImage src={getAvatarUrl(avatar)} alt={title} />
          <AvatarFallback
            className={cn(
              'text-xs font-bold',
              active
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground'
            )}
          >
            {title?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        {isOnline && !hasActiveHuddle && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 rounded-full border-background ring-1 ring-green-500/20" />
        )}
        {hasActiveHuddle && (
          <span className="absolute bottom-0 right-0 flex items-center justify-center w-4 h-4 bg-green-500 border-2 rounded-full border-background animate-pulse">
            <Headphones className="w-2.5 h-2.5 text-white" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 ml-1">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className={cn(
              'text-sm font-semibold truncate transition-colors',
              active ? 'text-primary' : 'text-foreground'
            )}
          >
            {title}
          </span>
          {hasActiveHuddle && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-white bg-green-500 rounded-full animate-pulse">
              <Headphones className="w-3 h-3" />
              Live
            </span>
          )}
          {hasUnread && !hasActiveHuddle && (
            <span className="px-2 py-0.5 text-[10px] font-bold text-white bg-destructive rounded-full animate-in fade-in zoom-in duration-300">
              New
            </span>
          )}
        </div>
        <p
          className={cn(
            'text-xs truncate transition-colors',
            active ? 'text-primary/70' : 'text-muted-foreground opacity-80',
            hasUnread && 'font-medium text-foreground',
            hasActiveHuddle && 'text-green-600 font-medium'
          )}
        >
          {getLastMessagePreview()}
        </p>
      </div>
    </button>
  );
}
