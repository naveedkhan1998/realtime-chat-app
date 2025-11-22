import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  ArrowLeft,
  Send,
  Loader2,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  ChevronDown,
} from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  Message,
  ChatRoom,
  useLazyGetMessagesPageQuery,
  useGetIceServersQuery,
} from '@/services/chatApi';
import { WebSocketService, type HuddleSignalEvent } from '@/utils/websocket';
import { UserProfile } from '@/services/userApi';
import {
  prependMessages,
  setMessagePagination,
  setMessages,
} from '@/features/chatSlice';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import MessageBubble from './MessageBubble';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  user: UserProfile;
  activeChat: number;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
  chatRooms: ChatRoom[] | undefined;
}

const emptyMessages: Message[] = [];
const emptyPresence: UserProfile[] = [];
const emptyTypingMap: Record<number, boolean> = {};
const emptyHuddleParticipants: Array<{ id: number; name: string }> = [];

export default function ChatWindow({
  user,
  activeChat,
  setActiveChat,
  isMobile,
  chatRooms,
}: ChatWindowProps) {
  const dispatch = useAppDispatch();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const messages = useAppSelector(
    state => state.chat.messages[activeChat] || emptyMessages
  );
  const presence = useAppSelector(
    state => state.chat.presence[activeChat] ?? emptyPresence
  );
  const typingMap = useAppSelector(
    state => state.chat.typingStatuses[activeChat] ?? emptyTypingMap
  );
  const huddleParticipants = useAppSelector(
    state =>
      state.chat.huddleParticipants[activeChat] ?? emptyHuddleParticipants
  );
  const existingMessagesRef = useRef(messages);
  const nextCursor = useAppSelector(
    state => state.chat.pagination[activeChat]?.nextCursor ?? null
  );
  const { register, handleSubmit, reset, setValue, watch } = useForm<{
    message: string;
  }>();
  const [fetchMessagesPage] = useLazyGetMessagesPageQuery();
  const { data: iceServers } = useGetIceServersQuery();
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const initialScrollDoneRef = useRef(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noteUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isHuddleActive, setIsHuddleActive] = useState(false);
  const huddleJoinTimeRef = useRef<number>(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<number, MediaStream>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<
    Array<{ userId: number; stream: MediaStream }>
  >([]);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback(
    (behavior: 'auto' | 'instant' | 'smooth' = 'smooth') => {
      if (messagesEndRef.current) {
        // Add a small delay to ensure layout is complete
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
        }, 100);
      }
    },
    []
  );

  const activeRoom = chatRooms?.find(chat => chat.id === activeChat);
  const otherParticipant =
    activeRoom?.participants.find(participant => participant.id !== user.id) ||
    user;

  const extractCursor = useCallback((url: string | null) => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('cursor');
    } catch {
      return null;
    }
  }, []);

  const fetchInitialMessages = useCallback(async () => {
    if (!activeChat) return;
    setInitialLoading(true);

    try {
      const response = await fetchMessagesPage({
        chat_room_id: activeChat,
        limit: 30,
      }).unwrap();
      const ordered = [...response.results].reverse();
      const merged = mergeMessages(existingMessagesRef.current, ordered);
      dispatch(setMessages({ chatRoomId: activeChat, messages: merged }));
      dispatch(
        setMessagePagination({
          chatRoomId: activeChat,
          nextCursor: extractCursor(response.next),
        })
      );
      shouldAutoScrollRef.current = true;
      requestAnimationFrame(() => scrollToBottom('auto'));
      initialScrollDoneRef.current = true;
    } catch (error) {
      console.error('Failed to load messages', error);

      dispatch(setMessages({ chatRoomId: activeChat, messages: [] }));
      dispatch(
        setMessagePagination({ chatRoomId: activeChat, nextCursor: null })
      );
    } finally {
      setInitialLoading(false);
    }
  }, [activeChat, dispatch, extractCursor, fetchMessagesPage, scrollToBottom]);

  const handleLoadMore = useCallback(async () => {
    if (!activeChat || !nextCursor) return;
    setLoadingMore(true);
    try {
      const response = await fetchMessagesPage({
        chat_room_id: activeChat,
        cursor: nextCursor,
        limit: 30,
      }).unwrap();
      const ordered = [...response.results].reverse();
      shouldAutoScrollRef.current = false;
      dispatch(prependMessages({ chatRoomId: activeChat, messages: ordered }));
      dispatch(
        setMessagePagination({
          chatRoomId: activeChat,
          nextCursor: extractCursor(response.next),
        })
      );
    } catch (error) {
      console.error('Failed to load older messages', error);
    } finally {
      setLoadingMore(false);
    }
  }, [activeChat, dispatch, extractCursor, fetchMessagesPage, nextCursor]);

  const cancelEditing = useCallback(() => {
    setEditingMessage(null);
    reset();
  }, [reset]);

  const startEditing = useCallback(
    (message: Message) => {
      setEditingMessage(message);
      setValue('message', message.content);
      shouldAutoScrollRef.current = false;
    },
    [setValue]
  );

  const handleDeleteMessage = useCallback(
    (message: Message) => {
      const confirmed = window.confirm(
        'Delete this message? This action cannot be undone.'
      );
      if (!confirmed) return;
      const ws = WebSocketService.getInstance();
      ws.sendDeleteMessage(message.id);
      if (editingMessage?.id === message.id) {
        cancelEditing();
      }
    },
    [cancelEditing, editingMessage]
  );

  const refreshRemoteStreams = useCallback(() => {
    setRemoteStreams(
      Array.from(remoteStreamsRef.current.entries()).map(
        ([userId, stream]) => ({ userId, stream })
      )
    );
  }, []);

  const ensurePeerConnection = useCallback(
    (peerId: number, initiator: boolean) => {
      if (peersRef.current.has(peerId)) {
        return peersRef.current.get(peerId)!;
      }
      const pc = new RTCPeerConnection({
        iceServers: iceServers || [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peersRef.current.set(peerId, pc);

      pc.onicecandidate = event => {
        if (event.candidate) {
          WebSocketService.getInstance().sendHuddleSignal(peerId, {
            type: 'candidate',
            candidate: event.candidate,
          });
        }
      };

      pc.ontrack = event => {
        remoteStreamsRef.current.set(peerId, event.streams[0]);
        refreshRemoteStreams();
      };

      pc.onconnectionstatechange = () => {
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          pc.close();
          peersRef.current.delete(peerId);
          remoteStreamsRef.current.delete(peerId);
          refreshRemoteStreams();
        }
      };

      if (localStreamRef.current) {
        localStreamRef.current
          .getTracks()
          .forEach(track => pc.addTrack(track, localStreamRef.current!));
      }

      if (initiator) {
        (async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          WebSocketService.getInstance().sendHuddleSignal(peerId, {
            type: 'offer',
            sdp: offer,
          });
        })();
      }

      return pc;
    },
    [iceServers, refreshRemoteStreams]
  );

  const startHuddle = useCallback(async () => {
    if (isHuddleActive) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      setIsHuddleActive(true);
      huddleJoinTimeRef.current = Date.now();
      WebSocketService.getInstance().sendHuddleJoin();
    } catch (error) {
      console.error('❌ Failed to start huddle:', error);
      alert('Failed to access microphone.');
    }
  }, [isHuddleActive]);

  const stopHuddle = useCallback(() => {
    if (isHuddleActive) {
      WebSocketService.getInstance().sendHuddleLeave();
    }
    peersRef.current.forEach(pc => pc.close());
    peersRef.current.clear();
    remoteStreamsRef.current.clear();
    refreshRemoteStreams();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localAudioRef.current) {
      localAudioRef.current.srcObject = null;
    }
    setIsHuddleActive(false);
  }, [isHuddleActive, refreshRemoteStreams]);

  const handleHuddleSignal = useCallback(
    async (event: HuddleSignalEvent) => {
      if (!isHuddleActive) return;
      const { from, payload } = event;
      if (!payload || from.id === user.id) return;
      const pc = ensurePeerConnection(from.id, false);
      if (!pc) return;
      if (payload.type === 'offer' && payload.sdp) {
        await pc.setRemoteDescription(payload.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        WebSocketService.getInstance().sendHuddleSignal(from.id, {
          type: 'answer',
          sdp: answer,
        });
      } else if (payload.type === 'answer' && payload.sdp) {
        await pc.setRemoteDescription(payload.sdp);
      } else if (payload.type === 'candidate' && payload.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.error('Failed to add ICE candidate', err);
        }
      }
    },
    [ensurePeerConnection, isHuddleActive, user.id]
  );

  useEffect(() => {
    const ws = WebSocketService.getInstance();
    const handler = (event: HuddleSignalEvent) => handleHuddleSignal(event);
    ws.on('huddle_signal', handler);
    return () => {
      ws.off('huddle_signal', handler);
    };
  }, [handleHuddleSignal]);

  useEffect(() => {
    if (!isHuddleActive || !localStreamRef.current) return;
    huddleParticipants.forEach(participant => {
      if (participant.id === user.id) return;
      const initiator = user.id < participant.id;
      ensurePeerConnection(participant.id, initiator);
    });
    peersRef.current.forEach((pc, peerId) => {
      if (!huddleParticipants.some(participant => participant.id === peerId)) {
        pc.close();
        peersRef.current.delete(peerId);
        remoteStreamsRef.current.delete(peerId);
        refreshRemoteStreams();
      }
    });
  }, [
    ensurePeerConnection,
    huddleParticipants,
    isHuddleActive,
    refreshRemoteStreams,
    user.id,
  ]);

  useEffect(() => {
    if (!isHuddleActive) return;
    const timeSinceJoin = Date.now() - huddleJoinTimeRef.current;
    if (timeSinceJoin < 2000) return;
    if (
      huddleParticipants &&
      huddleParticipants.length > 0 &&
      !huddleParticipants.some(participant => participant.id === user.id)
    ) {
      stopHuddle();
    }
  }, [huddleParticipants, isHuddleActive, stopHuddle, user.id]);

  useEffect(() => {
    fetchInitialMessages();
  }, [fetchInitialMessages]);

  useEffect(() => {
    initialScrollDoneRef.current = false;
    shouldAutoScrollRef.current = true;
  }, [activeChat]);

  useEffect(() => {
    if (messages.length === 0) return;
    const behavior = initialScrollDoneRef.current ? 'smooth' : 'auto';
    if (!shouldAutoScrollRef.current) {
      shouldAutoScrollRef.current = true;
      return;
    }
    scrollToBottom(behavior);
    initialScrollDoneRef.current = true;
  }, [messages, scrollToBottom]);

  useEffect(() => {
    existingMessagesRef.current = messages;
  }, [messages]);

  const messageValue = watch('message');

  useEffect(() => {
    const ws = WebSocketService.getInstance();
    if (!ws.isConnected()) return;
    if (!messageValue) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      ws.sendTypingStatus(false);
      return;
    }
    ws.sendTypingStatus(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      ws.sendTypingStatus(false);
      typingTimeoutRef.current = null;
    }, 2000);
  }, [messageValue]);

  useEffect(() => {
    const noteTimeout = noteUpdateTimeoutRef.current;
    const typingTimeout = typingTimeoutRef.current;
    return () => {
      const ws = WebSocketService.getInstance();
      if (ws.isConnected()) {
        ws.sendTypingStatus(false);
        ws.sendHuddleLeave();
      }
      if (noteTimeout) clearTimeout(noteTimeout);
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, []);

  useEffect(() => {
    if (
      editingMessage &&
      !messages.some(message => message.id === editingMessage.id)
    ) {
      cancelEditing();
    }
  }, [messages, editingMessage, cancelEditing]);

  const typingUsers = useMemo(() => {
    if (!activeRoom) return [];
    const typingIds = Object.keys(typingMap)
      .map(Number)
      .filter(id => typingMap[id] && id !== user.id);
    return activeRoom.participants.filter(p => typingIds.includes(p.id));
  }, [activeRoom, typingMap, user.id]);

  const huddleUsers = useMemo(() => {
    if (!activeRoom) return [];
    return huddleParticipants.map(hp => {
      const participant = activeRoom.participants.find(p => p.id === hp.id);
      return participant || { ...hp, avatar: '' };
    });
  }, [huddleParticipants, activeRoom]);

  const onSubmit = handleSubmit(({ message }) => {
    const trimmed = message.trim();
    if (!trimmed) return;
    const ws = WebSocketService.getInstance();
    if (editingMessage) {
      if (trimmed !== editingMessage.content.trim()) {
        ws.sendEditMessage(editingMessage.id, trimmed);
      }
      cancelEditing();
      shouldAutoScrollRef.current = true;
      return;
    }
    ws.sendMessage(trimmed);
    shouldAutoScrollRef.current = true;
    reset();
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);

    if (isNearBottom) {
      shouldAutoScrollRef.current = true;
    } else {
      shouldAutoScrollRef.current = false;
    }
  };

  return (
    <>
      <div
        className="fixed top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <audio ref={localAudioRef} autoPlay muted playsInline />
        {remoteStreams.map(({ userId, stream }) => (
          <HiddenHuddleAudio key={userId} stream={stream} />
        ))}
      </div>

      <div className="relative flex flex-col w-full h-full bg-background/30">
        {/* Floating Header */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-6 py-4 border-b shadow-sm bg-background/80 backdrop-blur-xl border-white/5">
          <div className="flex items-center flex-1 gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveChat(undefined)}
                className="w-8 h-8 -ml-2 rounded-full hover:bg-primary/10"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Avatar className="w-10 h-10 border-2 shadow-sm border-background ring-2 ring-primary/10">
              <AvatarImage
                src={activeRoom?.is_group_chat ? '' : otherParticipant.avatar}
                alt={activeRoom?.name || otherParticipant.name}
              />
              <AvatarFallback className="font-bold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                {(activeRoom?.is_group_chat
                  ? activeRoom.name
                  : otherParticipant.name
                )?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate text-foreground">
                {activeRoom?.name || otherParticipant.name}
              </p>
              <div className="flex items-center gap-2">
                {presence.filter(p => p.id !== user.id).length > 0 ? (
                  <>
                    <span className="relative flex w-2 h-2">
                      <span className="absolute inline-flex w-full h-full bg-green-400 rounded-full opacity-75 animate-ping"></span>
                      <span className="relative inline-flex w-2 h-2 bg-green-500 rounded-full"></span>
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {activeRoom?.is_group_chat
                        ? `${
                            presence.filter(p => p.id !== user.id).length
                          } active`
                        : 'Active now'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Offline</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Huddle Participants */}
            {huddleUsers.length > 0 && (
              <div className="flex items-center mr-3 -space-x-2">
                {huddleUsers.map(p => (
                  <Avatar
                    key={p.id}
                    className="w-8 h-8 border-2 border-background ring-2 ring-green-500/20"
                  >
                    <AvatarImage src={p.avatar} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {p.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}

            <Button
              variant={isHuddleActive ? 'destructive' : 'ghost'}
              size="icon"
              className={cn(
                'h-9 w-9 rounded-full transition-all',
                isHuddleActive &&
                  'animate-pulse shadow-lg shadow-destructive/20'
              )}
              onClick={isHuddleActive ? stopHuddle : startHuddle}
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9 hover:bg-primary/10 text-muted-foreground hover:text-primary"
            >
              <Video className="w-4 h-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem>View Profile</DropdownMenuItem>
                <DropdownMenuItem>Search in Chat</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  Block User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-0" onScrollCapture={handleScroll}>
          <div className="max-w-4xl px-4 pt-24 mx-auto space-y-6">
            {!initialLoading && nextCursor && (
              <div className="flex justify-center py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  ) : null}
                  Load older messages
                </Button>
              </div>
            )}

            {initialLoading ? (
              <div className="flex h-[40vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
              </div>
            ) : messages.length > 0 ? (
              messages.map((message, index) => {
                const isOwnMessage = message.sender.id === user.id;
                const prevMessage = messages[index - 1];
                const nextMessage = messages[index + 1];

                const isConsecutive =
                  prevMessage && prevMessage.sender.id === message.sender.id;
                const isLastInSequence =
                  !nextMessage || nextMessage.sender.id !== message.sender.id;

                // Find the most up-to-date sender profile from the room participants
                const senderProfile =
                  activeRoom?.participants.find(
                    p => p.id === message.sender.id
                  ) || (message.sender.id === user.id ? user : message.sender);

                return (
                  <div
                    key={message.id}
                    className={cn(isConsecutive && 'mt-[-18px]')}
                  >
                    <MessageBubble
                      message={message}
                      isSent={isOwnMessage}
                      isOwnMessage={isOwnMessage}
                      onEdit={
                        isOwnMessage ? () => startEditing(message) : undefined
                      }
                      onDelete={
                        isOwnMessage
                          ? () => handleDeleteMessage(message)
                          : undefined
                      }
                      isEditing={editingMessage?.id === message.id}
                      showAvatar={isLastInSequence}
                      isConsecutive={isConsecutive}
                      senderAvatar={senderProfile.avatar}
                      senderName={senderProfile.name}
                    />
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                <div className="flex items-center justify-center w-24 h-24 mb-6 shadow-inner rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20">
                  <Smile className="w-12 h-12 text-primary" />
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">
                  No messages yet
                </h3>
                <p className="max-w-xs mx-auto text-sm text-muted-foreground">
                  Be the first to break the ice! Start the conversation by
                  typing a message below.
                </p>
              </div>
            )}
            {/* Spacer to ensure last message is visible above the floating input */}
            <div className="h-32" />
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <Button
            size="icon"
            className="absolute z-30 w-10 h-10 duration-200 border rounded-full shadow-lg bottom-24 right-8 bg-background/80 backdrop-blur-md border-white/10 text-primary hover:bg-background animate-in fade-in zoom-in"
            onClick={() => scrollToBottom('smooth')}
          >
            <ChevronDown className="w-5 h-5" />
          </Button>
        )}

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="relative w-full max-w-4xl mx-auto">
            {/* Typing Indicator */}
            <div className="absolute left-0 flex items-center h-6 gap-2 -top-8">
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-md border border-white/5 text-[10px] font-medium text-muted-foreground shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex gap-0.5">
                    <span
                      className="w-1 h-1 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1 h-1 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1 h-1 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].name} is typing...`
                    : 'Several people are typing...'}
                </div>
              )}
            </div>

            <form
              onSubmit={onSubmit}
              className="relative flex items-end gap-2 p-2 rounded-[28px] border border-white/10 bg-background/80 backdrop-blur-2xl shadow-2xl transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/20"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="flex-shrink-0 w-10 h-10 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary"
              >
                <Paperclip className="w-5 h-5" />
              </Button>

              <Input
                {...register('message')}
                placeholder="Type a message..."
                className="flex-1 min-h-[44px] max-h-[120px] py-3 px-2 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 resize-none text-base"
                autoComplete="off"
              />

              <div className="flex items-center gap-1 pr-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                >
                  <Smile className="w-5 h-5" />
                </Button>
                <Button
                  type="submit"
                  size="icon"
                  className={cn(
                    'h-10 w-10 rounded-full shadow-md transition-all duration-300',
                    watch('message')?.trim()
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 hover:shadow-lg'
                      : 'bg-muted text-muted-foreground'
                  )}
                  disabled={!watch('message')?.trim()}
                >
                  {editingMessage ? (
                    <div className="text-[10px] font-bold uppercase">Save</div>
                  ) : (
                    <Send className="h-5 w-5 ml-0.5" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

function HiddenHuddleAudio({ stream }: { stream: MediaStream }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  return <audio ref={audioRef} autoPlay playsInline />;
}

function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const seen = new Set(current.map(m => m.id));
  const uniqueIncoming = incoming.filter(m => !seen.has(m.id));
  return [...uniqueIncoming, ...current].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
