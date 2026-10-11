import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  Plus,
  Loader2,
  LogOut,
  Search,
  X,
  UserPlus,
  Headphones,
  Radio,
  Mic,
  MicOff,
  PhoneOff,
  VolumeX,
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
import { Led, PresetKey, SectionLabel, channelNo } from '@/components/console';

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
  isSidebarOpen: _isSidebarOpen,
  onClose,
  className,
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

  const { data: searchResults } =
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
        'w-full md:w-[310px] lg:w-[330px] flex flex-col flex-shrink-0 h-full overflow-hidden',
        'bg-card md:rounded-xl md:shadow-panel z-20',
        className
      )}
    >
      {/* Console Channel Bank Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Led tone={activeVoiceRooms.length > 0 ? 'live' : 'signal'} blink={activeVoiceRooms.length > 0} />
          <div className="min-w-0">
            <h2 className="label-engraved text-foreground tracking-[0.16em]">
              CHANNEL BANK <span className="text-muted-foreground font-normal">/ RT-2</span>
            </h2>
            <p className="font-mono text-[10px] text-muted-foreground truncate">
              {activeVoiceRooms.length > 0 ? (
                <span className="text-live font-semibold">
                  VOX ACTIVE: {activeVoiceRooms.length} STATION{activeVoiceRooms.length > 1 ? 'S' : ''}
                </span>
              ) : (
                `ONLINE: ${globalOnlineUsers.length} OPERATORS`
              )}
            </p>
          </div>
        </div>

        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <NavLink to="/new-chat" onClick={() => isMobile && onClose()}>
                <button
                  className="size-8 rounded-full key flex items-center justify-center text-foreground hover:bg-accent transition-all"
                  aria-label="New Channel or DM"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span className="font-mono text-xs">OPEN NEW CHANNEL</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Recessed Search Well */}
      <div className="px-3 pt-2.5 pb-1 flex-shrink-0">
        <div className="relative flex items-center group">
          <Search className="absolute w-3.5 h-3.5 left-3 text-muted-foreground pointer-events-none group-focus-within:text-foreground" />
          <Input
            placeholder="FILTER FREQUENCIES..."
            className="h-8 text-xs font-mono tracking-wide pl-8 pr-7 placeholder:text-muted-foreground/60 rounded-lg"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-muted-foreground hover:text-foreground p-0.5 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Mode Rocker Tabs (ALL / CHN / DMS / VOX) */}
      {!searchQuery && (
        <div className="px-3 py-1 flex-shrink-0">
          <div className="flex items-center gap-1 p-0.5 rounded-full bg-well shadow-well text-xs">
            <button
              onClick={() => {
                setActiveTab('all');
                if (onClearVoiceFilter) onClearVoiceFilter();
              }}
              className={cn(
                'flex-1 py-1 rounded-full font-mono text-[10px] font-semibold tracking-wider transition-all text-center',
                activeTab === 'all'
                  ? 'bg-card text-foreground shadow-key'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              ALL
            </button>

            <button
              onClick={() => {
                setActiveTab('channels');
                if (onClearVoiceFilter) onClearVoiceFilter();
              }}
              className={cn(
                'flex-1 py-1 rounded-full font-mono text-[10px] font-semibold tracking-wider transition-all text-center',
                activeTab === 'channels'
                  ? 'bg-card text-foreground shadow-key'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              CHN
            </button>

            <button
              onClick={() => {
                setActiveTab('direct');
                if (onClearVoiceFilter) onClearVoiceFilter();
              }}
              className={cn(
                'flex-1 py-1 rounded-full font-mono text-[10px] font-semibold tracking-wider transition-all text-center',
                activeTab === 'direct'
                  ? 'bg-card text-foreground shadow-key'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              DMS
            </button>

            <button
              onClick={() => setActiveTab('voice')}
              className={cn(
                'flex-1 py-1 rounded-full font-mono text-[10px] font-semibold tracking-wider transition-all text-center flex items-center justify-center gap-1',
                activeTab === 'voice'
                  ? 'bg-live text-live-foreground shadow-key'
                  : 'text-muted-foreground hover:text-live'
              )}
            >
              <Radio className="w-2.5 h-2.5" />
              VOX
              {activeVoiceRooms.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-live animate-ping" />
              )}
            </button>
          </div>

          {voiceFilterOnly && activeTab === 'voice' && (
            <div className="flex items-center justify-between mt-1 px-1 text-[11px] font-mono text-live">
              <span className="flex items-center gap-1">
                <Led tone="live" blink />
                SHOWING ACTIVE VOX ONLY
              </span>
              {onClearVoiceFilter && (
                <button
                  onClick={() => {
                    onClearVoiceFilter();
                    setActiveTab('all');
                  }}
                  className="underline text-muted-foreground hover:text-foreground"
                >
                  RESET
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Channel List */}
      <div className="flex-1 px-2 py-1.5 overflow-y-auto custom-scrollbar space-y-3">
        {chatRoomsLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <p className="font-mono text-xs">SYNCHRONIZING CHANNELS...</p>
          </div>
        ) : chatRoomsError ? (
          <div className="p-4 text-center">
            <p className="font-mono text-xs text-destructive">LINK ERROR: CANNOT LOAD CHANNELS</p>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            {/* Active Voice Section */}
            {(activeVoiceRooms.length > 0 || activeTab === 'voice') && (
              <div className="space-y-1.5">
                <SectionLabel count={activeVoiceRooms.length} tone="live">
                  ACTIVE VOICE STATIONS
                </SectionLabel>

                {activeVoiceRooms.length === 0 ? (
                  <div className="p-3 text-center rounded-lg bg-well shadow-well my-1">
                    <p className="font-mono text-xs text-muted-foreground">
                      NO ACTIVE TRANSMISSIONS
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                      Select a channel to broadcast
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
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

            {/* Search Results */}
            {searchQuery && (
              <div className="space-y-1">
                <SectionLabel>SEARCH RESULTS</SectionLabel>
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

                {/* New Users Match */}
                {potentialNewChats.length > 0 && (
                  <div className="pt-2">
                    <SectionLabel>NEW RECIPIENTS</SectionLabel>
                    {potentialNewChats.map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleCreateChat(u.id)}
                        className="flex items-center w-full gap-2 p-2 text-left rounded-lg hover:bg-well transition-colors group"
                      >
                        <Avatar className="w-7 h-7 border border-border">
                          <AvatarImage
                            src={getAvatarUrl(u.avatar)}
                            alt={u.name}
                          />
                          <AvatarFallback className="text-[10px] font-bold">
                            {u.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {u.name}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                            <UserPlus className="w-2.5 h-2.5 text-primary" />
                            CONNECT
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Group Channels List */}
            {!searchQuery &&
              (activeTab === 'all' || activeTab === 'channels') &&
              channelRooms.length > 0 && (
                <div className="space-y-1">
                  <SectionLabel
                    count={channelRooms.length}
                    action={
                      <NavLink
                        to="/new-chat"
                        onClick={() => isMobile && onClose()}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="w-3 h-3" />
                      </NavLink>
                    }
                  >
                    GROUP CHANNELS
                  </SectionLabel>

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
                <div className="space-y-1">
                  <SectionLabel
                    count={directRooms.length}
                    action={
                      <NavLink
                        to="/new-chat"
                        onClick={() => isMobile && onClose()}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="w-3 h-3" />
                      </NavLink>
                    }
                  >
                    DIRECT CONTACTS
                  </SectionLabel>

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
                <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-muted-foreground space-y-2">
                  <p className="font-mono text-xs">NO CHANNELS CONFIGURED</p>
                  <NavLink
                    to="/new-chat"
                    onClick={() => isMobile && onClose()}
                  >
                    <Button size="sm" variant="default" className="text-xs mt-1">
                      <Plus className="w-3 h-3 mr-1" />
                      CREATE CHANNEL
                    </Button>
                  </NavLink>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Hardware Transceiver Status Strip */}
      <div className="flex-shrink-0 flex flex-col border-t border-border bg-card">
        {/* Live Audio Strip */}
        {isHuddleActive && huddleChatId && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-live/10 border-b border-live/30">
            <div className="flex items-center gap-2 min-w-0">
              <Led tone="live" blink />
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-bold text-live uppercase tracking-wider truncate">
                  ON AIR · {isUsingSfu ? 'SFU' : 'MESH'}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {currentHuddleRoom?.name || 'Voice Station'}
                </p>
              </div>
            </div>

            {/* Tactile Audio Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleMute}
                className={cn(
                  'size-6 rounded-md flex items-center justify-center transition-all',
                  isMuted ? 'bg-destructive text-destructive-foreground' : 'key text-live'
                )}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              </button>

              <button
                onClick={toggleDeafen}
                className={cn(
                  'size-6 rounded-md flex items-center justify-center transition-all',
                  isDeafened ? 'bg-destructive text-destructive-foreground' : 'key text-live'
                )}
                title={isDeafened ? 'Undeafen' : 'Deafen'}
              >
                {isDeafened ? <VolumeX className="w-3 h-3" /> : <Headphones className="w-3 h-3" />}
              </button>

              <button
                onClick={stopHuddle}
                className="size-6 rounded-md bg-destructive text-destructive-foreground flex items-center justify-center"
                title="Disconnect"
              >
                <PhoneOff className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Operator Profile Strip */}
        <div className="flex items-center justify-between px-3 py-2">
          <Link
            to="/profile"
            onClick={() => isMobile && onClose()}
            className="flex items-center gap-2 min-w-0 group hover:opacity-90"
          >
            <div className="relative flex-shrink-0">
              <Avatar className="w-7 h-7 border border-border">
                <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
                <AvatarFallback className="font-mono text-[10px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Led tone="live" className="absolute -bottom-0.5 -right-0.5 ring-1 ring-card" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                {user.name}
              </p>
              <p className="font-mono text-[9px] text-muted-foreground uppercase tracking-wider">
                OP·{channelNo(user.id)} · READY
              </p>
            </div>
          </Link>

          {/* Quick Hardware Actions */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={toggleMute}
              className={cn(
                'size-7 rounded-md key flex items-center justify-center transition-colors',
                isMuted ? 'text-destructive' : 'text-muted-foreground hover:text-foreground'
              )}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleLogout}
              className="size-7 rounded-md key flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              title="Log Out Operator"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
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
        'group relative flex flex-col gap-1.5 p-2 rounded-lg transition-all border',
        isCurrentHuddle
          ? 'bg-live/15 border-live/40 shadow-sm'
          : 'bg-live/5 hover:bg-live/10 border-live/20'
      )}
    >
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={onSelect}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Led tone="live" blink={isCurrentHuddle} />
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold text-foreground truncate">
              {title}
            </p>
            <p className="font-mono text-[9px] text-live tracking-wide">
              LIVE · {participantCount} CONNECTED
            </p>
          </div>
        </div>

        {isCurrentHuddle ? (
          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-live text-live-foreground uppercase tracking-wider">
            CONNECTED
          </span>
        ) : (
          <button
            onClick={e => {
              e.stopPropagation();
              onJoinHuddle();
            }}
            className="h-6 px-2.5 rounded-full bg-live text-live-foreground font-mono text-[10px] font-bold uppercase shadow-key active:translate-y-px"
          >
            TUNE IN
          </button>
        )}
      </div>

      {/* Participant avatars */}
      {roomHuddleParticipants.length > 0 && (
        <div className="flex items-center gap-1 pl-4">
          <div className="flex -space-x-1.5 overflow-hidden">
            {roomHuddleParticipants.slice(0, 5).map(p => {
              const isSpeaking = speakingUserIds.includes(p.id);
              return (
                <div key={p.id} className="relative">
                  <Avatar
                    className={cn(
                      'w-5 h-5 border ring-1 transition-all',
                      isSpeaking
                        ? 'ring-live border-live animate-pulse'
                        : 'ring-card border-card'
                    )}
                  >
                    <AvatarImage src={getAvatarUrl(p.avatar)} alt={p.name} />
                    <AvatarFallback className="text-[8px] font-bold font-mono">
                      {p.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              );
            })}
          </div>
          {roomHuddleParticipants.length > 5 && (
            <span className="font-mono text-[9px] text-muted-foreground pl-1">
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

  const isAnyoneSpeaking = roomHuddleParticipants.some(p =>
    speakingUserIds.includes(p.id)
  );

  const getLastMessagePreview = () => {
    if (hasActiveHuddle) {
      return (
        <span className="font-mono text-live font-semibold flex items-center gap-1">
          <Led tone="live" blink={isAnyoneSpeaking} />
          {isUserInRoomHuddle
            ? 'ON AIR [SELF]'
            : `VOX LIVE (${roomHuddleParticipants.length})`}
        </span>
      );
    }

    if (room.last_message) {
      const isOwnMessage = room.last_message.sender.id === currentUserId;
      const content = room.last_message.content;
      const truncated =
        content.length > 28 ? content.substring(0, 28) + '...' : content;

      return (
        <>
          {isOwnMessage && <span className="text-muted-foreground/60">YOU: </span>}
          {truncated}
        </>
      );
    }

    if (room.is_group_chat) {
      return `${room.participants.length} MEMBERS`;
    }

    return 'READY';
  };

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left group relative',
        active
          ? 'bg-well shadow-well text-foreground font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-primary before:rounded-r-full'
          : hasActiveHuddle
            ? 'bg-live/5 hover:bg-live/10 text-foreground'
            : 'hover:bg-accent/60 text-muted-foreground hover:text-foreground'
      )}
    >
      {/* Preset Key or Avatar */}
      <div className="relative flex-shrink-0">
        {room.is_group_chat ? (
          <PresetKey
            name={title}
            active={active}
            live={hasActiveHuddle}
            size="sm"
          />
        ) : (
          <div className="relative">
            <Avatar className={cn('w-7 h-7 border border-border')}>
              <AvatarImage src={getAvatarUrl(avatar)} alt={title} />
              <AvatarFallback className="font-mono text-[10px] font-bold">
                {title?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <Led tone="live" className="absolute -bottom-0.5 -right-0.5 ring-1 ring-card" />
            )}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-xs truncate transition-colors font-medium',
              active ? 'text-foreground font-bold' : 'text-foreground'
            )}
          >
            {title}
          </span>

          <div className="flex items-center gap-1 flex-shrink-0">
            {hasActiveHuddle && (
              <span className="font-mono text-[9px] text-live font-bold px-1 rounded bg-live/15">
                VOX
              </span>
            )}
            {hasUnread && !hasActiveHuddle && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground font-mono text-[9px] font-bold flex items-center justify-center">
                {room.unread_count && room.unread_count > 1 ? room.unread_count : '·'}
              </span>
            )}
          </div>
        </div>

        <p className="font-mono text-[10.5px] truncate text-muted-foreground mt-0.5">
          {getLastMessagePreview()}
        </p>
      </div>
    </button>
  );
}
