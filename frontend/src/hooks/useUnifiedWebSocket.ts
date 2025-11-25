/**
 * Unified WebSocket Hooks - React hooks for the unified WebSocket connection.
 *
 * Provides easy-to-use hooks for components to:
 * - Connect/disconnect from WebSocket
 * - Subscribe to events
 * - Send messages
 * - Manage room subscriptions
 * - Access connection state
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getUnifiedWebSocket, ConnectionState, UnifiedWebSocketEvent } from '@/utils/unifiedWebSocket';
import type { 
  ChatMessageEvent,
  ChatMessageUpdatedEvent,
  ChatMessageDeletedEvent,
  ChatTypingStatusEvent,
  ChatPresenceUpdateEvent,
  ChatCollabStateEvent,
  ChatCollabUpdateEvent,
  ChatCursorStateEvent,
  ChatCursorUpdateEvent,
  ChatHuddleParticipantsEvent,
  ChatSubscribedEvent,
  GlobalUserOnlineEvent,
  GlobalUserOfflineEvent,
  GlobalChatRoomCreatedEvent,
  GlobalNewMessageNotificationEvent,
  HuddleSignalEvent,
  AuthSuccessEvent,
  CursorPosition,
  HuddleSignalPayload,
} from '@/utils/unifiedWebSocket';
import {
  setConnected,
  setAuthenticated,
  setGlobalOnlineUsers,
  addGlobalOnlineUser,
  removeGlobalOnlineUser,
  initializeRoom,
  addMessage,
  updateMessage,
  removeMessage,
  updateTypingStatus,
  updatePresence,
  setCollaborativeNote,
  setCursorState,
  updateCursor,
  setHuddleParticipants,
  setUnreadNotification,
  clearUnreadNotification,
  selectConnectionState,
  selectGlobalOnlineUsers,
  selectRoomMessages,
  selectRoomTypingUsers,
  selectRoomPresence,
  selectRoomCollaborativeNote,
  selectRoomCursors,
  selectRoomHuddleParticipants,
  selectHasUnreadNotification,
} from '@/features/unifiedChatSlice';
import type { RootState, AppDispatch } from '@/app/store';

// ==================== Connection Hook ====================

/**
 * Main hook to manage WebSocket connection.
 * Should be used once at the app root level after authentication.
 */
