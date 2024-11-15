import { baseApi } from "./baseApi";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

export interface FriendRequest {
  id: number;
  from_user: User;
  to_user: User;
  status: string;
  created_at: string;
}

export interface Friendship {
  id: number;
  users: User[];
  created_at: string;
}

export interface ChatRoom {
  id: number;
  name?: string;
  is_group_chat: boolean;
  participants: User[];
  created_at: string;
}

export interface Message {
  id: number;
  chat_room: number;
  sender: User;
  content: string;
  timestamp: string;
}

export interface MessageReadReceipt {
  id: number;
  message: number;
  user: User;
  read_at: string;
}

export interface TypingStatus {
  id: number;
  chat_room: number;
  user: User;
  is_typing: boolean;
  updated_at: string;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Friend Requests
    getFriendRequests: builder.query<FriendRequest[], void>({
      query: () => "chat/friend-requests/",
      providesTags: ["FriendRequests"],
    }),
    sendFriendRequest: builder.mutation<FriendRequest, { to_user_id: number }>({
      query: (body) => ({
        url: "chat/friend-requests/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["FriendRequests"],
    }),
    acceptFriendRequest: builder.mutation<{ status: string }, { id: number }>({
      query: ({ id }) => ({
        url: `chat/friend-requests/${id}/accept/`,
        method: "POST",
      }),
      invalidatesTags: ["FriendRequests", "Friendships"],
    }),
    declineFriendRequest: builder.mutation<{ status: string }, { id: number }>({
      query: ({ id }) => ({
        url: `chat/friend-requests/${id}/decline/`,
        method: "POST",
      }),
      invalidatesTags: ["FriendRequests"],
    }),

    // Friendships
    getFriendships: builder.query<Friendship[], void>({
      query: () => "chat/friendships/",
      providesTags: ["Friendships"],
    }),

    // Chat Rooms
    getChatRooms: builder.query<ChatRoom[], void>({
      query: () => "chat/chat-rooms/",
      providesTags: ["ChatRooms"],
    }),
    createChatRoom: builder.mutation<ChatRoom, Partial<ChatRoom>>({
      query: (body) => ({
        url: "chat/chat-rooms/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ChatRooms"],
    }),

    // Messages
    getMessages: builder.query<Message[], { chat_room_id: number }>({
      query: ({ chat_room_id }) => ({
        url: `chat/messages/?chat_room=${chat_room_id}`,
      }),
      providesTags: (_result, _error, arg) => [{ type: "Messages", id: arg.chat_room_id }],
    }),
    sendMessage: builder.mutation<Message, Partial<Message>>({
      query: (body) => ({
        url: "chat/messages/",
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: "Messages", id: arg.chat_room }],
    }),

    // Message Read Receipts
    sendReadReceipt: builder.mutation<MessageReadReceipt, { message_id: number }>({
      query: ({ message_id }) => ({
        url: "chat/message-read-receipts/",
        method: "POST",
        body: { message: message_id },
      }),
      invalidatesTags: ["Messages"],
    }),

    // Typing Status
    updateTypingStatus: builder.mutation<TypingStatus, { chat_room: number; is_typing: boolean }>({
      query: (body) => ({
        url: "chat/typing-status/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TypingStatus"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetFriendRequestsQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useGetFriendshipsQuery,
  useGetChatRoomsQuery,
  useCreateChatRoomMutation,
  useGetMessagesQuery,
  useSendMessageMutation,
  useSendReadReceiptMutation,
  useUpdateTypingStatusMutation,
} = chatApi;
