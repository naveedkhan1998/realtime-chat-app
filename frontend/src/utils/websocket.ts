/* eslint-disable @typescript-eslint/no-explicit-any */

import { Message } from "@/services/chatApi";

export interface ChatMessageEvent {
  type: "chat_message";
  message: Message;
}

export interface TypingStatusEvent {
  type: "typing_status";
  typing_data: {
    user_id: number;
    is_typing: boolean;
  };
}

export interface ReadReceiptEvent {
  type: "read_receipt";
  read_receipt_data: {
    message_id: number;
    user_id: number;
  };
}

export type WebSocketEvent = ChatMessageEvent | TypingStatusEvent | ReadReceiptEvent;
export class WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private callbacks: { [key: string]: Array<(data: any) => void> } = {};
  private currentChatRoomId: number | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 3000; // 3 seconds between reconnect attempts
  private pingInterval: number | null = null;

  private constructor() {}

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(chatRoomId: number, token: string) {
    if (this.socket && this.currentChatRoomId === chatRoomId) {
      console.log("Already connected to this chat room");
      return;
    }

    // Disconnect the existing WebSocket connection if switching chat rooms
    this.disconnect();

    const baseUrl = import.meta.env.VITE_BASE_API_URL;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socketUrl = `${protocol}://${baseUrl}/ws/chat/${chatRoomId}/?token=${token}`;

    this.socket = new WebSocket(socketUrl);
    this.currentChatRoomId = chatRoomId;
    this.reconnectAttempts = 0;

    this.socket.onopen = () => {
      console.log("WebSocket connected");
      this.startPing(); // Start the ping-pong mechanism
    };

    this.socket.onmessage = (event) => {
      const data: WebSocketEvent = JSON.parse(event.data);
      this.handleSocketMessage(data);
    };

    this.socket.onclose = () => {
      console.log("WebSocket disconnected");
      this.stopPing(); // Stop ping-pong on disconnect
      this.socket = null;
      this.currentChatRoomId = null;

      // Attempt to reconnect
      this.reconnect();
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.onclose = null; // Prevent triggering onclose twice
      this.socket.close();
      this.stopPing();
      console.log("WebSocket disconnected manually");
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        console.log("Attempting to reconnect...");
        this.reconnectAttempts += 1;
        if (this.currentChatRoomId && this.socket === null) {
          this.connect(this.currentChatRoomId, "your-token-here");
        }
      }, this.reconnectInterval);
    } else {
      console.log("Max reconnect attempts reached.");
    }
  }

  private startPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    this.pingInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log("Sending ping");
        this.socket.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.error("WebSocket is not open. Cannot send data");
    }
  }

  sendMessage(content: string) {
    const data = {
      type: "send_message",
      content,
    };
    this.send(data);
  }

  sendTypingStatus(isTyping: boolean) {
    const data = {
      type: "typing",
      is_typing: isTyping,
    };
    this.send(data);
  }

  sendReadReceipt(messageId: number) {
    const data = {
      type: "read_receipt",
      message_id: messageId,
    };
    this.send(data);
  }

  on<T extends WebSocketEvent>(eventType: T["type"], callback: (data: any) => void): void {
    if (!this.callbacks[eventType]) {
      this.callbacks[eventType] = [];
    }
    this.callbacks[eventType].push(callback);
  }

  off<T extends WebSocketEvent>(eventType: T["type"], callback: (data: any) => void): void {
    if (this.callbacks[eventType]) {
      this.callbacks[eventType] = this.callbacks[eventType].filter((cb) => cb !== callback);
      if (this.callbacks[eventType].length === 0) {
        delete this.callbacks[eventType];
      }
    }
  }

  private handleSocketMessage(data: WebSocketEvent) {
    const eventType = data.type;

    if (this.callbacks[eventType]) {
      this.callbacks[eventType].forEach((callback) => callback(data));
    }
  }
}