export function useUnifiedWebSocket(token: string | null) {
  const dispatch = useDispatch<AppDispatch>();
  const ws = useRef(getUnifiedWebSocket());
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  useEffect(() => {
    if (!token) {
      ws.current.disconnect();
      dispatch(setConnected(false));
      dispatch(setAuthenticated(false));
      return;
    }

    // Connect to WebSocket
    ws.current.connect(token);

    // Listen for connection state changes
    const unsubscribeState = ws.current.onConnectionStateChange((state) => {
      setConnectionState(state);
      dispatch(setConnected(state === 'connected' || state === 'authenticating' || state === 'authenticated'));
      dispatch(setAuthenticated(state === 'authenticated'));
    });

    // Set up event handlers
    const unsubscribers: Array<() => void> = [];

    // Auth success - get initial online users
    unsubscribers.push(
      ws.current.on('auth.success', (event: AuthSuccessEvent) => {
        dispatch(setGlobalOnlineUsers(event.online_users));
      })
    );

    // Global user events
    unsubscribers.push(
      ws.current.on('global.user_online', (event: GlobalUserOnlineEvent) => {
        dispatch(addGlobalOnlineUser(event.user_id));
      })
    );

    unsubscribers.push(
      ws.current.on('global.user_offline', (event: GlobalUserOfflineEvent) => {
        dispatch(removeGlobalOnlineUser(event.user_id));
      })
    );

    // New message notifications (for rooms not currently subscribed)
    unsubscribers.push(
      ws.current.on('global.new_message_notification', (event: GlobalNewMessageNotificationEvent) => {
        dispatch(setUnreadNotification(event.chat_room_id));
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      unsubscribeState();
    };
  }, [token, dispatch]);

  return {
    connectionState,
    isConnected: connectionState === 'authenticated',
    disconnect: () => ws.current.disconnect(),
  };
}

// ==================== Room Subscription Hook ====================

/**
 * Hook to subscribe to a chat room and receive its events.
 * Automatically handles subscription/unsubscription on mount/unmount.
 */
export function useRoomSubscription(roomId: number | null) {
  const dispatch = useDispatch<AppDispatch>();
  const ws = useRef(getUnifiedWebSocket());
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!roomId || !ws.current.isAuthenticated()) {
      setIsSubscribed(false);
      return;
    }

    // Subscribe to room
    ws.current.subscribeToRoom(roomId);

    const unsubscribers: Array<() => void> = [];

    // Room subscribed - initialize state
    unsubscribers.push(
      ws.current.on('chat.subscribed', (event: ChatSubscribedEvent) => {
        if (event.room_id === roomId) {
          dispatch(initializeRoom({ roomId: event.room_id, presence: event.presence }));
          dispatch(clearUnreadNotification(roomId));
          setIsSubscribed(true);
        }
      })
    );

    // Chat messages
    unsubscribers.push(
      ws.current.on('chat.message', (event: ChatMessageEvent) => {
        if (event.room_id === roomId) {
          dispatch(addMessage({ roomId: event.room_id, message: event.message }));
        }
      })
    );

    unsubscribers.push(
      ws.current.on('chat.message_updated', (event: ChatMessageUpdatedEvent) => {
        if (event.room_id === roomId) {
          dispatch(updateMessage({ roomId: event.room_id, message: event.message }));
        }
      })
    );

    unsubscribers.push(
      ws.current.on('chat.message_deleted', (event: ChatMessageDeletedEvent) => {
        if (event.room_id === roomId) {
          dispatch(removeMessage({ roomId: event.room_id, messageId: event.message_id }));
        }
      })
    );

    // Typing status
    unsubscribers.push(
      ws.current.on('chat.typing_status', (event: ChatTypingStatusEvent) => {
        if (event.room_id === roomId) {
          dispatch(
            updateTypingStatus({
              roomId: event.room_id,
              userId: event.user_id,
              isTyping: event.is_typing,
            })
          );
        }
      })
    );

    // Presence updates
    unsubscribers.push(
      ws.current.on('chat.presence_update', (event: ChatPresenceUpdateEvent) => {
        if (event.room_id === roomId) {
          dispatch(
            updatePresence({
              roomId: event.room_id,
              action: event.action,
              user: event.user,
            })
          );
        }
      })
    );

    // Collaborative note
    unsubscribers.push(
      ws.current.on('chat.collab_state', (event: ChatCollabStateEvent) => {
        if (event.room_id === roomId) {
          dispatch(setCollaborativeNote({ roomId: event.room_id, content: event.content }));
        }
      })
    );

    unsubscribers.push(
      ws.current.on('chat.collab_update', (event: ChatCollabUpdateEvent) => {
        if (event.room_id === roomId) {
          dispatch(setCollaborativeNote({ roomId: event.room_id, content: event.content }));
        }
      })
    );

    // Cursor state
    unsubscribers.push(
      ws.current.on('chat.cursor_state', (event: ChatCursorStateEvent) => {
        if (event.room_id === roomId) {
          dispatch(setCursorState({ roomId: event.room_id, cursors: event.cursors }));
        }
      })
    );

    unsubscribers.push(
      ws.current.on('chat.cursor_update', (event: ChatCursorUpdateEvent) => {
        if (event.room_id === roomId) {
          dispatch(
            updateCursor({
              roomId: event.room_id,
              userId: event.user.id,
              cursor: event.cursor,
            })
          );
        }
      })
    );

    // Huddle participants
    unsubscribers.push(
      ws.current.on('chat.huddle_participants', (event: ChatHuddleParticipantsEvent) => {
        if (event.room_id === roomId) {
          dispatch(
            setHuddleParticipants({
              roomId: event.room_id,
              participants: event.participants,
            })
          );
        }
      })
    );

    return () => {
      // Unsubscribe from room
      if (roomId) {
        ws.current.unsubscribeFromRoom(roomId);
      }
      unsubscribers.forEach((unsub) => unsub());
      setIsSubscribed(false);
    };
  }, [roomId, dispatch]);

  return { isSubscribed };
}

// ==================== Room Actions Hook ====================

/**
 * Hook providing actions for a specific chat room.
 */
