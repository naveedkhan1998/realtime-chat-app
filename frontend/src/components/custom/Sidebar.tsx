import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Loader2,
  LogOut,
  Search,
  X,
  Sparkles,
  UserPlus,
  Headphones,
  Radio,
  Hash,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  VolumeX,
  ChevronDown,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { logOut } from '@/features/authSlice';
import { useLogoutMutation } from '@/services/authApi';
import {
  setUnreadNotification,
  selectGlobalOnlineUsers,
  selectHasUnreadNotification,
  selectRoomHuddleParticipants,
  selectActiveHuddleRoomIds,
} from '@/features/unifiedChatSlice';
import {
  useGetChatRoomsQuery,
  ChatRoom,
  chatApi,
  useCreateChatRoomMutation,
  useGetNotificationsQuery,
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
  voiceFilterOnly?: boolean;
  onClearVoiceFilter?: () => void;
}

type TabType = 'all' | 'channels' | 'direct' | 'voice';

export default function Sidebar({
  activeChat,
  setActiveChat,
  isMobile,
  isSidebarOpen,
  onClose,
  className,
  showCloseButton = true,
  voiceFilterOnly = false,
  onClearVoiceFilter,
}: SidebarProps) {
  const user = useAppSelector(state => state.auth.user);
  const refreshToken = useAppSelector(state => state.auth.refreshToken);
  const globalOnlineUsers = useAppSelector(selectGlobalOnlineUsers);
  const activeHuddleRoomIds = useAppSelector(selectActiveHuddleRoomIds);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    isHuddleActive,
    huddleChatId,
    startHuddle,
    stopHuddle,
    isMuted,
    toggleMute,
    isDeafened,
    toggleDeafen,
    speakingUserIds,
    isUsingSfu,
  } = useHuddle();

  const [logout] = useLogoutMutation();

  const [activeTab, setActiveTab] = useState<TabType>(
    voiceFilterOnly ? 'voice' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Sync activeTab when voiceFilterOnly prop changes
  useEffect(() => {
    if (voiceFilterOnly) {
      setActiveTab('voice');
    }
  }, [voiceFilterOnly]);

  const {
    data: chatRooms,
    isLoading: chatRoomsLoading,
    error: chatRoomsError,
  } = useGetChatRoomsQuery();

  const { data: notifications } = useGetNotificationsQuery();

  const { data: searchResults, isLoading: isSearchingUsers } =
    useSearchUsersQuery(
      { query: debouncedSearchQuery },
      { skip: !debouncedSearchQuery }
    );

  const [createChatRoom] = useCreateChatRoomMutation();

  useEffect(() => {
    if (notifications) {
      notifications.forEach(notification => {
        if (
          !notification.is_read &&
          notification.chat_room &&
          notification.chat_room !== activeChat
        ) {
          dispatch(setUnreadNotification(notification.chat_room));
        }
      });
    }
  }, [notifications, dispatch, activeChat]);

  // Handle chat room creation events via unified WebSocket
  const handleChatRoomCreated = useCallback(
    (event: GlobalChatRoomCreatedEvent) => {
      dispatch(
        chatApi.util.updateQueryData('getChatRooms', undefined, draft => {
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
      if (event.chat_room_id !== activeChat) {
        dispatch(setUnreadNotification(event.chat_room_id));
      }

      dispatch(
        chatApi.util.updateQueryData('getChatRooms', undefined, draft => {
          const roomIndex = draft.findIndex(
            room => room.id === event.chat_room_id
          );
          if (roomIndex !== -1) {
            const room = draft[roomIndex];
            room.last_message = {
              id: Date.now(),
              sender: {
                id: event.sender_id,
                name: event.sender_name || 'Unknown',
                avatar: undefined,
              },
              content: event.message_content || '',
              attachment: event.has_attachment ? 'attachment' : undefined,
              timestamp: new Date().toISOString(),
            };
            if (event.chat_room_id !== activeChat) {
              room.unread_count = (room.unread_count || 0) + 1;
            }
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

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logout({ refresh: refreshToken }).unwrap();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch(logOut());
      dispatch(baseApi.util.resetApiState());
    }
  };

  // Filter existing chats based on search query
  const filteredChatRooms = useMemo(() => {
    return chatRooms
      ?.filter(room => {
        if (!debouncedSearchQuery) return true;

        if (
          room.name?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        )
          return true;

        return room.participants.some(
          p =>
            p.id !== user?.id &&
            p.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        );
      })
      .sort((a, b) => {
        // Prioritize active huddle rooms
        const aHuddle =
          activeHuddleRoomIds.includes(a.id) || huddleChatId === a.id;
        const bHuddle =
          activeHuddleRoomIds.includes(b.id) || huddleChatId === b.id;
        if (aHuddle && !bHuddle) return -1;
        if (!aHuddle && bHuddle) return 1;

        // Then sort by online count
        const getOnlineCount = (room: ChatRoom) =>
          room.participants.filter(
            p => p.id !== user?.id && globalOnlineUsers.includes(p.id)
          ).length;

        return getOnlineCount(b) - getOnlineCount(a);
      });
  }, [
    chatRooms,
    debouncedSearchQuery,
    user?.id,
    activeHuddleRoomIds,
    huddleChatId,
    globalOnlineUsers,
  ]);

  // Split into Channels and Direct Messages
  const channelRooms = useMemo(
    () => filteredChatRooms?.filter(r => r.is_group_chat) || [],
    [filteredChatRooms]
  );

  const directRooms = useMemo(
    () => filteredChatRooms?.filter(r => !r.is_group_chat) || [],
    [filteredChatRooms]
  );

  // Active Voice Lounge rooms
  const activeVoiceRooms = useMemo(() => {
    if (!chatRooms) return [];
    return chatRooms.filter(
      r => activeHuddleRoomIds.includes(r.id) || huddleChatId === r.id
    );
  }, [chatRooms, activeHuddleRoomIds, huddleChatId]);

  // Exclude existing DM users from search suggestions
  const existingDMParticipantIds = new Set(
    chatRooms
      ?.filter(r => !r.is_group_chat)
      .flatMap(r => r.participants)
      .filter(p => p.id !== user?.id)
      .map(p => p.id)
  );

  const potentialNewChats =
    searchResults?.filter(
      u => u.id !== user?.id && !existingDMParticipantIds.has(u.id)
    ) || [];

  const handleCreateChat = async (userId: number) => {
    try {
      const res = await createChatRoom({ participant_ids: [userId] }).unwrap();
      setActiveChat(res.id);
      navigate(`/chat/${res.id}`);
      if (isMobile) onClose();
      setSearchQuery('');
    } catch (e) {
      console.error('Failed to create chat', e);
    }
  };

  const currentHuddleRoom = chatRooms?.find(r => r.id === huddleChatId);

  if (!user) return null;

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[300px] sm:w-[320px] flex-col transition-transform duration-300 ease-out md:relative md:translate-x-0 flex-shrink-0',
        isMobile
          ? isSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full'
          : 'translate-x-0',
        className
      )}
    >
      {/* Outer Shell */}
      <div className="flex flex-col w-full h-full overflow-hidden border-r border-border/60 bg-card/80 dark:bg-card/90 backdrop-blur-2xl">
        {/* Workspace Brand & Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/50 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold flex-shrink-0">
              <Radio className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight truncate text-foreground flex items-center gap-1.5">
                Workspace Hub
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
              </h2>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                {activeVoiceRooms.length > 0 ? (
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {activeVoiceRooms.length} Active Voice
                  </span>
                ) : (
                  'Realtime Collab'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink to="/new-chat" onClick={() => isMobile && onClose()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  New Chat or Channel
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {isMobile && showCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 rounded-full text-muted-foreground hover:bg-muted"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="px-3 pt-3 pb-1.5 flex-shrink-0">
          <div className="relative flex items-center group">
            <Search className="absolute w-3.5 h-3.5 transition-colors -translate-y-1/2 left-3 top-1/2 text-muted-foreground group-focus-within:text-primary pointer-events-none" />
            <Input
              placeholder="Jump to or search..."
              className="h-9 text-xs transition-all border-border/40 pl-9 pr-8 bg-muted/40 hover:bg-muted/60 focus:bg-background focus:border-primary/30 rounded-xl placeholder:text-muted-foreground/60"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute -translate-y-1/2 right-2.5 top-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        {!searchQuery && (
          <div className="px-3 py-1 flex-shrink-0">
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/40 border border-border/40 text-xs">
              <button
                onClick={() => {
                  setActiveTab('all');
                  if (onClearVoiceFilter) onClearVoiceFilter();
                }}
                className={cn(
                  'flex-1 py-1 px-2 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1',
                  activeTab === 'all'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                All
              </button>

              <button
                onClick={() => {
                  setActiveTab('channels');
                  if (onClearVoiceFilter) onClearVoiceFilter();
                }}
                className={cn(
                  'flex-1 py-1 px-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1',
                  activeTab === 'channels'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Hash className="w-3 h-3 opacity-70" />
                Channels
              </button>

              <button
                onClick={() => {
                  setActiveTab('direct');
                  if (onClearVoiceFilter) onClearVoiceFilter();
                }}
                className={cn(
                  'flex-1 py-1 px-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1',
                  activeTab === 'direct'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <MessageSquare className="w-3 h-3 opacity-70" />
                DMs
              </button>

              <button
                onClick={() => setActiveTab('voice')}
                className={cn(
                  'flex-1 py-1 px-1.5 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 relative',
                  activeTab === 'voice'
                    ? 'bg-emerald-500/15 text-emerald-500 font-semibold border border-emerald-500/30'
                    : 'text-muted-foreground hover:text-emerald-500'
                )}
              >
                <Radio className="w-3 h-3" />
                Voice
                {activeVoiceRooms.length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                )}
              </button>
            </div>

            {voiceFilterOnly && activeTab === 'voice' && (
              <div className="flex items-center justify-between mt-1.5 px-1 py-0.5 text-[11px] text-emerald-500 font-medium">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  Showing Voice Lounges
                </span>
                {onClearVoiceFilter && (
                  <button
                    onClick={() => {
                      onClearVoiceFilter();
                      setActiveTab('all');
                    }}
                    className="underline text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Conversation & Voice Lounges List */}
        <div className="flex-1 px-2 py-1 overflow-y-auto custom-scrollbar">
          {chatRoomsLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Loading conversations...</p>
            </div>
          ) : chatRoomsError ? (
            <div className="p-4 text-center">
              <p className="text-xs text-destructive">Failed to load chats</p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {/* Active Voice Lounges Section */}
              {(activeVoiceRooms.length > 0 || activeTab === 'voice') && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-500 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Active Voice Lounges ({activeVoiceRooms.length})
                    </span>
                  </div>

                  {activeVoiceRooms.length === 0 ? (
                    <div className="p-3 text-center rounded-xl bg-muted/20 border border-border/40 my-1">
                      <Radio className="w-5 h-5 mx-auto mb-1 text-muted-foreground/60" />
                      <p className="text-xs font-medium text-muted-foreground">
                        No active voice calls right now
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                        Open any chat to start an audio huddle
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {activeVoiceRooms.map(room => (
                        <ActiveVoiceLoungeCard
                          key={room.id}
                          room={room}
                          isCurrentHuddle={huddleChatId === room.id}
                          currentUserId={user.id}
                          speakingUserIds={speakingUserIds}
                          onSelect={() => {
                            setActiveChat(room.id);
                            navigate(`/chat/${room.id}`);
                            if (isMobile) onClose();
                          }}
                          onJoinHuddle={() => {
                            setActiveChat(room.id);
                            navigate(`/chat/${room.id}`);
                            startHuddle(room.id);
                            if (isMobile) onClose();
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Search Results State */}
              {searchQuery && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground px-2">
                    Search Results
                  </span>
                  {filteredChatRooms?.map(room => (
                    <ConversationRow
                      key={room.id}
                      room={room}
                      active={activeChat === room.id}
                      currentUserId={user.id}
                      onlineUsers={globalOnlineUsers}
                      huddleChatId={isHuddleActive ? huddleChatId : null}
                      speakingUserIds={speakingUserIds}
                      onSelect={() => {
                        setActiveChat(room.id);
                        navigate(`/chat/${room.id}`);
                        if (isMobile) onClose();
                        setSearchQuery('');
                      }}
                    />
                  ))}

                  {/* Potential New People */}
                  {potentialNewChats.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground px-2">
                        Start New Chat
                      </span>
                      {potentialNewChats.map(u => (
                        <button
                          key={u.id}
                          onClick={() => handleCreateChat(u.id)}
                          className="flex items-center w-full gap-2.5 p-2 text-left rounded-xl hover:bg-muted/60 transition-colors group"
                        >
                          <Avatar className="w-8 h-8 border border-border">
                            <AvatarImage
                              src={getAvatarUrl(u.avatar)}
                              alt={u.name}
                            />
                            <AvatarFallback className="text-xs bg-muted">
                              {u.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {u.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <UserPlus className="w-3 h-3 text-primary" />
                              Start Conversation
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredChatRooms?.length === 0 &&
                    potentialNewChats.length === 0 &&
                    !isSearchingUsers && (
                      <p className="text-center text-xs text-muted-foreground py-6">
                        No results found for "{searchQuery}"
                      </p>
                    )}
                </div>
              )}

              {/* Group Channels List */}
              {!searchQuery &&
                (activeTab === 'all' || activeTab === 'channels') &&
                channelRooms.length > 0 && (
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3" />
                        Channels ({channelRooms.length})
                      </span>
                      <NavLink
                        to="/new-chat"
                        onClick={() => isMobile && onClose()}
                        className="hover:text-foreground"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </NavLink>
                    </div>

                    {channelRooms.map(room => (
                      <ConversationRow
                        key={room.id}
                        room={room}
                        active={activeChat === room.id}
                        currentUserId={user.id}
                        onlineUsers={globalOnlineUsers}
                        huddleChatId={isHuddleActive ? huddleChatId : null}
                        speakingUserIds={speakingUserIds}
                        onSelect={() => {
                          setActiveChat(room.id);
                          navigate(`/chat/${room.id}`);
                          if (isMobile) onClose();
                        }}
                      />
                    ))}
                  </div>
                )}

              {/* Direct Messages List */}
              {!searchQuery &&
                (activeTab === 'all' || activeTab === 'direct') &&
                directRooms.length > 0 && (
                  <div className="space-y-0.5 pt-1">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Direct Messages ({directRooms.length})
                      </span>
                      <NavLink
                        to="/new-chat"
                        onClick={() => isMobile && onClose()}
                        className="hover:text-foreground"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </NavLink>
                    </div>

                    {directRooms.map(room => (
                      <ConversationRow
                        key={room.id}
                        room={room}
                        active={activeChat === room.id}
                        currentUserId={user.id}
                        onlineUsers={globalOnlineUsers}
                        huddleChatId={isHuddleActive ? huddleChatId : null}
                        speakingUserIds={speakingUserIds}
                        onSelect={() => {
                          setActiveChat(room.id);
                          navigate(`/chat/${room.id}`);
                          if (isMobile) onClose();
                        }}
                      />
                    ))}
                  </div>
                )}

              {/* Empty State */}
              {!searchQuery &&
                (!chatRooms || chatRooms.length === 0) &&
                activeTab !== 'voice' && (
                  <div className="flex flex-col items-center justify-center px-4 py-10 text-center text-muted-foreground space-y-2">
                    <Sparkles className="w-8 h-8 text-primary/60" />
                    <p className="text-xs font-semibold">
                      No conversations yet
                    </p>
                    <NavLink
                      to="/new-chat"
                      onClick={() => isMobile && onClose()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs mt-1"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Start Chat
                      </Button>
                    </NavLink>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Discord-Style Bottom Bar: Voice Status + User Profile */}
        <div className="flex-shrink-0 flex flex-col border-t border-border/60 bg-card/95 dark:bg-card/95">
          {/* Active Voice Connected Bar (Shown when user is in a call) */}
          {isHuddleActive && huddleChatId && (
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-950/40 dark:bg-emerald-950/60 border-b border-emerald-500/25">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 truncate">
                    Voice Connected
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {currentHuddleRoom?.name || 'Active Huddle'} •{' '}
                    <span className="text-emerald-500/80 font-mono">
                      {isUsingSfu ? 'SFU' : 'Mesh'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Fast Inline Call Controls */}
              <div className="flex items-center gap-1">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={toggleMute}
                        className={cn(
                          'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                          isMuted
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                        )}
                      >
                        {isMuted ? (
                          <MicOff className="w-3.5 h-3.5" />
                        ) : (
                          <Mic className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {isMuted
                        ? 'Unmute (Ctrl+Shift+M)'
                        : 'Mute (Ctrl+Shift+M)'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={toggleDeafen}
                        className={cn(
                          'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                          isDeafened
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                        )}
                      >
                        {isDeafened ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Headphones className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {isDeafened ? 'Undeafen' : 'Deafen'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={stopHuddle}
                        className="flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive hover:text-white transition-colors"
                      >
                        <PhoneOff className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Disconnect Huddle
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* User Status Bar (Desktop only) */}
          <div className="hidden md:flex items-center justify-between px-3 py-2.5">
            <Link
              to="/profile"
              onClick={() => isMobile && onClose()}
              className="flex items-center gap-2.5 min-w-0 group hover:opacity-90 transition-opacity"
            >
              <div className="relative flex-shrink-0">
                <Avatar className="w-8 h-8 border border-border">
                  <AvatarImage
                    src={getAvatarUrl(user.avatar)}
                    alt={user.name}
                  />
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                  {user.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  Online
                </p>
              </div>
            </Link>

            {/* Quick Micro Mute & Settings Controls */}
            <div className="flex items-center gap-0.5">
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleMute}
                      className={cn(
                        'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                        isMuted
                          ? 'bg-destructive/15 text-destructive'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {isMuted ? (
                        <MicOff className="w-3.5 h-3.5" />
                      ) : (
                        <Mic className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {isMuted ? 'Unmute' : 'Mute'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={toggleDeafen}
                      className={cn(
                        'flex items-center justify-center w-7 h-7 rounded-lg transition-colors',
                        isDeafened
                          ? 'bg-destructive/15 text-destructive'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {isDeafened ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Headphones className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {isDeafened ? 'Undeafen' : 'Deafen'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Log Out</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ==================== Active Voice Lounge Card ====================

function ActiveVoiceLoungeCard({
  room,
  isCurrentHuddle,
  currentUserId,
  speakingUserIds,
  onSelect,
  onJoinHuddle,
}: {
  room: ChatRoom;
  isCurrentHuddle: boolean;
  currentUserId: number;
  speakingUserIds: number[];
  onSelect: () => void;
  onJoinHuddle: () => void;
}) {
  const roomHuddleParticipants = useAppSelector(state =>
    selectRoomHuddleParticipants(state, room.id)
  );

  const counterpart = room.is_group_chat
    ? null
    : room.participants.find(p => p.id !== currentUserId);

  const title = room.is_group_chat
    ? room.name
    : (counterpart?.name ?? 'Direct Voice Lounge');

  const participantCount = roomHuddleParticipants.length;

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-2 p-2.5 rounded-xl transition-all duration-200 border',
        isCurrentHuddle
          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm'
          : 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20'
      )}
    >
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onSelect}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex-shrink-0">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate group-hover:text-emerald-500 transition-colors">
              {title}
            </p>
            <p className="text-[10px] text-emerald-500 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {participantCount} in huddle
            </p>
          </div>
        </div>

        {isCurrentHuddle ? (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white font-bold text-[10px] tracking-wide">
            Connected
          </span>
        ) : (
          <Button
            size="sm"
            onClick={e => {
              e.stopPropagation();
              onJoinHuddle();
            }}
            className="h-6 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-none"
          >
            Join
          </Button>
        )}
      </div>

      {/* Participant Avatar Cluster */}
      {roomHuddleParticipants.length > 0 && (
        <div className="flex items-center gap-1 pl-1">
          <div className="flex -space-x-1.5 overflow-hidden">
            {roomHuddleParticipants.slice(0, 5).map(p => {
              const isSpeaking = speakingUserIds.includes(p.id);
              return (
                <div key={p.id} className="relative">
                  <Avatar
                    className={cn(
                      'w-5 h-5 border ring-1 transition-all',
                      isSpeaking
                        ? 'ring-emerald-400 border-emerald-500'
                        : 'ring-card border-card'
                    )}
                  >
                    <AvatarImage src={getAvatarUrl(p.avatar)} alt={p.name} />
                    <AvatarFallback className="text-[9px] font-bold bg-muted">
                      {p.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              );
            })}
          </div>
          {roomHuddleParticipants.length > 5 && (
            <span className="text-[9px] font-semibold text-muted-foreground pl-1">
              +{roomHuddleParticipants.length - 5}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== Conversation Row ====================

function ConversationRow({
  room,
  active,
  currentUserId,
  onlineUsers,
  huddleChatId,
  speakingUserIds,
  onSelect,
}: {
  room: ChatRoom;
  active: boolean;
  currentUserId: number;
  onlineUsers: number[];
  huddleChatId: number | null;
  speakingUserIds: number[];
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

  const hasUnreadFromApi = (room.unread_count ?? 0) > 0;
  const hasUnreadFromState = useAppSelector(state =>
    selectHasUnreadNotification(state, room.id)
  );
  const hasUnread = hasUnreadFromApi || hasUnreadFromState;

  const roomHuddleParticipants = useAppSelector(state =>
    selectRoomHuddleParticipants(state, room.id)
  );
  const isRoomHuddleActive = roomHuddleParticipants.length > 0;
  const isUserInRoomHuddle = huddleChatId === room.id;
  const hasActiveHuddle = isRoomHuddleActive || isUserInRoomHuddle;

  // Check if anyone in this room is currently speaking
  const isAnyoneSpeaking = roomHuddleParticipants.some(p =>
    speakingUserIds.includes(p.id)
  );

  const getLastMessagePreview = () => {
    if (hasActiveHuddle) {
      return (
        <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          {isUserInRoomHuddle
            ? 'Connected in Huddle'
            : `Voice Huddle (${roomHuddleParticipants.length})`}
        </span>
      );
    }

    if (room.last_message) {
      const isOwnMessage = room.last_message.sender.id === currentUserId;
      const content = room.last_message.content;
      const truncated =
        content.length > 30 ? content.substring(0, 30) + '...' : content;

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

    return 'Click to chat';
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all duration-150 text-left group relative overflow-hidden',
        active
          ? 'bg-primary/10 text-primary font-medium border border-primary/20 shadow-sm'
          : hasActiveHuddle
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-foreground'
            : 'hover:bg-muted/50 border border-transparent text-muted-foreground hover:text-foreground'
      )}
    >
      {active && (
        <div className="absolute left-0 w-1 h-5 -translate-y-1/2 rounded-r-full top-1/2 bg-primary" />
      )}

      {/* Avatar or Channel Icon */}
      <div className="relative flex-shrink-0">
        {room.is_group_chat ? (
          <div
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-all',
              active
                ? 'bg-primary text-primary-foreground'
                : hasActiveHuddle
                  ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
                  : 'bg-muted text-muted-foreground group-hover:text-foreground'
            )}
          >
            <Hash className="w-4 h-4" />
          </div>
        ) : (
          <Avatar
            className={cn(
              'w-8 h-8 border transition-all',
              isAnyoneSpeaking
                ? 'ring-2 ring-emerald-400 border-emerald-500 animate-pulse'
                : active
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border'
            )}
          >
            <AvatarImage src={getAvatarUrl(avatar)} alt={title} />
            <AvatarFallback className="text-xs font-bold bg-muted">
              {title?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}

        {isOnline && !room.is_group_chat && !hasActiveHuddle && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 rounded-full border-background" />
        )}

        {hasActiveHuddle && (
          <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center w-3.5 h-3.5 bg-emerald-500 border border-background rounded-full text-white">
            <Radio className="w-2 h-2" />
          </span>
        )}
      </div>

      {/* Room Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className={cn(
              'text-xs font-semibold truncate transition-colors',
              active ? 'text-primary' : 'text-foreground'
            )}
          >
            {title}
          </span>

          {hasActiveHuddle && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-[9px]">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              Live
            </span>
          )}

          {hasUnread && !hasActiveHuddle && (
            <span className="px-1.5 py-0.2 text-[9px] font-bold text-white bg-primary rounded-full">
              New
            </span>
          )}
        </div>

        <p
          className={cn(
            'text-[11px] truncate transition-colors',
            active ? 'text-primary/80' : 'text-muted-foreground',
            hasUnread && 'font-semibold text-foreground',
            hasActiveHuddle && 'text-emerald-500 font-medium'
          )}
        >
          {getLastMessagePreview()}
        </p>
      </div>
    </button>
  );
}
