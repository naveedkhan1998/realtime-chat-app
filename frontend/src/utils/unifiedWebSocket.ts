/**
 * Unified WebSocket Service - Single multiplexed connection for all real-time features.
 *
 * This replaces the previous 3-connection architecture (WebSocketService, GlobalWebSocketService, HuddleWebSocketService)
 * with a single efficient connection that uses namespace-based message routing.
 *
 * Key improvements:
 * - Single connection instead of 3 (reduced overhead, mobile battery savings)
 * - First-message authentication (no token in URL, more secure)
 * - Server-side heartbeat with pong response
 * - Automatic presence refresh before TTL expiration
 * - Room subscription management (subscribe/unsubscribe)
 * - Event batching support for high-frequency updates
 * - Clean namespace separation (global.*, chat.*, huddle.*)
 */

import { Message, ChatRoom } from '@/services/chatApi';

// ==================== Event Types ====================

export interface AuthRequiredEvent {
  type: 'auth.required';
  message: string;
}

export interface AuthSuccessEvent {
  type: 'auth.success';
  user: UserData;
  online_users: number[];
}

export interface AuthErrorEvent {
  type: 'auth.error';
  message: string;
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

export interface GlobalChatRoomCreatedEvent {
  type: 'global.chat_room_created';
  room: ChatRoom;
}

export interface GlobalNewMessageNotificationEvent {
  type: 'global.new_message_notification';
  chat_room_id: number;
  sender_id: number;
  sender_name?: string;
}

export interface ChatSubscribedEvent {
  type: 'chat.subscribed';
  room_id: number;
  presence: PresenceState;
}

export interface ChatUnsubscribedEvent {
  type: 'chat.unsubscribed';
  room_id: number;
}

export interface ChatMessageEvent {
  type: 'chat.message';
  room_id: number;
  message: Message;
}

export interface ChatMessageUpdatedEvent {
  type: 'chat.message_updated';
  room_id: number;
  message: Message;
}

export interface ChatMessageDeletedEvent {
  type: 'chat.message_deleted';
  room_id: number;
  message_id: number;
}

export interface ChatTypingStatusEvent {
  type: 'chat.typing_status';
  room_id: number;
  user_id: number;
  is_typing: boolean;
}

export interface ChatPresenceUpdateEvent {
  type: 'chat.presence_update';
  room_id: number;
  action: 'join' | 'leave';
  user: UserData;
}

export interface ChatCollabStateEvent {
  type: 'chat.collab_state';
  room_id: number;
  content: string;
}

export interface ChatCollabUpdateEvent {
  type: 'chat.collab_update';
  room_id: number;
  content: string;
  user: UserData;
}

export interface ChatCursorStateEvent {
  type: 'chat.cursor_state';
  room_id: number;
  cursors: Record<number, CursorPosition>;
}

export interface ChatCursorUpdateEvent {
  type: 'chat.cursor_update';
  room_id: number;
  cursor: CursorPosition;
  user: UserData;
}

export interface ChatHuddleParticipantsEvent {
  type: 'chat.huddle_participants';
  room_id: number;
  participants: HuddleParticipant[];
}

export interface HuddleSignalEvent {
  type: 'huddle.signal';
  room_id: number;
  from: UserData;
  payload: HuddleSignalPayload;
}

export interface PresenceAckEvent {
  type: 'presence.ack';
}

export interface SystemPongEvent {
  type: 'pong';
  timestamp: number;
}

export interface ErrorEvent {
  type: 'error';
  code?: string;
  message: string;
}

// Union of all events
export type UnifiedWebSocketEvent =
  | AuthRequiredEvent
  | AuthSuccessEvent
  | AuthErrorEvent
  | GlobalOnlineUsersEvent
  | GlobalUserOnlineEvent
  | GlobalUserOfflineEvent
  | GlobalChatRoomCreatedEvent
  | GlobalNewMessageNotificationEvent
  | ChatSubscribedEvent
  | ChatUnsubscribedEvent
  | ChatMessageEvent
  | ChatMessageUpdatedEvent
  | ChatMessageDeletedEvent
  | ChatTypingStatusEvent
  | ChatPresenceUpdateEvent
  | ChatCollabStateEvent
  | ChatCollabUpdateEvent
  | ChatCursorStateEvent
  | ChatCursorUpdateEvent
  | ChatHuddleParticipantsEvent
  | HuddleSignalEvent
  | PresenceAckEvent
  | SystemPongEvent
  | ErrorEvent;

// ==================== Helper Types ====================

export interface UserData {
  id: number;
  name: string;
  avatar?: string | null;
}

export interface PresenceState {
  count: number;
  users: Array<UserData & { last_seen?: string }>;
  truncated: boolean;
}

export interface CursorPosition {
  start: number;
  end: number;
}

export interface HuddleParticipant {
  id: number;
  name: string;
}

export interface HuddleSignalPayload {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

// ==================== Connection State ====================

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'authenticating'
  | 'authenticated'
  | 'error';

// ==================== Event Callback Types ====================

type EventCallback<T> = (event: T) => void;
type AnyEventCallback = EventCallback<UnifiedWebSocketEvent>;

// ==================== Unified WebSocket Service ====================

class UnifiedWebSocketService {
  private static instance: UnifiedWebSocketService;

