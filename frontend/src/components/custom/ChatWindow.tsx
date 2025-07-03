import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/app/hooks";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Video, Users, Settings, ArrowLeft, Send, Loader2 } from "lucide-react";
import { Message, ChatRoom, User } from "@/services/chatApi";
import { WebSocketService } from "@/utils/websocket";
import { UserProfile } from "@/services/userApi";
import { useForm } from "react-hook-form";
import { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { SerializedError } from "@reduxjs/toolkit";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import MessageBubble from "./MessageBubble";

interface ChatWindowProps {
  user: UserProfile;
  activeChat: number;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
  chatRooms: ChatRoom[] | undefined;
  messagesLoading: boolean;
  messagesError: FetchBaseQueryError | SerializedError | undefined;
}

const newMessages: Message[] = [];

export default function ChatWindow({ user, activeChat, setActiveChat, isMobile, chatRooms, messagesLoading, messagesError }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messages = useAppSelector((state) => state.chat.messages[activeChat] || newMessages);
  const { register, handleSubmit, reset } = useForm<{ message: string }>();
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);

  const activeRoom = chatRooms?.find((chat) => chat.id === activeChat);
  const otherParticipant = activeRoom?.participants.find((p) => p.id !== user.id) || user;

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
    <div className="flex flex-col flex-grow bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-md dark:border-gray-700 dark:bg-gray-800">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveChat(undefined)}
            aria-label="Back to chat list"
            className="mr-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex items-center flex-grow">
          <Avatar className="w-10 h-10 mr-3 border-2 border-blue-500">
            <AvatarImage src={activeRoom?.is_group_chat ? "" : otherParticipant.avatar} alt={activeRoom?.name || otherParticipant.name} />
            <AvatarFallback className="text-white bg-blue-500">{(activeRoom?.is_group_chat ? activeRoom.name : otherParticipant.name)?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeRoom?.name || otherParticipant.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {activeRoom?.participants.length} participant{activeRoom?.participants.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" aria-label="Start voice call" className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Start video call" className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Video className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="View participants"
            onClick={() => setIsParticipantsModalOpen(true)}
            className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Users className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Chat settings" className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>
      <ScrollArea className="flex-1 p-4 space-y-4 overflow-y-auto min-h-[calc(100dvh-9.5rem)]">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : messagesError ? (
          <Card className="text-red-700 bg-red-100 border-red-400 dark:bg-red-900 dark:border-red-700 dark:text-red-300">
            <CardContent className="p-4 text-center">Error loading messages: {messagesError && "data" in messagesError ? (messagesError.data as string) : "An error occurred"}</CardContent>
          </Card>
        ) : messages.length > 0 ? (
          messages.map((msg: Message) => <MessageBubble key={msg.id} message={msg} isSent={msg.sender.id === user.id} />)
        ) : (
          <Card className="flex items-center justify-center bg-white border h-[calc(100dvh-12.5rem)] border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <CardContent className="p-4 text-center text-gray-500 dark:text-gray-400">
              <p>No messages yet. Start the conversation!</p>
            </CardContent>
          </Card>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>
      <form onSubmit={onSubmit} className="sticky bottom-0 p-4 bg-white border-t border-gray-200 shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <Input
            {...register("message")}
            placeholder="Type your message..."
            className="flex-1 px-5 py-3 text-gray-900 transition-all duration-200 bg-gray-100 border border-gray-300 rounded-full dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            autoComplete="off"
          />
          <Button type="submit" aria-label="Send message" className="p-3 text-white transition-colors duration-200 bg-blue-500 rounded-full hover:bg-blue-600">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </form>
      <ParticipantsModal isOpen={isParticipantsModalOpen} onClose={() => setIsParticipantsModalOpen(false)} participants={activeRoom?.participants || []} />
    </div>
  );
}

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: User[];
}

function ParticipantsModal({ isOpen, onClose, participants }: ParticipantsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Participants</DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {participants.map((participant) => (
            <div key={participant.id} className="flex items-center space-x-4">
              <Avatar>
                <AvatarImage src={participant.avatar} alt={participant.name} />
                <AvatarFallback>{participant.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{participant.name}</p>
                <p className="text-sm text-muted-foreground">{participant.email}</p>
              </div>
              <Badge variant="secondary">Member</Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
