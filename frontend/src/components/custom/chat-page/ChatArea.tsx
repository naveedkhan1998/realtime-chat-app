/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/app/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Video, Users, Settings, ArrowLeft, Send } from "lucide-react";
import { Message, ChatRoom } from "@/services/chatApi";
import { WebSocketService } from "@/utils/websocket";
import { UserProfile } from "@/services/userApi";
import MessageItem from "./ChatMessageItem";

interface ChatAreaProps {
  user: UserProfile;
  activeChat: number;
  setActiveChat: (chatId: number | null) => void;
  isMobile: boolean;
  chatRooms: ChatRoom[] | undefined;
  messagesLoading: boolean;
  messagesError: any;
}

const emptyArray: Message[] = [];

const ChatArea: React.FC<ChatAreaProps> = ({ user, activeChat, setActiveChat, isMobile, chatRooms, messagesLoading, messagesError }) => {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useAppSelector((state) => state.chat.messages[activeChat] || emptyArray);

  // Scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView();
    };
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim() && activeChat) {
      const ws = WebSocketService.getInstance();
      ws.send({ type: "send_message", content: message });
      setMessage("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky z-10 flex items-center justify-between p-4 bg-white border-b md:top-0 top-16 dark:bg-gray-800 dark:border-gray-700">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex items-center">
          <Avatar className="w-8 h-8 mr-2">
            <AvatarImage src={chatRooms?.find((chat) => chat.id === activeChat)?.participants[0].avatar} alt="" />
            <AvatarFallback>{chatRooms?.find((chat) => chat.id === activeChat)?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-semibold">{chatRooms?.find((chat) => chat.id === activeChat)?.name || "Chat"}</h2>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Users className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messagesLoading ? (
          <p>Loading messages...</p>
        ) : messagesError ? (
          <p className="text-red-500">Error loading messages</p>
        ) : messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((msg: Message) => (
              <MessageItem key={msg.id} message={msg} isOwnMessage={msg.sender.id === user.id} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <Card className="h-full">
            <CardContent className="flex items-center justify-center h-full">
              <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
            </CardContent>
          </Card>
        )}
      </ScrollArea>
      {/* Message Input */}
      <div className="sticky bottom-0 p-4 bg-white border-t dark:bg-gray-800 dark:border-gray-700">
        <div className="flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              //   const ws = WebSocketService.getInstance();
              //   ws.send({
              //     type: "typing",
              //     is_typing: e.target.value.length > 0,
              //   });
            }}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSendMessage();
              }
            }}
            className="flex-1"
            autoFocus
          />
          <Button onClick={handleSendMessage}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
