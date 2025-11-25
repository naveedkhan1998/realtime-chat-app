/**
 * Unified Chat Slice - Optimized state management for real-time chat.
 *
 * Key optimizations:
 * - Uses createEntityAdapter for normalized message storage (O(1) lookups)
 * - Batched updates to reduce re-renders
 * - Efficient message reconciliation for optimistic updates
 * - Memoized selectors for performance
 * - Clean separation of concerns per room
 */

import {
  createSlice,
  createEntityAdapter,
  PayloadAction,
  createSelector,
} from '@reduxjs/toolkit';
import { Message } from '@/services/chatApi';
import type { RootState } from '@/app/store';
import type {
  UserData,
  PresenceState,
  CursorPosition,
  HuddleParticipant,
} from '@/utils/unifiedWebSocket';

// ==================== Entity Adapters ====================

// Message adapter with custom ID selector
const messagesAdapter = createEntityAdapter<Message, number>({
  selectId: (message: Message) => message.id,
  sortComparer: (a: Message, b: Message) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
});

// ==================== State Types ====================

interface RoomState {
  messages: ReturnType<typeof messagesAdapter.getInitialState>;
  typingUsers: Record<number, boolean>;
  presence: PresenceState | null;
  collaborativeNote: string;
  cursors: Record<number, CursorPosition>;
  huddleParticipants: HuddleParticipant[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    isLoading: boolean;
  };
  lastActivity: number;
}

interface UnifiedChatState {
  // Per-room state
  rooms: Record<number, RoomState>;

  // Global state
  globalOnlineUsers: number[];
  unreadNotifications: Record<number, boolean>;

  // Connection state
  isConnected: boolean;
  isAuthenticated: boolean;

  // Batch update queue
  pendingBatchUpdates: Array<{
    roomId: number;
    messages: Message[];
  }>;
}

// ==================== Initial State ====================

const createRoomState = (): RoomState => ({
  messages: messagesAdapter.getInitialState(),
  typingUsers: {},
  presence: null,
  collaborativeNote: '',
  cursors: {},
  huddleParticipants: [],
  pagination: {
    nextCursor: null,
    hasMore: true,
    isLoading: false,
  },
  lastActivity: Date.now(),
});

const initialState: UnifiedChatState = {
  rooms: {},
  globalOnlineUsers: [],
  unreadNotifications: {},
  isConnected: false,
  isAuthenticated: false,
  pendingBatchUpdates: [],
};

// ==================== Helper Functions ====================

const ensureRoomState = (
  state: UnifiedChatState,
  roomId: number
): RoomState => {
  if (!state.rooms[roomId]) {
    state.rooms[roomId] = createRoomState();
  }
  return state.rooms[roomId];
};

// ==================== Slice ====================

