/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/app/hooks";

import { useGetChatRoomsQuery } from "@/services/chatApi";
import { WebSocketService } from "@/utils/websocket";
import { addMessage } from "@/features/chatSlice";
import ChatWindow from "@/components/custom/ChatWindow";
import { AppShellContext } from "@/layouts/AppShell";
import { MessageSquareMore } from "lucide-react";

export default function ChatPage() {
  const { activeChat, setActiveChat, isMobile } = useOutletContext<AppShellContext>();
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  const { data: chatRooms } = useGetChatRoomsQuery(undefined, { pollingInterval: 10000 });

  useEffect(() => {
    if (activeChat && accessToken) {
      const ws = WebSocketService.getInstance();
      ws.connect(activeChat, accessToken);

      const handleNewMessage = (data: any) => {
        dispatch(addMessage({ chatRoomId: activeChat, message: data.message }));
      };

      ws.on("chat_message", handleNewMessage);

      return () => {
        ws.off("chat_message", handleNewMessage);
        ws.disconnect();
      };
    }
  }, [activeChat, accessToken, dispatch]);

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 h-full">
      {activeChat ? (
        <ChatWindow user={user} activeChat={activeChat} setActiveChat={setActiveChat} isMobile={isMobile} chatRooms={chatRooms} />
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-10 text-center border border-dashed border-border bg-muted/40">
          <span className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-primary/10 text-primary">
            <MessageSquareMore className="w-6 h-6" />
          </span>
          <h2 className="text-xl font-semibold text-foreground">Pick a conversation to get started</h2>
          <p className="max-w-md mt-2 text-sm text-muted-foreground">
            Open an existing thread from the sidebar or create a new chat to see live messages stream in real time.
          </p>
        </div>
      )}
    </div>
  );
}
