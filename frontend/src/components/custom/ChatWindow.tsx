import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Users,
  Settings,
  ArrowLeft,
  Send,
  Loader2,
  Paperclip,
  Smile,
} from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import {
  Message,
  ChatRoom,
  User,
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

interface ChatWindowProps {
  user: UserProfile;
  activeChat: number;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
  chatRooms: ChatRoom[] | undefined;
}

const emptyMessages: Message[] = [];

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
  const presence = useAppSelector(state => state.chat.presence[activeChat] ?? []);
  const typingMap = useAppSelector(state => state.chat.typingStatuses[activeChat] ?? {});
  const collaborativeNote = useAppSelector(state => state.chat.collaborativeNotes[activeChat] ?? "");
  const cursors = useAppSelector(state => state.chat.cursors[activeChat] ?? {});
  const huddleParticipants = useAppSelector(state => state.chat.huddleParticipants[activeChat] ?? []);
  const existingMessagesRef = useRef(messages);
  const nextCursor = useAppSelector(
    state => state.chat.pagination[activeChat]?.nextCursor ?? null
  );
  const { register, handleSubmit, reset, setValue, watch } = useForm<{ message: string }>();
  const [fetchMessagesPage] = useLazyGetMessagesPageQuery();
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
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
  const huddleJoinTimeRef = useRef<number>(0); // Track when we last joined
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const remoteStreamsRef = useRef<Map<number, MediaStream>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<Array<{ userId: number; stream: MediaStream }>>([]);
  const typingNames = useMemo(
    () => presence.filter(u => typingMap[u.id] && u.id !== user.id).map(u => u.name),
    [presence, typingMap, user.id],
  );
  const noteWatchers = useMemo(() => {
    return Object.keys(cursors)
      .map(id => presence.find(userEntry => userEntry.id === Number(id)))
      .filter(Boolean)
      .filter(entry => entry!.id !== user.id) as Array<{ id: number; name: string; avatar?: string | null }>;
  }, [cursors, presence, user.id]);

  const scrollToBottom = useCallback(
    (behavior: "auto" | "instant" | "smooth" = "smooth") => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
      }
    },
    []
  );

  const activeRoom = chatRooms?.find(chat => chat.id === activeChat);
  const otherParticipant =
    activeRoom?.participants.find(participant => participant.id !== user.id) ||
    user;

  const extractCursor = useCallback((url: string | null) => {
    if (!url) {
      return null;
    }
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('cursor');
    } catch {
      return null;
    }
  }, []);

  const fetchInitialMessages = useCallback(async () => {
    if (!activeChat) {
      return;
    }
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
        }),
      );
      shouldAutoScrollRef.current = true;
      requestAnimationFrame(() => scrollToBottom("auto"));
      initialScrollDoneRef.current = true;
    } catch (error) {
      console.error('Failed to load messages', error);
      setInitialError('Unable to load messages. Try again.');
      dispatch(setMessages({ chatRoomId: activeChat, messages: [] }));
      dispatch(
        setMessagePagination({ chatRoomId: activeChat, nextCursor: null }),
      );
    } finally {
      setInitialLoading(false);
    }
  }, [activeChat, dispatch, extractCursor, fetchMessagesPage, scrollToBottom]);

  const handleLoadMore = useCallback(async () => {
    if (!activeChat || !nextCursor) {
      return;
    }
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
        }),
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
    [setValue],
  );

  const handleDeleteMessage = useCallback(
    (message: Message) => {
      const confirmed = window.confirm('Delete this message? This action cannot be undone.');
      if (!confirmed) return;
      const ws = WebSocketService.getInstance();
      ws.sendDeleteMessage(message.id);
      if (editingMessage?.id === message.id) {
        cancelEditing();
      }
    },
    [cancelEditing, editingMessage],
  );

  const handleNoteChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      setNoteDraft(value);
      dispatch(setCollaborativeNote({ chatRoomId: activeChat, content: value }));
      const ws = WebSocketService.getInstance();
      if (noteUpdateTimeoutRef.current) {
        clearTimeout(noteUpdateTimeoutRef.current);
      }
      noteUpdateTimeoutRef.current = setTimeout(() => {
        ws.sendCollaborativeNote(value);
      }, 350);
      ws.sendCursorUpdate({ start: event.target.selectionStart, end: event.target.selectionEnd });
    },
    [activeChat, dispatch],
  );

  const handleNoteCursor = useCallback((event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = event.target as HTMLTextAreaElement;
    const cursor = {
      start: target.selectionStart,
      end: target.selectionEnd,
    };
    WebSocketService.getInstance().sendCursorUpdate(cursor);
  }, []);

  const refreshRemoteStreams = useCallback(() => {
    setRemoteStreams(Array.from(remoteStreamsRef.current.entries()).map(([userId, stream]) => ({ userId, stream })));
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
        localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current!));
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
    [refreshRemoteStreams],
  );

  const startHuddle = useCallback(async () => {
    if (isHuddleActive) return;
    console.log('🎙️ Starting huddle...');
    try {
      console.log('🎙️ Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('🎙️ Microphone access granted');
      localStreamRef.current = stream;
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
      }
      setIsHuddleActive(true);
      huddleJoinTimeRef.current = Date.now(); // Mark join time to avoid race condition
      console.log('🎙️ Sending huddle join to WebSocket');
      WebSocketService.getInstance().sendHuddleJoin();
    } catch (error) {
      console.error('❌ Failed to start huddle:', error);
      alert(`Failed to start huddle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isHuddleActive]);

  const stopHuddle = useCallback(() => {
    console.log('🛑 stopHuddle called, isHuddleActive:', isHuddleActive);
    if (isHuddleActive) {
      console.log('🛑 Sending huddle_leave to server');
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
        WebSocketService.getInstance().sendHuddleSignal(from.id, { type: 'answer', sdp: answer });
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
    [ensurePeerConnection, isHuddleActive, user.id],
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
    if (!isHuddleActive || !localStreamRef.current) {
      console.log('🎙️ Skipping peer connection setup:', { isHuddleActive, hasLocalStream: !!localStreamRef.current });
      return;
    }
    console.log('🎙️ Setting up peer connections for participants:', huddleParticipants);
    huddleParticipants.forEach(participant => {
      if (participant.id === user.id) return;
      const initiator = user.id < participant.id;
      console.log(`🎙️ Creating peer connection with user ${participant.id}, initiator:`, initiator);
      ensurePeerConnection(participant.id, initiator);
    });
    peersRef.current.forEach((pc, peerId) => {
      if (!huddleParticipants.some(participant => participant.id === peerId)) {
        console.log(`🎙️ Closing peer connection with user ${peerId} (left huddle)`);
        pc.close();
        peersRef.current.delete(peerId);
        remoteStreamsRef.current.delete(peerId);
        refreshRemoteStreams();
      }
    });
  }, [ensurePeerConnection, huddleParticipants, isHuddleActive, refreshRemoteStreams, user.id]);

  useEffect(() => {
    if (!isHuddleActive) {
      return;
    }

    // Grace period: skip check for 2 seconds after joining to avoid race condition
    const timeSinceJoin = Date.now() - huddleJoinTimeRef.current;
    if (timeSinceJoin < 2000) {
      console.log(`🎙️ Skipping participant check (${timeSinceJoin}ms since join, waiting for server update)`);
      return;
    }

    // Check if current user was removed from huddle by someone else
    if (huddleParticipants && huddleParticipants.length > 0 && !huddleParticipants.some(participant => participant.id === user.id)) {
      console.log('🎙️ User removed from huddle, stopping...');
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
    if (messages.length === 0) {
      return;
    }
    const behavior = initialScrollDoneRef.current ? "smooth" : "auto";
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

  useEffect(() => {
    if (collaborativeNote !== noteDraft) {
      setNoteDraft(collaborativeNote);
    }
  }, [collaborativeNote, noteDraft]);

  const messageValue = watch('message');

  useEffect(() => {
    const ws = WebSocketService.getInstance();
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
    }, 1500);
  }, [messageValue]);

  useEffect(() => {
    console.log('🔄 ChatWindow mounted');
    // Cleanup only on component unmount
    return () => {
      console.log('🧹 ChatWindow cleanup - component unmounting');
      const ws = WebSocketService.getInstance();
      ws.sendTypingStatus(false);
      if (noteUpdateTimeoutRef.current) {
        clearTimeout(noteUpdateTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Leave huddle on unmount if active
      console.log('🧹 Sending final huddle_leave on unmount');
      ws.sendHuddleLeave();
    };
  }, []); // Empty deps - only run on mount/unmount

  useEffect(() => {
    if (editingMessage && !messages.some(message => message.id === editingMessage.id)) {
      cancelEditing();
    }
  }, [messages, editingMessage, cancelEditing]);

  const onSubmit = handleSubmit(({ message }) => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }
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
    <div className="flex max-h-[calc(100dvh)] flex-1 flex-col overflow-hidden   bg-background">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 sm:px-6">
        <div className="flex items-center flex-1 gap-3">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveChat(undefined)}
              aria-label="Back to conversations"
              className="border rounded-full border-border"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Avatar className="border h-11 w-11 border-border bg-muted/60">
            <AvatarImage
              src={activeRoom?.is_group_chat ? '' : otherParticipant.avatar}
              alt={activeRoom?.name || otherParticipant.name}
            />
            <AvatarFallback className="text-sm font-semibold text-primary">
              {(activeRoom?.is_group_chat
                ? activeRoom.name
                : otherParticipant.name
              )?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-foreground sm:text-base">
              {activeRoom?.name || otherParticipant.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeRoom?.participants.length ?? 0} participant
              {activeRoom && activeRoom.participants.length !== 1 ? 's' : ''}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              {presence.length > 0 ? (
                presence.map(person => (
                  <span key={person.id} className="flex items-center gap-1 px-2 py-1 border rounded-full border-border/80 bg-muted/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {person.name}
                  </span>
                ))
              ) : (
                <span>No other participants</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            label="View participants"
            onClick={() => setIsParticipantsModalOpen(true)}
          >
            <Users className="w-4 h-4" />
          </IconButton>
          <IconButton label="Channel settings">
            <Settings className="w-4 h-4" />
          </IconButton>
        </div>
      </header>

  <ScrollArea className="flex-1 px-4 py-4 sm:px-6">
    <div className="space-y-4">
      {!initialLoading && nextCursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium rounded-full border-border"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load previous messages'}
          </Button>
        </div>
      )}

      {loadMoreError && (
        <div className="text-xs text-center text-destructive">
          {loadMoreError}{' '}
          <button
            type="button"
            className="font-semibold underline hover:no-underline"
            onClick={handleLoadMore}
          >
            Retry
          </button>
        </div>
      )}

      {initialLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : initialError ? (
        <Card className="text-red-700 border border-red-200 bg-red-100/80 dark:border-red-400/40 dark:bg-red-900/40 dark:text-red-100">
          <CardContent className="p-6 space-y-3 text-sm font-medium text-center">
            <p>{initialError}</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : messages.length > 0 ? (
        messages.map(message => {
          const isOwnMessage = message.sender.id === user.id;
          return (
          <MessageBubble
            key={message.id}
            message={message}
            isSent={isOwnMessage}
            isOwnMessage={isOwnMessage}
            onEdit={isOwnMessage ? () => startEditing(message) : undefined}
            onDelete={isOwnMessage ? () => handleDeleteMessage(message) : undefined}
            isEditing={editingMessage?.id === message.id}
          />
          );
        })
      ) : (
        <Card className="border border-dashed border-border bg-muted/40">
          <CardContent className="p-8 space-y-2 text-center">
            <p className="text-base font-semibold text-foreground">
              Say hello
            </p>
            <p className="text-sm text-muted-foreground">
              No messages yet. Drop the first update to kick off the
              conversation.
            </p>
          </CardContent>
        </Card>
      )}
      <div ref={messagesEndRef} />
    </div>
  </ScrollArea>

      <Card className="mx-3 mb-3 border border-border bg-background sm:mx-6">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Shared scratchpad</h3>
            {noteWatchers.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Viewing: {noteWatchers.map(watcher => watcher.name).join(', ')}
              </span>
            )}
          </div>
          <textarea
            value={noteDraft}
            onChange={handleNoteChange}
            onSelect={handleNoteCursor}
            onKeyUp={handleNoteCursor}
            onClick={handleNoteCursor}
            placeholder="Jot quick todos, links, or huddle notes..."
            className="w-full h-32 px-3 py-2 text-sm border shadow-inner resize-none rounded-xl border-border bg-muted/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </CardContent>
      </Card>

      <Card className="mx-3 mb-4 border border-border bg-background sm:mx-6">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Huddle</h3>
            <Button variant={isHuddleActive ? 'destructive' : 'default'} size="sm" onClick={isHuddleActive ? stopHuddle : startHuddle}>
              {isHuddleActive ? 'Leave Huddle' : 'Start Huddle'}
            </Button>
          </div>
          <audio ref={localAudioRef} autoPlay muted className="hidden" />
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {huddleParticipants.length > 0 ? (
              huddleParticipants.map(participant => (
                <span key={participant.id} className="px-2 py-1 border rounded-full border-border">
                  {participant.name}
                </span>
              ))
            ) : (
              <span>No active huddle participants</span>
            )}
          </div>
          {remoteStreams.length > 0 ? (
            <div className="space-y-2">
              {remoteStreams.map(({ userId, stream }) => {
                const participant = huddleParticipants.find(item => item.id === userId);
                return <HuddleAudio key={userId} stream={stream} label={participant?.name ?? `Participant ${userId}`} />;
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Start a huddle to jump into a quick voice chat.</p>
          )}
        </CardContent>
      </Card>

      {typingNames.length > 0 && (
        <p className="px-3 pb-2 text-xs text-muted-foreground sm:px-6">
          {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
        </p>
      )}

      <form
        onSubmit={onSubmit}
        className="px-3 py-3 border-t border-border/60 bg-background sm:px-6"
      >
        {editingMessage && (
          <div className="flex items-center justify-between px-3 py-2 mb-2 text-xs rounded-xl bg-secondary/80 text-secondary-foreground">
            <span className="font-medium">Editing message</span>
            <Button variant="ghost" size="sm" onClick={cancelEditing}>
              Cancel
            </Button>
          </div>
        )}
        <div className="flex flex-col gap-2 px-3 py-2 border rounded-2xl border-border/80 bg-muted/40 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <ComposerIcon
              type="button"
              icon={<Paperclip className="w-4 h-4" />}
              label="Attach file"
            />
            <ComposerIcon
              type="button"
              icon={<Smile className="w-4 h-4" />}
              label="Insert emoji"
            />
          </div>
          <div className="flex items-center flex-1 gap-2 sm:gap-3">
            <Input
              {...register('message')}
              placeholder="Write a message..."
              autoComplete="off"
              className="flex-1 h-10 px-0 text-sm bg-transparent border-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full h-9 w-9 sm:h-10 sm:w-10"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </form>

      <ParticipantsModal
        isOpen={isParticipantsModalOpen}
        onClose={() => setIsParticipantsModalOpen(false)}
        participants={activeRoom?.participants || []}
      />
    </div>
  );
}

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: User[];
}

function ParticipantsModal({
  isOpen,
  onClose,
  participants,
}: ParticipantsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border shadow-lg border-border bg-background/95">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Participants
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          {participants.map(participant => (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-3 text-sm border rounded-xl border-border/80 bg-muted/30"
            >
              <Avatar className="w-10 h-10 border border-border bg-background">
                <AvatarImage src={participant.avatar} alt={participant.name} />
                <AvatarFallback className="text-sm font-semibold text-primary">
                  {participant.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{participant.name}</p>
                <p className="text-xs text-muted-foreground">
                  {participant.email}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="text-xs font-medium border rounded-full border-border bg-background text-muted-foreground"
              >
                Member
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HuddleAudio({ stream, label }: { stream: MediaStream; label: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="flex items-center justify-between px-3 py-2 border rounded-lg border-border/80 bg-muted/30">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <audio ref={audioRef} autoPlay playsInline />
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="border rounded-full h-9 w-9 border-border text-muted-foreground hover:text-primary"
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

function ComposerIcon({
  type,
  icon,
  label,
}: {
  type: 'button' | 'submit';
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className="flex items-center justify-center border rounded-full h-9 w-9 border-border bg-background text-muted-foreground hover:text-primary"
    >
      {icon}
    </button>
  );
}

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  if (!incoming.length) {
    return existing;
  }
  const byId = new Map<number, Message>();
  for (const message of existing) {
    byId.set(message.id, message);
  }
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}