const unifiedChatSlice = createSlice({
  name: 'unifiedChat',
  initialState,
  reducers: {
    // ==================== Connection State ====================

    setConnected(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },

    setAuthenticated(state, action: PayloadAction<boolean>) {
      state.isAuthenticated = action.payload;
    },

    // ==================== Global State ====================

    setGlobalOnlineUsers(state, action: PayloadAction<number[]>) {
      state.globalOnlineUsers = action.payload;
    },

    addGlobalOnlineUser(state, action: PayloadAction<number>) {
      if (!state.globalOnlineUsers.includes(action.payload)) {
        state.globalOnlineUsers.push(action.payload);
      }
    },

    removeGlobalOnlineUser(state, action: PayloadAction<number>) {
      state.globalOnlineUsers = state.globalOnlineUsers.filter(
        id => id !== action.payload
      );
    },

    // ==================== Room State ====================

    initializeRoom(
      state,
      action: PayloadAction<{ roomId: number; presence?: PresenceState }>
    ) {
      const { roomId, presence } = action.payload;
      const room = ensureRoomState(state, roomId);
      if (presence) {
        room.presence = presence;
      }
      room.lastActivity = Date.now();
    },

    cleanupRoom(state, action: PayloadAction<number>) {
      delete state.rooms[action.payload];
    },

    // ==================== Messages ====================

    setMessages(
      state,
      action: PayloadAction<{ roomId: number; messages: Message[] }>
    ) {
      const { roomId, messages } = action.payload;
      const room = ensureRoomState(state, roomId);
      messagesAdapter.setAll(room.messages, messages);
      room.lastActivity = Date.now();
    },

    addMessage(
      state,
      action: PayloadAction<{ roomId: number; message: Message }>
    ) {
      const { roomId, message } = action.payload;
      const room = ensureRoomState(state, roomId);

      // Handle optimistic update reconciliation
      if (message.id > 0) {
        // Try to match by client_id first (most reliable)
        if (message.client_id) {
          const existingIds = room.messages.ids as number[];
          const optimisticId = existingIds.find(id => {
            const existing = room.messages.entities[id];
            return (
              existing &&
              existing.client_id === message.client_id &&
              existing.id < 0
            );
          });

          if (optimisticId !== undefined) {
            // Replace optimistic message with real one
            messagesAdapter.removeOne(room.messages, optimisticId);
            messagesAdapter.addOne(room.messages, message);
            room.lastActivity = Date.now();
            return;
          }
        }

        // Fallback: match by sender + content (heuristic)
        const existingIds = room.messages.ids as number[];
        const optimisticId = existingIds.find(id => {
          const existing = room.messages.entities[id];
          return (
            existing &&
            existing.id < 0 &&
            existing.sender.id === message.sender.id &&
            (existing.content === message.content ||
              (existing.attachment && message.attachment))
          );
        });

        if (optimisticId !== undefined) {
          messagesAdapter.removeOne(room.messages, optimisticId);
          messagesAdapter.addOne(room.messages, message);
          room.lastActivity = Date.now();
          return;
        }

        // Check if message already exists
        if (room.messages.entities[message.id]) {
          return;
        }
      }

      messagesAdapter.addOne(room.messages, message);
      room.lastActivity = Date.now();
    },

    addOptimisticMessage(
      state,
      action: PayloadAction<{ roomId: number; message: Message }>
    ) {
      const { roomId, message } = action.payload;
      const room = ensureRoomState(state, roomId);
      messagesAdapter.addOne(room.messages, message);
      room.lastActivity = Date.now();
    },

    prependMessages(
      state,
      action: PayloadAction<{ roomId: number; messages: Message[] }>
    ) {
      const { roomId, messages } = action.payload;
      const room = ensureRoomState(state, roomId);

      // Filter out duplicates
      const existingIds = new Set(room.messages.ids);
      const newMessages = messages.filter(m => !existingIds.has(m.id));

      messagesAdapter.addMany(room.messages, newMessages);
    },

    updateMessage(
      state,
      action: PayloadAction<{ roomId: number; message: Message }>
    ) {
      const { roomId, message } = action.payload;
      const room = state.rooms[roomId];
      if (!room) return;

      messagesAdapter.upsertOne(room.messages, message);
      room.lastActivity = Date.now();
    },

    removeMessage(
      state,
      action: PayloadAction<{ roomId: number; messageId: number }>
    ) {
      const { roomId, messageId } = action.payload;
      const room = state.rooms[roomId];
      if (!room) return;

      messagesAdapter.removeOne(room.messages, messageId);
      room.lastActivity = Date.now();
    },

    // ==================== Batch Updates ====================

    batchAddMessages(
      state,
      action: PayloadAction<Array<{ roomId: number; messages: Message[] }>>
    ) {
      action.payload.forEach(({ roomId, messages }) => {
        const room = ensureRoomState(state, roomId);

        // Filter duplicates
        const existingIds = new Set(room.messages.ids);
        const newMessages = messages.filter(m => !existingIds.has(m.id));

        messagesAdapter.addMany(room.messages, newMessages);
        room.lastActivity = Date.now();
      });
    },

    // ==================== Typing ====================

    updateTypingStatus(
      state,
      action: PayloadAction<{
        roomId: number;
        userId: number;
        isTyping: boolean;
      }>
    ) {
      const { roomId, userId, isTyping } = action.payload;
      const room = ensureRoomState(state, roomId);

      if (isTyping) {
        room.typingUsers[userId] = true;
      } else {
        delete room.typingUsers[userId];
      }
    },

    // ==================== Presence ====================

    setPresence(
      state,
      action: PayloadAction<{ roomId: number; presence: PresenceState }>
    ) {
      const { roomId, presence } = action.payload;
      const room = ensureRoomState(state, roomId);
      room.presence = presence;
    },

    updatePresence(
      state,
      action: PayloadAction<{
        roomId: number;
        action: 'join' | 'leave';
        user: UserData & { last_seen?: string };
      }>
    ) {
      const { roomId, action: presenceAction, user } = action.payload;
      const room = ensureRoomState(state, roomId);

      if (!room.presence) {
        room.presence = { count: 0, users: [], truncated: false };
      }

      if (presenceAction === 'join') {
        const existingIndex = room.presence.users.findIndex(
          (u: UserData & { last_seen?: string }) => u.id === user.id
        );
        if (existingIndex === -1) {
          room.presence.users.push(user);
          room.presence.count++;
        } else {
          room.presence.users[existingIndex] = user;
        }
      } else {
        room.presence.users = room.presence.users.filter(
          (u: UserData & { last_seen?: string }) => u.id !== user.id
        );
        room.presence.count = Math.max(0, room.presence.count - 1);
      }
    },

    // ==================== Collaboration ====================

    setCollaborativeNote(
      state,
      action: PayloadAction<{ roomId: number; content: string }>
    ) {
      const { roomId, content } = action.payload;
      const room = ensureRoomState(state, roomId);
      room.collaborativeNote = content;
    },

    setCursorState(
      state,
      action: PayloadAction<{
        roomId: number;
        cursors: Record<number, CursorPosition>;
      }>
    ) {
      const { roomId, cursors } = action.payload;
      const room = ensureRoomState(state, roomId);
      room.cursors = cursors;
    },

    updateCursor(
      state,
      action: PayloadAction<{
        roomId: number;
        userId: number;
        cursor: CursorPosition;
      }>
    ) {
      const { roomId, userId, cursor } = action.payload;
      const room = ensureRoomState(state, roomId);
      room.cursors[userId] = cursor;
    },

    // ==================== Huddle ====================

    setHuddleParticipants(
      state,
      action: PayloadAction<{
        roomId: number;
        participants: HuddleParticipant[];
      }>
    ) {
      const { roomId, participants } = action.payload;
      const room = ensureRoomState(state, roomId);
      room.huddleParticipants = participants || [];
    },

    // ==================== Pagination ====================

    setMessagePagination(
      state,
      action: PayloadAction<{
        roomId: number;
        nextCursor: string | null;
        hasMore?: boolean;
      }>
    ) {
      const { roomId, nextCursor, hasMore } = action.payload;
      const room = ensureRoomState(state, roomId);
      room.pagination.nextCursor = nextCursor;
      room.pagination.hasMore = hasMore ?? nextCursor !== null;
    },

    setLoadingMessages(
      state,
      action: PayloadAction<{ roomId: number; isLoading: boolean }>
    ) {
      const { roomId, isLoading } = action.payload;
      const room = ensureRoomState(state, roomId);
      room.pagination.isLoading = isLoading;
    },

    // ==================== Notifications ====================

    setUnreadNotification(state, action: PayloadAction<number>) {
      state.unreadNotifications[action.payload] = true;
    },

    clearUnreadNotification(state, action: PayloadAction<number>) {
      delete state.unreadNotifications[action.payload];
    },

    clearAllUnreadNotifications(state) {
      state.unreadNotifications = {};
    },
  },
});

