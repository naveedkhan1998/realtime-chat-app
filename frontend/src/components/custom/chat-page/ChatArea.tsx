import { useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
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
import { setNavbarVisibility } from "@/features/uiSlice";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ChatMessageItem from "./ChatMessageItem";

interface ChatAreaProps {
  user: UserProfile;
  activeChat: number;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
  chatRooms: ChatRoom[] | undefined;
  messagesLoading: boolean;
  messagesError: FetchBaseQueryError | SerializedError | undefined;
}

const newMessages: Message[] = [];

export default function ChatArea({ user, activeChat, setActiveChat, isMobile, chatRooms, messagesLoading, messagesError }: ChatAreaProps) {
  const dispatch = useAppDispatch();
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
    <div className="flex flex-col h-full bg-background" style={{ height: `calc(var(--vh, ${isMobile ? 1 : 0.9}vh) * 100)` }}>
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setActiveChat(undefined);
              dispatch(setNavbarVisibility(true));
            }}
            aria-label="Back to chat list"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex items-center">
          <Avatar className="w-10 h-10 mr-3 border-2 border-muted">
            <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} />
            <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{activeRoom?.name || otherParticipant.name}</h2>
            <p className="text-sm text-muted-foreground">
              {activeRoom?.participants.length} participant{activeRoom?.participants.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" aria-label="Start voice call">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Start video call">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="View participants" onClick={() => setIsParticipantsModalOpen(true)}>
            <Users className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Chat settings">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>
      <ScrollArea className="flex-1 p-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messagesError ? (
          <Card className="bg-destructive/10">
            <CardContent className="p-4 text-center text-destructive">
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
          <Card>
            <CardContent className="p-4">
              <p className="text-center text-muted-foreground">No messages yet. Start the conversation!</p>
            </CardContent>
          </Card>
        )}
      </ScrollArea>
      <form onSubmit={onSubmit} className="sticky bottom-0 p-4 border-t bg-background">
        <div className="flex space-x-2">
          <Input {...register("message")} placeholder="Type a message..." className="flex-1" autoComplete="off" />
          <Button type="submit" aria-label="Send message">
            <Send className="w-4 h-4 mr-2" />
            Send
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
