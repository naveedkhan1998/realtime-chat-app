/* eslint-disable @typescript-eslint/no-explicit-any */
export class WebSocketService {
  private static instance: WebSocketService;
  private socket: WebSocket | null = null;
  private callbacks: { [key: string]: (data: any) => void } = {};

  static getInstance() {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(chatRoomId: number, token: string) {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socketUrl = `${protocol}://${window.location.host}/ws/chat/${chatRoomId}/?token=${token}`;

    this.socket = new WebSocket(socketUrl);

    this.socket.onopen = () => {
      console.log("WebSocket connected");
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleSocketMessage(data);
    };

    this.socket.onclose = () => {
      console.log("WebSocket disconnected");
      this.socket = null;
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

  on(eventType: string, callback: (data: any) => void) {
    this.callbacks[eventType] = callback;
  }

  off(eventType: string) {
    delete this.callbacks[eventType];
  }

  private handleSocketMessage(data: any) {
    const eventType = data.type;
    if (this.callbacks[eventType]) {
      this.callbacks[eventType](data);
    }
  }
}