// ==================== Selectors ====================

// Base selectors
const selectUnifiedChatState = (state: RootState) => state.unifiedChat;

// Stable empty arrays/objects to avoid new references
const EMPTY_MESSAGES: Message[] = [];
const EMPTY_TYPING_USERS: Record<number, boolean> = {};
const EMPTY_CURSORS: Record<number, CursorPosition> = {};
const EMPTY_HUDDLE_PARTICIPANTS: HuddleParticipant[] = [];
const EMPTY_PAGINATION = {
  nextCursor: null,
  hasMore: true,
  isLoading: false,
};

// Global selectors
export const selectGlobalOnlineUsers = (state: RootState) =>
  selectUnifiedChatState(state).globalOnlineUsers;

export const selectIsUserOnline = (state: RootState, userId: number) =>
  selectUnifiedChatState(state).globalOnlineUsers.includes(userId);

export const selectConnectionState = createSelector(
  [selectUnifiedChatState],
  chat => ({
    isConnected: chat.isConnected,
    isAuthenticated: chat.isAuthenticated,
  })
);

// Room messages selector - simple and direct
export const selectRoomMessages = (
  state: RootState,
  roomId: number
): Message[] => {
  const room = state.unifiedChat.rooms[roomId];
  if (!room) {
    return EMPTY_MESSAGES;
  }
  return messagesAdapter.getSelectors().selectAll(room.messages);
};

