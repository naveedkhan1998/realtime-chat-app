import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Video, Users, Settings, ArrowLeft, Send, Loader2 } from "lucide-react";
import { Message, ChatRoom } from "@/services/chatApi";
import { WebSocketService } from "@/utils/websocket";
import { UserProfile } from "@/services/userApi";
import ChatMessageItem from "./ChatMessageItem";
import { useForm } from "react-hook-form";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { SerializedError } from "@reduxjs/toolkit";
import { setNavbarVisibility } from "@/features/uiSlice";

interface ChatAreaProps {
  user: UserProfile;
  activeChat: number;
  setActiveChat: (chatId: number | null) => void;
  isMobile: boolean;
  chatRooms: ChatRoom[] | undefined;
  messagesLoading: boolean;
  messagesError: FetchBaseQueryError | SerializedError | undefined;
}

export default function ChatArea({ user, activeChat, setActiveChat, isMobile, chatRooms, messagesLoading, messagesError }: ChatAreaProps) {
  const dispatch = useAppDispatch();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useAppSelector((state) => state.chat.messages[activeChat] || []);
  const { register, handleSubmit, reset } = useForm<{ message: string }>();

  const activeRoom = chatRooms?.find((chat) => chat.id === activeChat);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const onSubmit = handleSubmit(({ message }) => {
    if (message.trim() && activeChat) {
      const ws = WebSocketService.getInstance();
      ws.send({ type: "send_message", content: message });
      reset();
    }
  });

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 flex items-center justify-between p-3 bg-white border-b dark:bg-gray-800 dark:border-gray-700">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setActiveChat(null);
              dispatch(setNavbarVisibility(true));
            }}
            aria-label="Back to chat list"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex items-center">
          <Avatar className="w-10 h-10 mr-3 border-2 border-gray-200 dark:border-gray-700">
            <AvatarImage src={activeRoom?.participants[0].avatar} alt={activeRoom?.name} />
            <AvatarFallback>{activeRoom?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{activeRoom?.name || "Chat"}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{activeRoom?.participants.length} participants</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {["Phone", "Video", "Users", "Settings"].map((action) => (
            <Button key={action} variant="ghost" size="icon" aria-label={`${action} action`}>
              {action === "Phone" && <Phone className="w-5 h-5" />}
              {action === "Video" && <Video className="w-5 h-5" />}
              {action === "Users" && <Users className="w-5 h-5" />}
              {action === "Settings" && <Settings className="w-5 h-5" />}
            </Button>
          ))}
        </div>
      </header>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : messagesError ? (
            <Card className="bg-red-50 dark:bg-red-900">
              <CardContent className="p-4 text-center text-red-600 dark:text-red-100">
                Error loading messages: {messagesError && "data" in messagesError ? (messagesError.data as string) : "An error occurred"}
              </CardContent>
            </Card>
          ) : messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg: Message) => (
                <ChatMessageItem key={msg.id} message={msg} isOwnMessage={msg.sender.id === user.id} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <Card className="h-full bg-white dark:bg-gray-800">
              <CardContent className="flex items-center justify-center h-full">
                <p className="text-center text-gray-500 dark:text-gray-400">No messages yet. Start the conversation!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
      <form onSubmit={onSubmit} className="p-3 bg-white border-t dark:bg-gray-800 dark:border-gray-700">
        <div className="flex space-x-2">
          <Input {...register("message")} placeholder="Type a message..." className="flex-1" autoComplete="off" />
          <Button type="submit" aria-label="Send message">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
