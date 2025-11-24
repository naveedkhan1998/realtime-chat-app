import { baseApi } from './baseApi';

export interface User {
  id: number;
  name: string;
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
  user1: User;
  user2: User;
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
  attachment?: string;
  attachment_type?: 'image' | 'video' | 'audio' | 'file';
  timestamp: string;
  updated_at: string;
  client_id?: string;
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

export interface PaginatedResponse<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface CreateChatRoomPayload {
  name?: string;
  is_group_chat?: boolean;
  participant_ids: number[];
}

export interface Notification {
  id: number;
  chat_room: number | null;
  content: string;
  created_at: string;
  is_read: boolean;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    // Friend Requests
    getFriendRequests: builder.query<FriendRequest[], void>({
      query: () => 'chat/friend-requests/',
      providesTags: ['FriendRequests'],
    }),
    sendFriendRequest: builder.mutation<FriendRequest, { to_user_id: number }>({
      query: body => ({
        url: 'chat/friend-requests/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FriendRequests'],
    }),
    acceptFriendRequest: builder.mutation<{ status: string }, { id: number }>({
      query: ({ id }) => ({
        url: `chat/friend-requests/${id}/accept/`,
        method: 'POST',
      }),
      invalidatesTags: ['FriendRequests', 'Friendships'],
    }),
    declineFriendRequest: builder.mutation<{ status: string }, { id: number }>({
      query: ({ id }) => ({
        url: `chat/friend-requests/${id}/decline/`,
        method: 'POST',
      }),
      invalidatesTags: ['FriendRequests'],
    }),

    // Friendships
    getFriendships: builder.query<Friendship[], void>({
      query: () => 'chat/friendships/',
      providesTags: ['Friendships'],
    }),

    // Chat Rooms
    getChatRooms: builder.query<ChatRoom[], void>({
      query: () => 'chat/chat-rooms/',
      providesTags: ['ChatRooms'],
    }),
    createChatRoom: builder.mutation<ChatRoom, CreateChatRoomPayload>({
      query: body => ({
        url: 'chat/chat-rooms/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ChatRooms'],
    }),

    // Messages
    getMessagesPage: builder.query<
      PaginatedResponse<Message>,
      { chat_room_id: number; cursor?: string; limit?: number }
    >({
      query: ({ chat_room_id, cursor, limit }) => {
        const params = new URLSearchParams({
          chat_room: chat_room_id.toString(),
        });
        if (cursor) {
          params.set('cursor', cursor);
        }
        if (limit) {
          params.set('limit', limit.toString());
        }
        return {
          url: `chat/messages/?${params.toString()}`,
        };
      },
      providesTags: (_result, _error, arg) => [
        { type: 'Messages', id: arg.chat_room_id },
      ],
    }),
    sendMessage: builder.mutation<Message, Partial<Message> | FormData>({
      query: body => ({
        url: 'chat/messages/',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => {
        let chatRoomId;
        if (arg instanceof FormData) {
          chatRoomId = arg.get('chat_room');
        } else {
          chatRoomId = arg.chat_room;
        }
        return [{ type: 'Messages', id: Number(chatRoomId) }];
      },
    }),

    // Message Read Receipts
    sendReadReceipt: builder.mutation<
      MessageReadReceipt,
      { message_id: number }
    >({
      query: ({ message_id }) => ({
        url: 'chat/message-read-receipts/',
        method: 'POST',
        body: { message: message_id },
      }),
      invalidatesTags: ['Messages'],
    }),

    // Typing Status
    updateTypingStatus: builder.mutation<
      TypingStatus,
      { chat_room: number; is_typing: boolean }
    >({
      query: body => ({
        url: 'chat/typing-status/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TypingStatus'],
    }),

    // ICE Servers
    getIceServers: builder.query<RTCIceServer[], void>({
      query: () => 'chat/ice-servers/',
    }),

    // Notifications
    getNotifications: builder.query<Notification[], void>({
      query: () => 'chat/notifications/',
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation<{ status: string }, { id: number }>({
      query: ({ id }) => ({
        url: `chat/notifications/${id}/mark_read/`,
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation<{ status: string }, void>({
      query: () => ({
        url: 'chat/notifications/mark_all_read/',
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),

    // Upload URL
    getUploadUrl: builder.mutation<{ url: string; key: string }, { filename: string; content_type: string }>({
      query: (params) => ({
        url: `chat/upload-url/?filename=${params.filename}&content_type=${params.content_type}`,
        method: 'GET',
      }),
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
  useGetMessagesPageQuery,
  useLazyGetMessagesPageQuery,
  useSendMessageMutation,
  useSendReadReceiptMutation,
  useUpdateTypingStatusMutation,
  useGetIceServersQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useGetUploadUrlMutation,
} = chatApi;
