import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  Message,
  ChatRoom,
  useLazyGetMessagesPageQuery,
  useSendMessageMutation,
  useGetUploadUrlMutation,
} from '@/services/chatApi';
import { WebSocketService } from '@/utils/websocket';
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
import { useHuddle } from '@/contexts/HuddleContext';

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
  const [sendMessageMutation] = useSendMessageMutation();
  const [getUploadUrl] = useGetUploadUrlMutation();
  const [fetchMessagesPage] = useLazyGetMessagesPageQuery();

  const {
    isHuddleActive,
    huddleChatId,
    startHuddle,
    stopHuddle,
    connectionDetails,
  } = useHuddle();

  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const initialScrollDoneRef = useRef(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noteUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
        // Removed ws.sendHuddleLeave() to persist huddle
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

  const handleSendMessage = async (message: string, file?: File) => {
    const trimmed = message.trim();
    if (!trimmed && !file) return;
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
    const clientId = crypto.randomUUID(); // Generate a unique client ID
    let optimisticAttachmentUrl: string | undefined;
    let optimisticAttachmentType: 'image' | 'file' | undefined;

    if (file) {
      optimisticAttachmentUrl = URL.createObjectURL(file);
      optimisticAttachmentType = file.type.startsWith('image/')
        ? 'image'
        : 'file';
    }

    const optimisticMessage: Message = {
      id: tempId,
      chat_room: activeChat,
      sender: user,
      content: trimmed || (file ? 'Sent an attachment' : ''),
      timestamp: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachment: optimisticAttachmentUrl,
      attachment_type: optimisticAttachmentType,
      client_id: clientId,
    };

    dispatch(
      addMessage({ chatRoomId: activeChat, message: optimisticMessage })
    );
    shouldAutoScrollRef.current = true;

    if (file) {
      try {
        // 1. Try to get a signed URL
        const { url, key } = await getUploadUrl({
          filename: file.name,
          content_type: file.type,
        }).unwrap();

        // 2. Upload to GCS directly
        await fetch(url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        // 3. Send message with attachment key
        const formData = new FormData();
        formData.append('chat_room', activeChat.toString());
        formData.append('content', trimmed || 'Sent an attachment');
        formData.append('attachment_key', key);
        formData.append('client_id', clientId);

        await sendMessageMutation(formData).unwrap();
      } catch (error: any) {
        // Fallback to direct upload if Signed URL fails (e.g. local dev or 501)
        if (error?.status === 400 || error?.status === 501) {
          const formData = new FormData();
          formData.append('chat_room', activeChat.toString());
          formData.append('content', trimmed || 'Sent an attachment');
          formData.append('client_id', clientId);
          // Ensure filename is passed explicitly to FormData
          if (file.name) {
            formData.append('attachment', file, file.name);
          } else {
            formData.append('attachment', file);
          }

          try {
            await sendMessageMutation(formData).unwrap();
          } catch (fallbackError) {
            console.error(
              'Failed to send message with attachment (fallback)',
              fallbackError
            );
          }
        } else {
          console.error('Failed to upload file or get signed URL', error);
        }
      }
    } else {
      // Send text message with client_id
      const formData = new FormData();
      formData.append('chat_room', activeChat.toString());
      formData.append('content', trimmed);
      formData.append('client_id', clientId);

      // We use FormData here to be consistent, or we can update the mutation to accept object with client_id
      // Since sendMessageMutation accepts Partial<Message> | FormData, let's use object for text
      await sendMessageMutation({
        chat_room: activeChat,
        content: trimmed,
        client_id: clientId,
      }).unwrap();
    }

    shouldAutoScrollRef.current = true;
    reset();
  };

  const isHuddleActiveInThisChat =
    isHuddleActive && huddleChatId === activeChat;

  return (
    <>
      <div className="relative flex flex-col w-full h-full bg-background/30">
        <ChatHeader
          activeRoom={activeRoom}
          otherParticipant={otherParticipant}
          presence={presence as any}
          user={user}
          isMobile={isMobile}
          setActiveChat={setActiveChat}
          huddleUsers={huddleUsers as any}
          isHuddleActive={isHuddleActiveInThisChat}
          startHuddle={() => startHuddle(activeChat)}
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
          onSubmit={handleSubmit(() => {})}
          watch={watch}
          setValue={setValue}
          editingMessage={editingMessage}
          typingUsers={typingUsers as any}
          onSendMessage={handleSendMessage}
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

function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const seen = new Set(current.map(m => m.id));
  const uniqueIncoming = incoming.filter(m => !seen.has(m.id));
  return [...uniqueIncoming, ...current].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}
