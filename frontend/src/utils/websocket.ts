/* eslint-disable @typescript-eslint/no-explicit-any */

import { Message } from '@/services/chatApi';

export interface ChatMessageEvent {
  type: 'chat_message';
  message: Message;
}

export interface TypingStatusEvent {
  type: 'typing_status';
  typing_data: {
    user_id: number;
    is_typing: boolean;
  };
}

export interface ReadReceiptEvent {
  type: 'read_receipt';
  read_receipt_data: {
    message_id: number;
    user_id: number;
  };
}

export interface MessageUpdatedEvent {
  type: 'message_updated';
  message: Message;
}

export interface MessageDeletedEvent {
  type: 'message_deleted';
  message_id: number;
}

export interface PresenceStateEvent {
  type: 'presence_state';
  users: {
    count: number;
    truncated: boolean;
    users: Array<{
      id: number;
      name: string;
      avatar?: string | null;
      last_seen?: string;
    }>;
  };
}

export interface PresenceUpdateEvent {
  type: 'presence_update';
  action: 'join' | 'leave';
  user: {
    id: number;
    name: string;
    avatar?: string | null;
    last_seen?: string;
  };
}

export interface CollabStateEvent {
  type: 'collab_state';
  content: string;
}

export interface CollabUpdateEvent {
  type: 'collab_update';
  content: string;
  user: { id: number; name: string; avatar?: string | null };
}

export interface CursorStateEvent {
  type: 'cursor_state';
  cursors: Record<number, { start: number; end: number }>;
}

export interface CursorUpdateEvent {
  type: 'cursor_update';
  cursor: { start: number; end: number };
  user: { id: number; name: string; avatar?: string | null };
}

export interface HuddleParticipantsEvent {
  type: 'huddle_participants';
  participants: Array<{ id: number; name: string }>;
}

export interface HuddleSignalEvent {
  type: 'huddle_signal';
  from: { id: number; name: string; avatar?: string | null };
  payload: {
    type: 'offer' | 'answer' | 'candidate';
    sdp?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidateInit;
  };
}

export interface GlobalOnlineUsersEvent {
  type: 'global.online_users';
  online_users: number[];
}

export interface GlobalUserOnlineEvent {
  type: 'global.user_online';
  user_id: number;
}

export interface GlobalUserOfflineEvent {
  type: 'global.user_offline';
  user_id: number;
}

