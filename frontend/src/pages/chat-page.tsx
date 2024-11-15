/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useGetChatRoomsQuery, useGetMessagesQuery } from "@/services/chatApi";
import { WebSocketService } from "@/utils/websocket";
import { addMessage, setMessages } from "@/features/chatSlice";
import ChatArea from "@/components/custom/chat-page/ChatArea";
import ChatSidebar from "@/components/custom/chat-page/ChatSidebar";

export default function ChatPage() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { data: chatRooms, isLoading: chatRoomsLoading, error: chatRoomsError } = useGetChatRoomsQuery();

  const { data: messagesData, isLoading: messagesLoading, error: messagesError, refetch: refetchMessages } = useGetMessagesQuery({ chat_room_id: activeChat! }, { skip: !activeChat });

  useEffect(() => {
    if (messagesData && activeChat) {
      refetchMessages();
      dispatch(setMessages({ chatRoomId: activeChat, messages: messagesData }));
    }
  }, [messagesData, activeChat, dispatch, refetchMessages]);

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
    <div className="h-[95dvh] bg-gray-100 dark:bg-gray-900">
      {isMobile ? (
        activeChat ? (
          <ChatArea user={user} activeChat={activeChat} setActiveChat={setActiveChat} isMobile={isMobile} chatRooms={chatRooms} messagesLoading={messagesLoading} messagesError={messagesError} />
        ) : (
          <ChatSidebar user={user} activeChat={activeChat} setActiveChat={setActiveChat} chatRooms={chatRooms} chatRoomsLoading={chatRoomsLoading} chatRoomsError={chatRoomsError} />
        )
      ) : (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <ChatSidebar user={user} activeChat={activeChat} setActiveChat={setActiveChat} chatRooms={chatRooms} chatRoomsLoading={chatRoomsLoading} chatRoomsError={chatRoomsError} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel>
            {activeChat ? (
              <ChatArea user={user} activeChat={activeChat} setActiveChat={setActiveChat} isMobile={isMobile} chatRooms={chatRooms} messagesLoading={messagesLoading} messagesError={messagesError} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Select a chat to start messaging.</p>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
