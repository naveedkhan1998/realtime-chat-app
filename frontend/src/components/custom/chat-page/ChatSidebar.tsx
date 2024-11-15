/* eslint-disable @typescript-eslint/no-explicit-any */

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle } from "lucide-react";
import { ChatRoom } from "@/services/chatApi";
import { UserProfile } from "@/services/userApi";

interface SidebarProps {
  user: UserProfile;
  activeChat: number | null;
  setActiveChat: (chatId: number | null) => void;
  chatRooms: ChatRoom[] | undefined;
  chatRoomsLoading: boolean;
  chatRoomsError: any;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeChat, setActiveChat, chatRooms, chatRoomsLoading, chatRoomsError }) => {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="p-4">
        {/* User Info */}
        <div className="flex items-center mb-6 space-x-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{user.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
        </div>
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input placeholder="Search chats" className="pl-8" />
        </div>
        {/* New Chat Button */}
        <Button className="w-full mb-4">
          <PlusCircle className="w-4 h-4 mr-2" /> New Chat
        </Button>
      </div>
      {/* Chat List */}
      <ScrollArea className="flex-1">
        {chatRoomsLoading ? (
          <p className="p-4">Loading chats...</p>
        ) : chatRoomsError ? (
          <p className="p-4 text-red-500">Error loading chats</p>
        ) : (
          <div className="p-2 space-y-2">
            {chatRooms?.map((chat) => {
              const otherParticipant = chat.participants.find((p) => p.id !== user.id) || user;
              return (
                <Button key={chat.id} variant={activeChat === chat.id ? "secondary" : "ghost"} className="justify-start w-full px-2 py-6" onClick={() => setActiveChat(chat.id)}>
                  <Avatar className="w-10 h-10 mr-3">
                    <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} />
                    <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="flex justify-between">
                      <span className="font-medium">{chat.name || otherParticipant.name}</span>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default Sidebar;
