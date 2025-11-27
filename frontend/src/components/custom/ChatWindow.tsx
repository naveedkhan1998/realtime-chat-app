import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import {
  Message,
  ChatRoom,
  useLazyGetMessagesPageQuery,
  useSendMessageMutation,
  useGetUploadUrlMutation,
} from '@/services/chatApi';
import { useRoomActions, useGlobalState } from '@/hooks/useUnifiedWebSocket';
import { UserProfile } from '@/services/userApi';
import {
  prependMessages,
  setMessagePagination,
  setMessages,
  addMessage,
  selectRoomMessages,
  selectRoomPresence,
  selectRoomTypingUsers,
  selectRoomHuddleParticipants,
  selectRoomPagination,
  selectGlobalOnlineUsers,
} from '@/features/unifiedChatSlice';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import type { RootState } from '@/app/store';
import ChatHeader from './chat-page/ChatHeader';
import ChatInput from './chat-page/ChatInput';
import MessageList from './chat-page/MessageList';
import { DeleteMessageDialog } from './chat-page/DeleteMessageDialog';
import ChatInfoPanel from './chat-page/ChatInfoPanel';
import { useHuddle } from '@/contexts/HuddleContext';

interface ChatWindowProps {
  user: UserProfile;
  activeChat: number;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
  activeRoom: ChatRoom | undefined;
}

export default function ChatWindow({
  user,
  activeChat,
  setActiveChat,
  isMobile,
  activeRoom,
}: ChatWindowProps) {
  const dispatch = useAppDispatch();
  const shouldAutoScrollRef = useRef(true);

  // Use unified WebSocket hooks for room actions
  const { deleteMessage, editMessage, sendTyping } = useRoomActions(activeChat);
  const { isConnected } = useGlobalState();

  // Selectors - direct usage, messages fetched fresh on chat change
  const messages = useAppSelector((state: RootState) =>
    selectRoomMessages(state, activeChat)
  );
  const presence = useAppSelector(
    (state: RootState) => selectRoomPresence(state, activeChat)?.users ?? []
  );
  const typingMap = useAppSelector((state: RootState) =>
    selectRoomTypingUsers(state, activeChat)
  );
  const huddleParticipants = useAppSelector((state: RootState) =>
    selectRoomHuddleParticipants(state, activeChat)
  );
  const pagination = useAppSelector((state: RootState) =>
    selectRoomPagination(state, activeChat)
  );
  const globalOnlineUsers = useAppSelector(selectGlobalOnlineUsers);
  const nextCursor = pagination.nextCursor;

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

  // Simple loading state
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const activeChatRef = useRef(activeChat);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noteUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);

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

  // Fetch messages when activeChat changes - always fetch fresh
  useEffect(() => {
    activeChatRef.current = activeChat;
    if (!activeChat) return;

    // Clear previous messages and start loading immediately
    dispatch(setMessages({ roomId: activeChat, messages: [] }));
    setInitialLoading(true);
    shouldAutoScrollRef.current = true;

    const chatIdToFetch = activeChat;

    fetchMessagesPage({
      chat_room_id: chatIdToFetch,
      limit: 30,
    })
      .unwrap()
      .then(response => {
        // Only update if still the active chat
        if (chatIdToFetch !== activeChatRef.current) return;

        const ordered = [...response.results].reverse();
        dispatch(setMessages({ roomId: chatIdToFetch, messages: ordered }));
        dispatch(
          setMessagePagination({
            roomId: chatIdToFetch,
            nextCursor: extractCursor(response.next),
          })
        );
        shouldAutoScrollRef.current = true;
        setInitialLoading(false);
      })
      .catch(error => {
        if (chatIdToFetch !== activeChatRef.current) return;

        console.error('Failed to load messages', error);
        dispatch(setMessages({ roomId: chatIdToFetch, messages: [] }));
        dispatch(
          setMessagePagination({ roomId: chatIdToFetch, nextCursor: null })
        );
        setInitialLoading(false);
      });
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
      dispatch(prependMessages({ roomId: activeChat, messages: ordered }));
      dispatch(
        setMessagePagination({
          roomId: activeChat,
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
    deleteMessage(messageToDelete.id);
    if (editingMessage?.id === messageToDelete.id) {
      cancelEditing();
    }
    setMessageToDelete(null);
  }, [messageToDelete, editingMessage, cancelEditing, deleteMessage]);

  const messageValue = watch('message');

  useEffect(() => {
    if (!isConnected) return;
    if (!messageValue) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      sendTyping(false);
      return;
    }
    sendTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
      typingTimeoutRef.current = null;
    }, 2000);
  }, [messageValue, isConnected, sendTyping]);

  useEffect(() => {
    const noteTimeout = noteUpdateTimeoutRef.current;
    const typingTimeout = typingTimeoutRef.current;
    return () => {
      // Clean up typing status on unmount
      if (isConnected) {
        sendTyping(false);
      }
      if (noteTimeout) clearTimeout(noteTimeout);
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [isConnected, sendTyping]);

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

    if (editingMessage) {
      if (trimmed !== editingMessage.content.trim()) {
        editMessage(editingMessage.id, trimmed);
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

    dispatch(addMessage({ roomId: activeChat, message: optimisticMessage }));
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
      <div className="relative flex w-full h-full bg-background/30">
        <div className="relative flex flex-col flex-1 h-full">
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
            onInfoClick={() => setShowInfoPanel(!showInfoPanel)}
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

        {/* Chat Info Panel */}
        {showInfoPanel && activeRoom && (
          <ChatInfoPanel
            room={activeRoom}
            user={user}
            onlineUsers={globalOnlineUsers}
            onClose={() => setShowInfoPanel(false)}
          />
        )}
      </div>
    </>
  );
}