  private socket: WebSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private token: string | null = null;

  // Event callbacks organized by namespace
  private callbacks: Map<string, Set<AnyEventCallback>> = new Map();

  // Connection management
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 15;
  private baseReconnectInterval = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isExplicitlyDisconnected = false;

  // Heartbeat management
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastPongTime = 0;
  private heartbeatIntervalMs = 25000; // Send ping every 25s (server expects within 30s)

  // Presence refresh
  private presenceRefreshInterval: ReturnType<typeof setInterval> | null = null;
  private presenceRefreshIntervalMs = 110000; // Refresh every 110s (TTL is 120s on server)

  // Room subscriptions
  private subscribedRooms: Set<number> = new Set();
  private activeHuddleRoom: number | null = null;

  // Message queue for offline messages
  private messageQueue: Array<Record<string, unknown>> = [];

  // State change listeners
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();

  private constructor() {
    this.setupWindowListeners();
  }

  static getInstance(): UnifiedWebSocketService {
    if (!UnifiedWebSocketService.instance) {
      UnifiedWebSocketService.instance = new UnifiedWebSocketService();
    }
    return UnifiedWebSocketService.instance;
  }

  // ==================== Connection Management ====================

  private setupWindowListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      if (
        this.connectionState === 'disconnected' &&
        !this.isExplicitlyDisconnected &&
        this.token
      ) {
        if (import.meta.env.DEV) console.log('🌐 Network online, reconnecting...');
        this.reconnect();
      }
    });

    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (
          this.connectionState === 'disconnected' &&
          !this.isExplicitlyDisconnected &&
          this.token
        ) {
          if (import.meta.env.DEV) console.log('👁️ App visible, reconnecting...');
          this.reconnect();
        } else if (this.connectionState === 'authenticated') {
          // Send presence heartbeat when tab becomes visible
          this.sendPresenceHeartbeat();
        }
      }
    });
  }

  connect(token: string): void {
    if (this.connectionState !== 'disconnected') {
      if (import.meta.env.DEV) console.log('Already connected or connecting');
      return;
    }

    this.token = token;
    this.isExplicitlyDisconnected = false;
    this.setConnectionState('connecting');

    const baseUrl = import.meta.env.VITE_BASE_API_URL;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // No token in URL - we'll send it via first message
    const socketUrl = `${protocol}://${baseUrl}/ws/stream/`;

    try {
      this.socket = new WebSocket(socketUrl);

      this.socket.onopen = () => {
        if (import.meta.env.DEV) console.log('✅ WebSocket connected, authenticating...');
        this.setConnectionState('authenticating');
        this.reconnectAttempts = 0;
        // Send authentication message
        this.sendRaw({ type: 'auth', token: this.token });
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as UnifiedWebSocketEvent;
          this.handleMessage(data);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.socket.onclose = (event) => {
        this.cleanup();
        if (import.meta.env.DEV)
          console.log(`❌ WebSocket disconnected code=${event.code}`);

        if (!this.isExplicitlyDisconnected) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.setConnectionState('error');
      };
    } catch (err) {
      console.error('Failed to create WebSocket:', err);
      this.setConnectionState('error');
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isExplicitlyDisconnected = true;
    this.cleanup();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
    this.token = null;
    this.subscribedRooms.clear();
    this.activeHuddleRoom = null;
    this.setConnectionState('disconnected');
    if (import.meta.env.DEV) console.log('🛑 WebSocket disconnected manually');
  }

  private cleanup(): void {
    this.stopHeartbeat();
    this.stopPresenceRefresh();
    this.setConnectionState('disconnected');
  }

  private reconnect(): void {
    if (this.token) {
      this.connect(this.token);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.setConnectionState('error');
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
      this.reconnect();
    }, delay);
  }

  // ==================== State Management ====================

  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.stateListeners.forEach((listener) => listener(state));
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  onConnectionStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  isAuthenticated(): boolean {
    return this.connectionState === 'authenticated';
  }

  // ==================== Heartbeat ====================

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastPongTime = Date.now();
    this.pingInterval = setInterval(() => {
      if (Date.now() - this.lastPongTime > this.heartbeatIntervalMs * 2) {
        // No pong received, connection might be dead
        if (import.meta.env.DEV) console.log('💔 No pong received, reconnecting...');
        this.socket?.close();
        return;
      }
      this.sendRaw({ type: 'ping' });
    }, this.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ==================== Presence Refresh ====================

  private startPresenceRefresh(): void {
    this.stopPresenceRefresh();
    this.presenceRefreshInterval = setInterval(() => {
      this.sendPresenceHeartbeat();
    }, this.presenceRefreshIntervalMs);
  }

  private stopPresenceRefresh(): void {
    if (this.presenceRefreshInterval) {
      clearInterval(this.presenceRefreshInterval);
      this.presenceRefreshInterval = null;
    }
  }

  private sendPresenceHeartbeat(): void {
    if (this.connectionState === 'authenticated') {
      this.sendRaw({ type: 'presence.heartbeat' });
    }
  }

  // ==================== Message Handling ====================

  private handleMessage(data: UnifiedWebSocketEvent): void {
    const eventType = data.type;

    if (import.meta.env.DEV && eventType !== 'pong') {
      console.log('📨 WS received:', eventType, data);
    }

    // Handle system messages
    if (eventType === 'auth.success') {
      this.setConnectionState('authenticated');
      this.startHeartbeat();
      this.startPresenceRefresh();
      this.flushMessageQueue();
      // Re-subscribe to rooms that were previously subscribed
      this.resubscribeRooms();
    } else if (eventType === 'auth.error') {
      this.setConnectionState('error');
      this.socket?.close();
    } else if (eventType === 'pong') {
      this.lastPongTime = Date.now();
    } else if (eventType === 'chat.subscribed') {
      const event = data as ChatSubscribedEvent;
      this.subscribedRooms.add(event.room_id);
    } else if (eventType === 'chat.unsubscribed') {
      const event = data as ChatUnsubscribedEvent;
      this.subscribedRooms.delete(event.room_id);
    }

    // Emit to listeners
    this.emit(eventType, data);

    // Also emit to namespace listeners (e.g., 'chat.*' listeners get all chat events)
    const namespace = eventType.split('.')[0];
    if (namespace !== eventType) {
      this.emit(`${namespace}.*`, data);
    }

    // Emit to wildcard listeners
    this.emit('*', data);
  }

  private emit(eventType: string, data: UnifiedWebSocketEvent): void {
    const callbacks = this.callbacks.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (e) {
          console.error(`Error in callback for ${eventType}:`, e);
        }
      });
    }
  }

  // ==================== Event Subscription ====================

  on<T extends UnifiedWebSocketEvent['type']>(
    eventType: T | `${string}.*` | '*',
    callback: EventCallback<Extract<UnifiedWebSocketEvent, { type: T }>>
  ): () => void {
    if (!this.callbacks.has(eventType)) {
      this.callbacks.set(eventType, new Set());
    }
    this.callbacks.get(eventType)!.add(callback as AnyEventCallback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(eventType);
      if (callbacks) {
        callbacks.delete(callback as AnyEventCallback);
        if (callbacks.size === 0) {
          this.callbacks.delete(eventType);
        }
      }
    };
  }

  off<T extends UnifiedWebSocketEvent['type']>(
    eventType: T | `${string}.*` | '*',
    callback: EventCallback<Extract<UnifiedWebSocketEvent, { type: T }>>
  ): void {
    const callbacks = this.callbacks.get(eventType);
    if (callbacks) {
      callbacks.delete(callback as AnyEventCallback);
      if (callbacks.size === 0) {
        this.callbacks.delete(eventType);
      }
    }
  }

  // ==================== Sending Messages ====================

  private sendRaw(data: Record<string, unknown>): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('WebSocket send error:', e);
        return false;
      }
    }
    return false;
  }

  send(data: Record<string, unknown>): boolean {
    if (this.connectionState !== 'authenticated') {
      // Queue message for later
      this.messageQueue.push(data);
      if (import.meta.env.DEV) {
        console.warn('WebSocket not authenticated, message queued');
      }
      return false;
    }
    return this.sendRaw(data);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendRaw(message);
      }
    }
  }

  private resubscribeRooms(): void {
    // Re-subscribe to previously subscribed rooms after reconnection
    const rooms = Array.from(this.subscribedRooms);
    this.subscribedRooms.clear();
    rooms.forEach((roomId) => {
      this.subscribeToRoom(roomId);
    });

    // Rejoin huddle if was active
    if (this.activeHuddleRoom) {
      this.joinHuddle(this.activeHuddleRoom);
    }
  }

  // ==================== Room Subscription ====================

  subscribeToRoom(roomId: number): void {
    if (this.subscribedRooms.has(roomId)) {
      if (import.meta.env.DEV) console.log(`Already subscribed to room ${roomId}`);
      return;
    }
    this.send({ type: 'chat.subscribe', room_id: roomId });
    // Optimistically add to set (will be confirmed by server)
    this.subscribedRooms.add(roomId);
  }

  unsubscribeFromRoom(roomId: number): void {
    if (!this.subscribedRooms.has(roomId)) return;
    this.send({ type: 'chat.unsubscribe', room_id: roomId });
    this.subscribedRooms.delete(roomId);
  }

  getSubscribedRooms(): number[] {
    return Array.from(this.subscribedRooms);
  }

  isSubscribedToRoom(roomId: number): boolean {
    return this.subscribedRooms.has(roomId);
  }

  // ==================== Chat Actions ====================

  sendMessage(roomId: number, content: string): void {
    this.send({ type: 'chat.send_message', room_id: roomId, content });
  }

  editMessage(roomId: number, messageId: number, content: string): void {
    this.send({
      type: 'chat.edit_message',
      room_id: roomId,
      message_id: messageId,
      content,
    });
  }

  deleteMessage(roomId: number, messageId: number): void {
    this.send({
      type: 'chat.delete_message',
      room_id: roomId,
      message_id: messageId,
    });
  }

  sendTypingStatus(roomId: number, isTyping: boolean): void {
    this.send({ type: 'chat.typing', room_id: roomId, is_typing: isTyping });
  }

  // ==================== Collaboration Actions ====================

  sendCollabUpdate(roomId: number, content: string): void {
    this.send({ type: 'chat.collab_update', room_id: roomId, content });
  }

  sendCursorUpdate(roomId: number, cursor: CursorPosition): void {
    this.send({ type: 'chat.cursor_update', room_id: roomId, cursor });
  }

  // ==================== Huddle Actions ====================

  joinHuddle(roomId: number): void {
    if (this.activeHuddleRoom && this.activeHuddleRoom !== roomId) {
      this.leaveHuddle();
    }
    this.activeHuddleRoom = roomId;
    this.send({ type: 'huddle.join', room_id: roomId });
  }

  leaveHuddle(): void {
    if (!this.activeHuddleRoom) return;
    this.send({ type: 'huddle.leave', room_id: this.activeHuddleRoom });
    this.activeHuddleRoom = null;
  }

  sendHuddleSignal(
    targetId: number,
    payload: HuddleSignalPayload
  ): void {
    if (!this.activeHuddleRoom) return;
    this.send({
      type: 'huddle.signal',
      room_id: this.activeHuddleRoom,
      target_id: targetId,
      payload,
    });
  }

  getActiveHuddleRoom(): number | null {
    return this.activeHuddleRoom;
  }

  // ==================== Global Actions ====================

  refreshOnlineUsers(): void {
    this.send({ type: 'global.refresh' });
  }
}

// Export singleton instance getter
export const getUnifiedWebSocket = UnifiedWebSocketService.getInstance.bind(
  UnifiedWebSocketService
);

// Export class for type inference
export type { UnifiedWebSocketService };

// Default export
export default UnifiedWebSocketService;
