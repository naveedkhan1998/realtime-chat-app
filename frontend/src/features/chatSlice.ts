// features/chatSlice.ts

import { Message, TypingStatus } from "@/services/chatApi";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ChatState {
  messages: { [chatRoomId: number]: Message[] };
  typingStatuses: { [chatRoomId: number]: TypingStatus[] };
}

const initialState: ChatState = {
  messages: {},
  typingStatuses: {},
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage(state, action: PayloadAction<{ chatRoomId: number; message: Message }>) {
      const { chatRoomId, message } = action.payload;
      if (!state.messages[chatRoomId]) {
        state.messages[chatRoomId] = [];
      }
      state.messages[chatRoomId].push(message);
    },
    updateTypingStatus(state, action: PayloadAction<{ chatRoomId: number; typingStatus: TypingStatus }>) {
      const { chatRoomId, typingStatus } = action.payload;
      state.typingStatuses[chatRoomId] = state.typingStatuses[chatRoomId].filter((status) => status.user.id !== typingStatus.user.id);
      state.typingStatuses[chatRoomId].push(typingStatus);
    },
    // Other reducers...
  },
});

export const { addMessage, updateTypingStatus } = chatSlice.actions;
export default chatSlice.reducer;
