import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

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
  addMessage,
} from '@/features/chatSlice';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import ChatHeader from './chat-page/ChatHeader';
import ChatInput from './chat-page/ChatInput';
import MessageList from './chat-page/MessageList';
import { DeleteMessageDialog } from './chat-page/DeleteMessageDialog';

interface ChatWindowProps {
  user: UserProfile;
  activeChat: number;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
  activeRoom: ChatRoom | undefined;
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
  activeRoom,
}: ChatWindowProps) {
  const dispatch = useAppDispatch();
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
  const [connectionDetails, setConnectionDetails] = useState<
    Record<number, any>
  >({});
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);

  const scrollToBottom = useCallback(() => {
    // Handled by Virtuoso or passed down if needed
    // For now, we can rely on Virtuoso's followOutput
  }, []);

  const otherParticipant = (activeRoom?.participants.find(
    participant => participant.id !== user.id
  ) || user) as UserProfile;

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
  }, [activeChat, dispatch, extractCursor, fetchMessagesPage]);

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

  const handleDeleteMessage = useCallback((message: Message) => {
    setMessageToDelete(message);
  }, []);

  const confirmDeleteMessage = useCallback(() => {
    if (!messageToDelete) return;
    const ws = WebSocketService.getInstance();
    ws.sendDeleteMessage(messageToDelete.id);
    if (editingMessage?.id === messageToDelete.id) {
      cancelEditing();
    }
    setMessageToDelete(null);
  }, [messageToDelete, editingMessage, cancelEditing]);

  const refreshRemoteStreams = useCallback(() => {
    setRemoteStreams(
      Array.from(remoteStreamsRef.current.entries()).map(
        ([userId, stream]) => ({ userId, stream })
      )
    );
  }, []);

  const checkConnectionStats = useCallback(
    async (pc: RTCPeerConnection, peerId: number) => {
      try {
        const stats = await pc.getStats();
        let activePair: any = null;
        const candidatePairs: any[] = [];

        stats.forEach(report => {
          if (report.type === 'transport' && report.selectedCandidatePairId) {
            activePair = stats.get(report.selectedCandidatePairId);
          }
          if (report.type === 'candidate-pair') {
            const local = stats.get(report.localCandidateId);
            const remote = stats.get(report.remoteCandidateId);
            candidatePairs.push({
              id: report.id,
              state: report.state,
              selected: report.selected,
              local: local
                ? {
                    type: local.candidateType,
                    protocol: local.protocol,
                    address: `${local.address || local.ip}:${local.port}`,
                    url: local.url,
                  }
                : null,
              remote: remote
                ? {
                    type: remote.candidateType,
                    protocol: remote.protocol,
                    address: `${remote.address || remote.ip}:${remote.port}`,
                    type_preference: remote.priority,
                  }
                : null,
            });
          }
        });

        if (!activePair) {
          stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.selected) {
              activePair = report;
            }
          });
        }

        if (activePair) {
          const localCandidate = stats.get(activePair.localCandidateId);
          const remoteCandidate = stats.get(activePair.remoteCandidateId);
          let type = 'Unknown';

          const localType = localCandidate?.candidateType;
          const remoteType = remoteCandidate?.candidateType;

          if (localType === 'relay' || remoteType === 'relay') {
            type = 'Twilio TURN';
          } else if (localType === 'host' && remoteType === 'host') {
            type = 'Direct (LAN)';
          } else if (
            localType === 'srflx' ||
            remoteType === 'srflx' ||
            localType === 'prflx' ||
            remoteType === 'prflx'
          ) {
            if (localCandidate?.url) {
              if (localCandidate.url.includes('google')) type = 'Google STUN';
              else if (localCandidate.url.includes('twilio'))
                type = 'Twilio STUN';
              else type = 'STUN';
            } else {
              // We are likely 'host' or 'prflx' without a URL, but remote is public/reflexive
              type = 'NAT Traversal (P2P)';
            }
          } else {
            type = `${localType} ↔ ${remoteType}`;
          }

          setConnectionDetails(prev => ({
            ...prev,
            [peerId]: {
              type,
              activePair: {
                local: localCandidate,
                remote: remoteCandidate,
              },
              candidatePairs,
            },
          }));
        }
      } catch (e) {
        console.error('Error checking stats:', e);
      }
    },
    []
  );

  // Poll for stats updates to handle race conditions and state changes
  useEffect(() => {
    if (!isHuddleActive) return;
    const interval = setInterval(() => {
      peersRef.current.forEach((pc, peerId) => {
        if (pc.connectionState === 'connected') {
          checkConnectionStats(pc, peerId);
        }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isHuddleActive, checkConnectionStats]);

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
        if (pc.connectionState === 'connected') {
          checkConnectionStats(pc, peerId);
        }
        if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          pc.close();
          peersRef.current.delete(peerId);
          remoteStreamsRef.current.delete(peerId);
          refreshRemoteStreams();
          setConnectionDetails(prev => {
            const next = { ...prev };
            delete next[peerId];
            return next;
          });
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
    [iceServers, refreshRemoteStreams, checkConnectionStats]
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
    // Virtuoso handles scroll
    initialScrollDoneRef.current = true;
  }, [messages]);

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

    // Optimistic update
    const tempId = -Date.now();
    const optimisticMessage: Message = {
      id: tempId,
      chat_room: activeChat,
      sender: user,
      content: trimmed,
      timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    dispatch(
      addMessage({ chatRoomId: activeChat, message: optimisticMessage })
    );
    shouldAutoScrollRef.current = true;

    ws.sendMessage(trimmed);
    shouldAutoScrollRef.current = true;
    reset();
  });

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
        <ChatHeader
          activeRoom={activeRoom}
          otherParticipant={otherParticipant}
          presence={presence as any}
          user={user}
          isMobile={isMobile}
          setActiveChat={setActiveChat}
          huddleUsers={huddleUsers as any}
          isHuddleActive={isHuddleActive}
          startHuddle={startHuddle}
          stopHuddle={stopHuddle}
          connectionDetails={connectionDetails}
        />

        <div className="flex-1 pt-24 pb-20 overflow-hidden">
          <MessageList
            messages={messages}
            user={user}
            activeRoom={activeRoom}
            startEditing={startEditing}
            handleDeleteMessage={handleDeleteMessage}
            handleLoadMore={handleLoadMore}
            loadingMore={loadingMore}
            initialLoading={initialLoading}
            editingMessageId={editingMessage?.id}
            scrollToBottom={scrollToBottom}
          />
        </div>

        <ChatInput
          register={register}
          onSubmit={onSubmit}
          watch={watch}
          editingMessage={editingMessage}
          typingUsers={typingUsers as any}
        />

        <DeleteMessageDialog
          isOpen={!!messageToDelete}
          onClose={() => setMessageToDelete(null)}
          onConfirm={confirmDeleteMessage}
          isMobile={isMobile}
        />
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
