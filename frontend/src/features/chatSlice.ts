import { Message, TypingStatus } from "@/services/chatApi";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ChatState {
  messages: { [chatRoomId: number]: Message[] };
  typingStatuses: { [chatRoomId: number]: TypingStatus[] };
  pagination: { [chatRoomId: number]: { nextCursor: string | null } };
}

const initialState: ChatState = {
  messages: {},
  typingStatuses: {},
  pagination: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setMessages(state, action: PayloadAction<{ chatRoomId: number; messages: Message[] }>) {
      state.messages[action.payload.chatRoomId] = action.payload.messages;
    },
    addMessage(state, action: PayloadAction<{ chatRoomId: number; message: Message }>) {
      const { chatRoomId, message } = action.payload;
      if (!state.messages[chatRoomId]) {
        state.messages[chatRoomId] = [];
      }
      const alreadyExists = state.messages[chatRoomId].some(existing => existing.id === message.id);
      if (!alreadyExists) {
        state.messages[chatRoomId].push(message);
      }
    },
    prependMessages(state, action: PayloadAction<{ chatRoomId: number; messages: Message[] }>) {
      const { chatRoomId, messages } = action.payload;
      const existing = state.messages[chatRoomId] ?? [];
      const existingIds = new Set(existing.map(message => message.id));
      const newMessages = messages.filter(message => !existingIds.has(message.id));
      state.messages[chatRoomId] = [...newMessages, ...existing];
    },
    updateTypingStatus(state, action: PayloadAction<{ chatRoomId: number; typingStatus: TypingStatus }>) {
      const { chatRoomId, typingStatus } = action.payload;
      state.typingStatuses[chatRoomId] = state.typingStatuses[chatRoomId].filter((status) => status.user.id !== typingStatus.user.id);
      state.typingStatuses[chatRoomId].push(typingStatus);
    },
    setMessagePagination(state, action: PayloadAction<{ chatRoomId: number; nextCursor: string | null }>) {
      const { chatRoomId, nextCursor } = action.payload;
      state.pagination[chatRoomId] = { nextCursor };
    },
  },
});

export const { setMessages, addMessage, prependMessages, updateTypingStatus, setMessagePagination } = chatSlice.actions;
export default chatSlice.reducer;