export const selectRoomMessageById = (
  state: RootState,
  roomId: number,
  messageId: number
) => {
  const room = state.unifiedChat.rooms[roomId];
  if (!room) return undefined;
  return room.messages.entities[messageId];
};

export const selectRoomTypingUsers = (state: RootState, roomId: number) => {
  const room = state.unifiedChat.rooms[roomId];
  return room?.typingUsers ?? EMPTY_TYPING_USERS;
};

export const selectRoomPresence = (state: RootState, roomId: number) => {
  const room = state.unifiedChat.rooms[roomId];
  return room?.presence ?? null;
};

export const selectRoomCollaborativeNote = (
  state: RootState,
  roomId: number
) => {
  const room = state.unifiedChat.rooms[roomId];
  return room?.collaborativeNote ?? '';
};

export const selectRoomCursors = (state: RootState, roomId: number) => {
  const room = state.unifiedChat.rooms[roomId];
  return room?.cursors ?? EMPTY_CURSORS;
};

export const selectRoomHuddleParticipants = (
  state: RootState,
  roomId: number
) => {
  const room = state.unifiedChat.rooms[roomId];
  return room?.huddleParticipants ?? EMPTY_HUDDLE_PARTICIPANTS;
};

export const selectRoomPagination = (state: RootState, roomId: number) => {
  const room = state.unifiedChat.rooms[roomId];
  return room?.pagination ?? EMPTY_PAGINATION;
};

// Notification selectors
export const selectUnreadNotifications = (state: RootState) =>
  selectUnifiedChatState(state).unreadNotifications;

export const selectHasUnreadNotification = (state: RootState, roomId: number) =>
  !!selectUnifiedChatState(state).unreadNotifications[roomId];

export const selectUnreadRoomCount = createSelector(
  [selectUnreadNotifications],
  notifications => Object.keys(notifications).length
);

// ==================== Exports ====================

export const {
  // Connection
  setConnected,
  setAuthenticated,
  // Global
  setGlobalOnlineUsers,
  addGlobalOnlineUser,
  removeGlobalOnlineUser,
  // Room
  initializeRoom,
  cleanupRoom,
  // Messages
  setMessages,
  addMessage,
  addOptimisticMessage,
  prependMessages,
  updateMessage,
  removeMessage,
  batchAddMessages,
  // Typing
  updateTypingStatus,
  // Presence
  setPresence,
  updatePresence,
  // Collaboration
  setCollaborativeNote,
  setCursorState,
  updateCursor,
  // Huddle
  setHuddleParticipants,
  // Pagination
  setMessagePagination,
  setLoadingMessages,
  // Notifications
  setUnreadNotification,
  clearUnreadNotification,
  clearAllUnreadNotifications,
} = unifiedChatSlice.actions;

export default unifiedChatSlice.reducer;
