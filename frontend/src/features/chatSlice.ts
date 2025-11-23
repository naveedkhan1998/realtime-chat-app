import { Message } from '@/services/chatApi';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatState {
  messages: { [chatRoomId: number]: Message[] };
  typingStatuses: { [chatRoomId: number]: { [userId: number]: boolean } };
  pagination: { [chatRoomId: number]: { nextCursor: string | null } };
  presence: {
    [chatRoomId: number]: Array<{
      id: number;
      name: string;
      avatar?: string | null;
      last_seen?: string;
    }>;
  };
  collaborativeNotes: { [chatRoomId: number]: string };
  cursors: {
    [chatRoomId: number]: Record<number, { start: number; end: number }>;
  };
  huddleParticipants: {
    [chatRoomId: number]: Array<{ id: number; name: string }>;
  };
  globalOnlineUsers: number[];
}

const initialState: ChatState = {
  messages: {},
  typingStatuses: {},
  pagination: {},
  presence: {},
  collaborativeNotes: {},
  cursors: {},
  huddleParticipants: {},
  globalOnlineUsers: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
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
    setMessages(
      state,
      action: PayloadAction<{ chatRoomId: number; messages: Message[] }>
    ) {
      state.messages[action.payload.chatRoomId] = action.payload.messages;
    },
    addMessage(
      state,
      action: PayloadAction<{ chatRoomId: number; message: Message }>
    ) {
      const { chatRoomId, message } = action.payload;
      if (!state.messages[chatRoomId]) {
        state.messages[chatRoomId] = [];
      }
      const alreadyExists = state.messages[chatRoomId].some(
        existing => existing.id === message.id
      );
      if (!alreadyExists) {
        state.messages[chatRoomId].push(message);
      }
    },
    prependMessages(
      state,
      action: PayloadAction<{ chatRoomId: number; messages: Message[] }>
    ) {
      const { chatRoomId, messages } = action.payload;
      const existing = state.messages[chatRoomId] ?? [];
      const existingIds = new Set(existing.map(message => message.id));
      const newMessages = messages.filter(
        message => !existingIds.has(message.id)
      );
      state.messages[chatRoomId] = [...newMessages, ...existing];
    },
    replaceMessage(
      state,
      action: PayloadAction<{ chatRoomId: number; message: Message }>
    ) {
      const { chatRoomId, message } = action.payload;
      const roomMessages = state.messages[chatRoomId];
      if (!roomMessages) {
        state.messages[chatRoomId] = [message];
        return;
      }
      const index = roomMessages.findIndex(
        existing => existing.id === message.id
      );
      if (index === -1) {
        roomMessages.push(message);
      } else {
        roomMessages[index] = message;
      }
    },
    removeMessage(
      state,
      action: PayloadAction<{ chatRoomId: number; messageId: number }>
    ) {
      const { chatRoomId, messageId } = action.payload;
      const roomMessages = state.messages[chatRoomId];
      if (!roomMessages) return;
      state.messages[chatRoomId] = roomMessages.filter(
        message => message.id !== messageId
      );
    },
    updateTypingStatus(
      state,
      action: PayloadAction<{
        chatRoomId: number;
        userId: number;
        isTyping: boolean;
      }>
    ) {
      const { chatRoomId, userId, isTyping } = action.payload;
      if (!state.typingStatuses[chatRoomId]) {
        state.typingStatuses[chatRoomId] = {};
      }
      if (isTyping) {
        state.typingStatuses[chatRoomId][userId] = true;
      } else {
        delete state.typingStatuses[chatRoomId][userId];
      }
    },
    setMessagePagination(
      state,
      action: PayloadAction<{ chatRoomId: number; nextCursor: string | null }>
    ) {
      const { chatRoomId, nextCursor } = action.payload;
      state.pagination[chatRoomId] = { nextCursor };
    },
    setPresence(
      state,
      action: PayloadAction<{
        chatRoomId: number;
        users: Array<{
          id: number;
          name: string;
          avatar?: string | null;
          last_seen?: string;
        }>;
      }>
    ) {
      state.presence[action.payload.chatRoomId] = action.payload.users;
    },
    updatePresence(
      state,
      action: PayloadAction<{
        chatRoomId: number;
        action: 'join' | 'leave';
        user: {
          id: number;
          name: string;
          avatar?: string | null;
          last_seen?: string;
        };
      }>
    ) {
      const { chatRoomId, action: presenceAction, user } = action.payload;
      const current = state.presence[chatRoomId] ?? [];
      if (presenceAction === 'join') {
        const existingIndex = current.findIndex(item => item.id === user.id);
        if (existingIndex === -1) {
          current.push(user);
        } else {
          current[existingIndex] = user;
        }
      } else {
        state.presence[chatRoomId] = current.filter(
          item => item.id !== user.id
        );
        return;
      }
      state.presence[chatRoomId] = current;
    },
    setCollaborativeNote(
      state,
      action: PayloadAction<{ chatRoomId: number; content: string }>
    ) {
      state.collaborativeNotes[action.payload.chatRoomId] =
        action.payload.content;
    },
    setCursorState(
      state,
      action: PayloadAction<{
        chatRoomId: number;
        cursors: Record<number, { start: number; end: number }>;
      }>
    ) {
      state.cursors[action.payload.chatRoomId] = action.payload.cursors;
    },
    updateCursor(
      state,
      action: PayloadAction<{
        chatRoomId: number;
        userId: number;
        cursor: { start: number; end: number };
      }>
    ) {
      if (!state.cursors[action.payload.chatRoomId]) {
        state.cursors[action.payload.chatRoomId] = {};
      }
      state.cursors[action.payload.chatRoomId][action.payload.userId] =
        action.payload.cursor;
    },
    setHuddleParticipants(
      state,
      action: PayloadAction<{
        chatRoomId: number;
        participants: Array<{ id: number; name: string }> | null;
      }>
    ) {
      // Handle null participants (when remove returns None in backend)
      state.huddleParticipants[action.payload.chatRoomId] =
        action.payload.participants || [];
    },
  },
});

export const {
  setMessages,
  addMessage,
  prependMessages,
  replaceMessage,
  removeMessage,
  updateTypingStatus,
  setMessagePagination,
  setPresence,
  updatePresence,
  setCollaborativeNote,
  setCursorState,
  updateCursor,
  setHuddleParticipants,
  setGlobalOnlineUsers,
  addGlobalOnlineUser,
  removeGlobalOnlineUser,
} = chatSlice.actions;
export default chatSlice.reducer;
