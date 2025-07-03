/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/app/hooks";

import { useGetChatRoomsQuery, useGetMessagesQuery } from "@/services/chatApi";
import { WebSocketService } from "@/utils/websocket";
import { addMessage, setMessages } from "@/features/chatSlice";
import ChatWindow from "@/components/custom/ChatWindow";

interface ChatPageProps {
  activeChat: number | undefined;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
}

export default function ChatPage({ activeChat, setActiveChat, isMobile }: ChatPageProps) {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    const chatIdParam = searchParams.get("chatId");
    if (chatIdParam) {
      setActiveChat(parseInt(chatIdParam));
    }
  }, [searchParams, setActiveChat]);

  const { data: chatRooms } = useGetChatRoomsQuery(undefined, { pollingInterval: 10000 });

  const { data: messagesData, isLoading: messagesLoading, error: messagesError } = useGetMessagesQuery({ chat_room_id: activeChat! }, { skip: !activeChat, refetchOnMountOrArgChange: true });

  useEffect(() => {
    if (messagesData && activeChat) {
      dispatch(setMessages({ chatRoomId: activeChat, messages: messagesData }));
    }
  }, [messagesData, activeChat, dispatch]);

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
    <div className="h-full overflow-auto bg-gray-100 dark:bg-gray-900 ">
      {activeChat ? (
        <ChatWindow user={user} activeChat={activeChat} setActiveChat={setActiveChat} isMobile={isMobile} chatRooms={chatRooms} messagesLoading={messagesLoading} messagesError={messagesError} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Select a chat to start messaging.</p>
        </div>
      )}
    </div>
  );
}
