/* eslint-disable @typescript-eslint/no-explicit-any */

import { Message, ChatRoom } from '@/services/chatApi';

export interface ChatMessageEvent {
  type: 'chat_message';
  message: Message;
}

export interface ChatRoomCreatedEvent {
  type: 'chat_room_created';
  room: ChatRoom;
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

export interface NewMessageNotificationEvent {
  type: 'new_message_notification';
  chat_room_id: number;
  sender_id: number;
  sender_name?: string;
}

export type WebSocketEvent =
  | ChatMessageEvent
  | ChatRoomCreatedEvent
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
  | GlobalUserOfflineEvent
  | NewMessageNotificationEvent;

abstract class BaseWebSocketService {
  protected socket: WebSocket | null = null;
  protected callbacks: { [key: string]: Array<(data: any) => void> } = {};
  protected reconnectAttempts = 0;
  protected maxReconnectAttempts = 10;
  protected baseReconnectInterval = 1000;
  protected reconnectTimer: NodeJS.Timeout | null = null;
  protected isExplicitlyDisconnected = false;
  protected url: string | null = null;
  protected pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupWindowListeners();
  }

  protected setupWindowListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (!this.socket && !this.isExplicitlyDisconnected && this.url) {
          if (import.meta.env.DEV)
            console.log('🌐 Network online, reconnecting...');
          this.reconnect();
        }
      });

      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (!this.socket && !this.isExplicitlyDisconnected && this.url) {
            if (import.meta.env.DEV)
              console.log('👁️ App visible, checking connection...');
            this.reconnect();
          }
        }
      });
    }
  }

  protected connectSocket(url: string) {
    // If we are already connected/connecting to the SAME url, do nothing.
    if (this.socket && this.url === url) {
      if (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      ) {
        return;
      }
    }

    this.url = url;
    this.isExplicitlyDisconnected = false;

    if (this.socket) {
      this.socket.onclose = null; // Prevent triggering reconnect for the old socket
      this.socket.close();
      this.socket = null;
    }

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        if (import.meta.env.DEV) console.log(`✅ WebSocket connected`);
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.onOpen();
      };

      this.socket.onmessage = event => {
        try {
          const data = JSON.parse(event.data);
          this.handleSocketMessage(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.socket.onclose = event => {
        this.stopHeartbeat();
        if (import.meta.env.DEV)
          console.log(`❌ WebSocket disconnected code=${event.code}`);
        this.socket = null;
        this.onClose();

        if (!this.isExplicitlyDisconnected) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = error => {
        console.error('WebSocket error:', error);
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      this.scheduleReconnect();
    }
  }

  protected scheduleReconnect() {
    if (this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached. Giving up.');
      return;
    }

    const delay = Math.min(
      this.baseReconnectInterval * Math.pow(1.5, this.reconnectAttempts),
      30000
    );

    if (import.meta.env.DEV)
      console.log(
        `🔄 Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts + 1})`
      );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      if (this.url) {
        this.connectSocket(this.url);
      }
    }, delay);
  }

  protected reconnect() {
    if (this.url) {
      this.connectSocket(this.url);
    }
  }

  disconnect() {
    this.isExplicitlyDisconnected = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.url = null;
    if (import.meta.env.DEV) console.log('🛑 WebSocket disconnected manually');
  }

  protected startHeartbeat() {
    this.stopHeartbeat();
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000);
  }

  protected stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(data));
      } catch (e) {
        console.error('WebSocket send error:', e);
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn('WebSocket is not open. Cannot send data');
      }
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
      if (this.callbacks[eventType].length === 0) {
        delete this.callbacks[eventType];
      }
    }
  }

  protected handleSocketMessage(data: WebSocketEvent) {
    const eventType = data.type;
    if (import.meta.env.DEV && eventType !== ('ping' as any))
      console.log('📨 WebSocket received:', eventType);

    if (this.callbacks[eventType]) {
      this.callbacks[eventType].forEach(callback => callback(data));
    }
  }

  protected onOpen() {}
  protected onClose() {}
}

export class WebSocketService extends BaseWebSocketService {
  private static instance: WebSocketService;
  private currentChatRoomId: number | null = null;

  private constructor() {
    super();
  }

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(chatRoomId: number, token: string) {
    if (this.currentChatRoomId === chatRoomId && this.isConnected()) {
      if (import.meta.env.DEV)
        console.log('Already connected to this chat room');
      return;
    }

    const baseUrl = import.meta.env.VITE_BASE_API_URL;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socketUrl = `${protocol}://${baseUrl}/ws/chat/${chatRoomId}/?token=${token}`;

    this.currentChatRoomId = chatRoomId;
    this.connectSocket(socketUrl);
  }

  disconnect() {
    super.disconnect();
    this.currentChatRoomId = null;
  }

  sendMessage(content: string) {
    this.send({ type: 'send_message', content });
  }

  sendTypingStatus(isTyping: boolean) {
    this.send({ type: 'typing', is_typing: isTyping });
  }

  sendReadReceipt(messageId: number) {
    this.send({ type: 'read_receipt', message_id: messageId });
  }

  sendEditMessage(messageId: number, content: string) {
    this.send({ type: 'edit_message', message_id: messageId, content });
  }

  sendDeleteMessage(messageId: number) {
    this.send({ type: 'delete_message', message_id: messageId });
  }

  sendCollaborativeNote(content: string) {
    this.send({ type: 'collab_update', content });
  }

  sendCursorUpdate(cursor: { start: number; end: number }) {
    this.send({ type: 'cursor_update', cursor });
  }

  sendHuddleJoin() {
    if (import.meta.env.DEV) console.log('🎙️ Sending huddle_join event');
    this.send({ type: 'huddle_join' });
  }

  sendHuddleLeave() {
    if (import.meta.env.DEV) console.log('🎙️ Sending huddle_leave event');
    this.send({ type: 'huddle_leave' });
  }

  requestHuddleState() {
    if (import.meta.env.DEV)
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
}

export class GlobalWebSocketService extends BaseWebSocketService {
  private static instance: GlobalWebSocketService;

  private constructor() {
    super();
  }

  static getInstance() {
    if (!GlobalWebSocketService.instance) {
      GlobalWebSocketService.instance = new GlobalWebSocketService();
    }
    return GlobalWebSocketService.instance;
  }

  connect(token: string) {
    if (this.isConnected()) {
      return;
    }

    const baseUrl = import.meta.env.VITE_BASE_API_URL;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socketUrl = `${protocol}://${baseUrl}/ws/global/?token=${token}`;

    this.connectSocket(socketUrl);
  }
}
