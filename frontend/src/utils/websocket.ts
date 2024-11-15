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

  private constructor() {} // Make the constructor private to enforce singleton pattern

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(chatRoomId: number, token: string) {
    const baseUrl = import.meta.env.VITE_BASE_API_URL
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socketUrl = `${protocol}://${baseUrl}/ws/chat/${chatRoomId}/?token=${token}`;

    this.socket = new WebSocket(socketUrl);

    this.socket.onopen = () => {
      console.log("WebSocket connected");
    };

    this.socket.onmessage = (event) => {
      const data: WebSocketEvent = JSON.parse(event.data);
      this.handleSocketMessage(data);
    };

    this.socket.onclose = () => {
      console.log("WebSocket disconnected");
      this.socket = null;
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
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