export function useRoomActions(roomId: number) {
  const ws = useRef(getUnifiedWebSocket());

  const sendMessage = useCallback(
    (content: string) => {
      ws.current.sendMessage(roomId, content);
    },
    [roomId]
  );

  const editMessage = useCallback(
    (messageId: number, content: string) => {
      ws.current.editMessage(roomId, messageId, content);
    },
    [roomId]
  );

  const deleteMessage = useCallback(
    (messageId: number) => {
      ws.current.deleteMessage(roomId, messageId);
    },
    [roomId]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      ws.current.sendTypingStatus(roomId, isTyping);
    },
    [roomId]
  );

  const sendCollabUpdate = useCallback(
    (content: string) => {
      ws.current.sendCollabUpdate(roomId, content);
    },
    [roomId]
  );

  const sendCursorUpdate = useCallback(
    (cursor: CursorPosition) => {
      ws.current.sendCursorUpdate(roomId, cursor);
    },
    [roomId]
  );

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    sendTyping,
    sendCollabUpdate,
    sendCursorUpdate,
  };
}

// ==================== Huddle Hook ====================

/**
 * Hook for managing voice huddle functionality.
 */
export function useHuddle(roomId: number) {
  const ws = useRef(getUnifiedWebSocket());
  const participants = useSelector((state: RootState) =>
    selectRoomHuddleParticipants(state, roomId)
  );
  const [isInHuddle, setIsInHuddle] = useState(false);

  const joinHuddle = useCallback(() => {
    ws.current.joinHuddle(roomId);
    setIsInHuddle(true);
  }, [roomId]);

  const leaveHuddle = useCallback(() => {
    ws.current.leaveHuddle();
    setIsInHuddle(false);
  }, []);

  const sendSignal = useCallback(
    (targetId: number, payload: HuddleSignalPayload) => {
      ws.current.sendHuddleSignal(targetId, payload);
    },
    []
  );

  // Listen for huddle signals
  const onHuddleSignal = useCallback(
    (callback: (event: HuddleSignalEvent) => void) => {
      return ws.current.on('huddle.signal', callback);
    },
    []
  );

  return {
    participants,
    isInHuddle,
    joinHuddle,
    leaveHuddle,
    sendSignal,
    onHuddleSignal,
  };
}

// ==================== Room Selectors Hook ====================

/**
 * Hook providing all room state selectors.
 */
export function useRoomState(roomId: number) {
  const messages = useSelector((state: RootState) => selectRoomMessages(state, roomId));
  const typingUsers = useSelector((state: RootState) => selectRoomTypingUsers(state, roomId));
  const presence = useSelector((state: RootState) => selectRoomPresence(state, roomId));
  const collaborativeNote = useSelector((state: RootState) =>
    selectRoomCollaborativeNote(state, roomId)
  );
  const cursors = useSelector((state: RootState) => selectRoomCursors(state, roomId));
  const huddleParticipants = useSelector((state: RootState) =>
    selectRoomHuddleParticipants(state, roomId)
  );
  const hasUnread = useSelector((state: RootState) => selectHasUnreadNotification(state, roomId));

  return {
    messages,
    typingUsers,
    presence,
    collaborativeNote,
    cursors,
    huddleParticipants,
    hasUnread,
  };
}

// ==================== Global State Hook ====================

/**
 * Hook for global WebSocket state.
 */
export function useGlobalState() {
  const { isConnected, isAuthenticated } = useSelector(selectConnectionState);
  const onlineUsers = useSelector(selectGlobalOnlineUsers);

  return {
    isConnected,
    isAuthenticated,
    onlineUsers,
  };
}

// ==================== Chat Room Created Event Hook ====================

/**
 * Hook to listen for new chat room creation events.
 */
export function useOnChatRoomCreated(
  callback: (event: GlobalChatRoomCreatedEvent) => void
) {
  const ws = useRef(getUnifiedWebSocket());

  useEffect(() => {
    const unsubscribe = ws.current.on('global.chat_room_created', callback);
    return unsubscribe;
  }, [callback]);
}

// ==================== Generic Event Listener Hook ====================

/**
 * Generic hook to listen for any WebSocket event.
 */
export function useWebSocketEvent<T extends UnifiedWebSocketEvent['type']>(
  eventType: T,
  callback: (event: Extract<UnifiedWebSocketEvent, { type: T }>) => void
) {
  const ws = useRef(getUnifiedWebSocket());

  useEffect(() => {
    const unsubscribe = ws.current.on(eventType, callback as (event: UnifiedWebSocketEvent) => void);
    return unsubscribe;
  }, [eventType, callback]);
}
