import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useForm } from 'react-hook-form';
import {
  Users,
  Settings,
  ArrowLeft,
  Send,
  Loader2,
  Paperclip,
  Smile,
  Phone,
  Mic,
  Video,
  MoreVertical,
} from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Message,
  ChatRoom,
  useLazyGetMessagesPageQuery,
} from '@/services/chatApi';
import { WebSocketService, type HuddleSignalEvent } from '@/utils/websocket';
import { UserProfile } from '@/services/userApi';
import {
  prependMessages,
  setMessagePagination,
  setMessages,
  setCollaborativeNote,
} from '@/features/chatSlice';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import MessageBubble from './MessageBubble';
import { throttle } from '@/utils/performance';
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
const emptyCursors: Record<number, { start: number; end: number }> = {};
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
  const collaborativeNote = useAppSelector(
    state => state.chat.collaborativeNotes[activeChat] ?? ''
  );
  const cursors = useAppSelector(
    state => state.chat.cursors[activeChat] ?? emptyCursors
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
  const [initialLoading, setInitialLoading] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const initialScrollDoneRef = useRef(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noteUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [noteDraft, setNoteDraft] = useState(collaborativeNote);
  const [isHuddleActive, setIsHuddleActive] = useState(false);
  const huddleJoinTimeRef = useRef<number>(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<number, MediaStream>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<
    Array<{ userId: number; stream: MediaStream }>
  >([]);

  const scrollToBottom = useCallback(
    (behavior: 'auto' | 'instant' | 'smooth' = 'smooth') => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
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
    setInitialError(null);
    setLoadMoreError(null);
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
      setInitialError('Unable to load messages. Try again.');
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
    setLoadMoreError(null);
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
      setLoadMoreError("Couldn't load older messages. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [activeChat, dispatch, extractCursor, fetchMessagesPage, nextCursor]);

  const handleRetry = useCallback(() => {
    fetchInitialMessages();
  }, [fetchInitialMessages]);

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

  const throttledCursorUpdate = useMemo(
    () =>
      throttle((cursor: { start: number; end: number }) => {
        WebSocketService.getInstance().sendCursorUpdate(cursor);
      }, 200),
    []
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
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
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
    [refreshRemoteStreams]
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
  }, [ensurePeerConnection, huddleParticipants, isHuddleActive, refreshRemoteStreams, user.id]);

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
    return () => {
      const ws = WebSocketService.getInstance();
      if (ws.isConnected()) {
        ws.sendTypingStatus(false);
        ws.sendHuddleLeave();
      }
      if (noteUpdateTimeoutRef.current) clearTimeout(noteUpdateTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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
    const typingIds = Object.keys(typingMap).map(Number).filter(id => typingMap[id] && id !== user.id);
    return activeRoom.participants.filter(p => typingIds.includes(p.id));
  }, [activeRoom, typingMap, user.id]);

  const huddleUsers = useMemo(() => {
    if (!activeRoom) return [];
    return huddleParticipants.map(hp => {
      const participant = activeRoom.participants.find(p => p.id === hp.id);
      return participant || { ...hp, avatar: '' }; // Fallback if not found in room
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

  return (
    <>
      <div className="fixed top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <audio ref={localAudioRef} autoPlay muted playsInline />
        {remoteStreams.map(({ userId, stream }) => (
          <HiddenHuddleAudio key={userId} stream={stream} />
        ))}
      </div>

      <div className="flex flex-col h-full w-full relative">
        {/* Floating Header */}
        <header className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-white/10 bg-background/60 backdrop-blur-xl shadow-lg">
          <div className="flex items-center flex-1 gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActiveChat(undefined)}
                className="h-8 w-8 rounded-full hover:bg-primary/10"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarImage
                src={activeRoom?.is_group_chat ? '' : otherParticipant.avatar}
                alt={activeRoom?.name || otherParticipant.name}
              />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold">
                {(activeRoom?.is_group_chat ? activeRoom.name : otherParticipant.name)?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate text-foreground">
                {activeRoom?.name || otherParticipant.name}
              </p>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <p className="text-xs text-muted-foreground">
                  {presence.length > 0 
                    ? `${presence.length} active` 
                    : 'Active now'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Huddle Participants */}
            {huddleUsers.length > 0 && (
              <div className="flex items-center -space-x-2 mr-2">
                {huddleUsers.map((p) => (
                  <Avatar key={p.id} className="h-8 w-8 border-2 border-background ring-2 ring-green-500/20">
                    <AvatarImage src={p.avatar} />
                    <AvatarFallback className="text-[10px] bg-muted">{p.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
            )}

            <Button
              variant={isHuddleActive ? "destructive" : "ghost"}
              size="icon"
              className={cn("h-9 w-9 rounded-full transition-all", isHuddleActive && "animate-pulse")}
              onClick={isHuddleActive ? stopHuddle : startHuddle}
            >
              {isHuddleActive ? <Phone className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10">
              <Video className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/10">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem>View Profile</DropdownMenuItem>
                <DropdownMenuItem>Search in Chat</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Block User</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Messages Area */}
        <ScrollArea className="flex-1 px-4 pt-24 pb-24">
          <div className="space-y-6 max-w-3xl mx-auto">
            {!initialLoading && nextCursor && (
              <div className="flex justify-center py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
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
                const isConsecutive = prevMessage && prevMessage.sender.id === message.sender.id;
                
                return (
                  <div key={message.id} className={cn(isConsecutive && "mt-[-16px]")}>
                    <MessageBubble
                      message={message}
                      isSent={isOwnMessage}
                      isOwnMessage={isOwnMessage}
                      onEdit={isOwnMessage ? () => startEditing(message) : undefined}
                      onDelete={isOwnMessage ? () => handleDeleteMessage(message) : undefined}
                      isEditing={editingMessage?.id === message.id}
                    />
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Smile className="h-10 w-10 text-primary" />
                </div>
                <p className="text-lg font-medium">No messages yet</p>
                <p className="text-sm text-muted-foreground">Start the conversation!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Floating Input Area */}
        <div className="absolute bottom-4 left-4 right-4 z-20 max-w-3xl mx-auto w-full">
          <form
            onSubmit={onSubmit}
            className="relative flex items-end gap-2 p-2 rounded-[24px] border border-white/10 bg-background/80 backdrop-blur-xl shadow-2xl transition-all focus-within:ring-2 focus-within:ring-primary/20"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary flex-shrink-0"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            
            <Input
              {...register('message')}
              placeholder="Type a message..."
              className="flex-1 min-h-[40px] max-h-[120px] py-2.5 px-0 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 resize-none"
              autoComplete="off"
            />

            <div className="flex items-center gap-1 pr-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary"
              >
                <Smile className="h-5 w-5" />
              </Button>
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:bg-primary/90 transition-all"
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
          
          {/* Typing Indicator */}
          <div className="absolute -top-8 left-4 h-6 flex items-center gap-2">
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-background/60 backdrop-blur-md border border-white/5 text-[10px] font-medium text-muted-foreground shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                {typingUsers.length === 1
                  ? `${typingUsers[0].name} is typing...`
                  : typingUsers.length === 2
                  ? `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`
                  : "Several people are typing..."}
              </div>
            )}
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