export type WebSocketEvent =
  | ChatMessageEvent
  | TypingStatusEvent
  | ReadReceiptEvent
  | MessageUpdatedEvent
  | MessageDeletedEvent
  | PresenceStateEvent
  | PresenceUpdateEvent
  | CollabStateEvent
  | CollabUpdateEvent
  | CursorStateEvent
  | CursorUpdateEvent
  | HuddleParticipantsEvent
  | HuddleSignalEvent
  | GlobalOnlineUsersEvent
  | GlobalUserOnlineEvent
  | GlobalUserOfflineEvent;

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private callbacks: { [key: string]: Array<(data: any) => void> } = {};
  private currentChatRoomId: number | null = null;

  private constructor() {}

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(chatRoomId: number, token: string) {
    if (this.socket && this.currentChatRoomId === chatRoomId) {
      console.log('Already connected to this chat room');
      return;
    }

    // Disconnect the existing WebSocket connection if switching chat rooms
    this.disconnect();

    const baseUrl = import.meta.env.VITE_BASE_API_URL;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socketUrl = `${protocol}://${baseUrl}/ws/chat/${chatRoomId}/?token=${token}`;

    this.socket = new WebSocket(socketUrl);
    this.currentChatRoomId = chatRoomId;

    this.socket.onopen = () => {
      console.log('WebSocket connected');
    };

    this.socket.onmessage = event => {
      const data: WebSocketEvent = JSON.parse(event.data);
      this.handleSocketMessage(data);
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.socket = null;
      this.currentChatRoomId = null;
    };

    this.socket.onerror = error => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.onclose = null; // Prevent triggering onclose twice
      this.socket.close();
      this.socket = null;
      this.currentChatRoomId = null;
      console.log('WebSocket disconnected manually');
    }
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      // Only log in non-production to avoid noise during development StrictMode
      if (import.meta.env.DEV) {
        console.warn('WebSocket is not open. Cannot send data');
      }
    }
  }

  sendMessage(content: string) {
    const data = {
      type: 'send_message',
      content,
    };
    this.send(data);
  }

  sendTypingStatus(isTyping: boolean) {
    const data = {
      type: 'typing',
      is_typing: isTyping,
    };
    this.send(data);
  }

  sendReadReceipt(messageId: number) {
    const data = {
      type: 'read_receipt',
      message_id: messageId,
    };
    this.send(data);
  }

  sendEditMessage(messageId: number, content: string) {
    const data = {
      type: 'edit_message',
      message_id: messageId,
      content,
    };
    this.send(data);
  }

  sendDeleteMessage(messageId: number) {
    const data = {
      type: 'delete_message',
      message_id: messageId,
    };
    this.send(data);
  }

  sendCollaborativeNote(content: string) {
    this.send({ type: 'collab_update', content });
  }

  sendCursorUpdate(cursor: { start: number; end: number }) {
    this.send({ type: 'cursor_update', cursor });
  }

  sendHuddleJoin() {
    console.log('🎙️ Sending huddle_join event');
    this.send({ type: 'huddle_join' });
  }

  sendHuddleLeave() {
    console.log('🎙️ Sending huddle_leave event');
    this.send({ type: 'huddle_leave' });
  }

  requestHuddleState() {
    console.log('🎙️ Requesting huddle state (lazy load)');
    this.send({ type: 'request_huddle_state' });
  }

  sendHuddleSignal(
    targetId: number,
    payload: {
      type: 'offer' | 'answer' | 'candidate';
      sdp?: RTCSessionDescriptionInit;
      candidate?: RTCIceCandidateInit;
    }
  ) {
    this.send({ type: 'huddle_signal', target_id: targetId, payload });
  }

  on<T extends WebSocketEvent>(
    eventType: T['type'],
    callback: (data: any) => void
  ): void {
    if (!this.callbacks[eventType]) {
      this.callbacks[eventType] = [];
    }
    this.callbacks[eventType].push(callback);
  }

  off<T extends WebSocketEvent>(
    eventType: T['type'],
    callback: (data: any) => void
  ): void {
    if (this.callbacks[eventType]) {
      this.callbacks[eventType] = this.callbacks[eventType].filter(
        cb => cb !== callback
      );
      if (this.callbacks[eventType].length === 0) {
        delete this.callbacks[eventType];
      }
    }
  }

  private handleSocketMessage(data: WebSocketEvent) {
    const eventType = data.type;
    console.log('📨 WebSocket received:', eventType, data);

    if (this.callbacks[eventType]) {
      this.callbacks[eventType].forEach(callback => callback(data));
    }
  }
}

export class GlobalWebSocketService {
  private static instance: GlobalWebSocketService;
  private socket: WebSocket | null = null;
  private callbacks: { [key: string]: Array<(data: any) => void> } = {};

  private constructor() {}

  static getInstance() {
    if (!GlobalWebSocketService.instance) {
      GlobalWebSocketService.instance = new GlobalWebSocketService();
    }
    return GlobalWebSocketService.instance;
  }

  connect(token: string) {
    if (this.socket) {
      return;
    }

    const baseUrl = import.meta.env.VITE_BASE_API_URL;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socketUrl = `${protocol}://${baseUrl}/ws/global/?token=${token}`;

    this.socket = new WebSocket(socketUrl);

    this.socket.onopen = () => {
      console.log('Global WebSocket connected');
    };

    this.socket.onmessage = event => {
      const data: WebSocketEvent = JSON.parse(event.data);
      this.handleSocketMessage(data);
    };

    this.socket.onclose = () => {
      console.log('Global WebSocket disconnected');
      this.socket = null;
    };

    this.socket.onerror = error => {
      console.error('Global WebSocket error:', error);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  on<T extends WebSocketEvent>(
    eventType: T['type'],
    callback: (data: any) => void
  ): void {
    if (!this.callbacks[eventType]) {
      this.callbacks[eventType] = [];
    }
    this.callbacks[eventType].push(callback);
  }

  off<T extends WebSocketEvent>(
    eventType: T['type'],
    callback: (data: any) => void
  ): void {
    if (this.callbacks[eventType]) {
      this.callbacks[eventType] = this.callbacks[eventType].filter(
        cb => cb !== callback
      );
    }
  }

  private handleSocketMessage(data: WebSocketEvent) {
    const eventType = data.type;
    if (this.callbacks[eventType]) {
      this.callbacks[eventType].forEach(callback => callback(data));
    }
  }
}
