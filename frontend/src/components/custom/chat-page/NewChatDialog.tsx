"use client";

import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, UserPlus, Search, Users, MessageCircle } from "lucide-react";
import { Friendship, useCreateChatRoomMutation, useGetFriendshipsQuery, User } from "@/services/chatApi";
import { useAppSelector } from "@/app/hooks";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const NewChatDialog: React.FC = () => {
  const { data: friendships, isLoading } = useGetFriendshipsQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [createChatRoom] = useCreateChatRoomMutation();
  const navigate = useNavigate();

  const currentUser = useAppSelector((state) => state.auth.user);

  const filteredFriends = friendships
    ?.flatMap((friendship: Friendship) => [friendship.user1, friendship.user2].filter((user) => user.id !== currentUser?.id))
    .filter((user) => user && user.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleFriendSelect = (friendId: number) => {
    if (isGroup) {
      setSelectedFriendIds((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]));
    } else {
      setSelectedFriendIds([friendId]);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: isGroup ? groupName : "",
        is_group_chat: isGroup,
        participants: selectedFriendIds,
      };
      //@ts-expect-error ignore
      const response = await createChatRoom(payload);
      console.log("Chat Room Created:", response);
      // Reset state after successful creation
      setSearchQuery("");
      setIsGroup(false);
      setGroupName("");
      setSelectedFriendIds([]);
    } catch (error) {
      console.error("Error creating chat room:", error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full mb-4 text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
          <PlusCircle className="w-4 h-4 mr-2" /> New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a New Chat</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="direct" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct">
              <MessageCircle className="w-4 h-4 mr-2" />
              Direct
            </TabsTrigger>
            <TabsTrigger value="group">
              <Users className="w-4 h-4 mr-2" />
              Group
            </TabsTrigger>
          </TabsList>
          <TabsContent value="direct" className="space-y-4">
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <Input placeholder="Search friends" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <FriendList friends={filteredFriends || []} selectedFriendIds={selectedFriendIds} onFriendSelect={handleFriendSelect} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="group" className="space-y-4">
            <Input placeholder="Enter group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
            <div className="relative">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <Input placeholder="Search friends" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <FriendList friends={filteredFriends || []} selectedFriendIds={selectedFriendIds} onFriendSelect={handleFriendSelect} isLoading={isLoading} isGroup />
          </TabsContent>
        </Tabs>
        <div className="flex justify-between mt-4">
          <Button variant="outline" onClick={() => navigate("/friends")}>
            <UserPlus className="w-4 h-4 mr-2" /> Add Friends
          </Button>
          <DialogClose asChild>
            <Button onClick={handleSubmit} disabled={(isGroup && !groupName) || selectedFriendIds.length === 0}>
              Start Chat
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface FriendListProps {
  friends: User[];
  selectedFriendIds: number[];
  onFriendSelect: (friendId: number) => void;
  isLoading: boolean;
  isGroup?: boolean;
}

const FriendList: React.FC<FriendListProps> = ({ friends, selectedFriendIds, onFriendSelect, isLoading, isGroup = false }) => {
  return (
    <ScrollArea className="h-[300px] rounded-md border p-4">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-b-2 border-gray-900 rounded-full animate-spin"></div>
        </div>
      ) : (
        <AnimatePresence>
          {friends?.map((friend) => (
            <motion.div
              key={friend?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center p-2 rounded-md cursor-pointer transition-all ${
                friend && selectedFriendIds.includes(friend.id) ? "bg-blue-100 dark:bg-blue-800" : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => friend && onFriendSelect(friend.id)}
            >
              <Avatar className="w-10 h-10 mr-3">
                <AvatarImage src={friend?.avatar} alt={friend?.name} />
                <AvatarFallback>{friend?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <span className="flex-grow">{friend?.name}</span>
              {isGroup && (
                <div className={`w-5 h-5 rounded-full border-2 ${selectedFriendIds.includes(friend?.id) ? "bg-blue-500 border-blue-500" : "border-gray-300"}`}>
                  {selectedFriendIds.includes(friend?.id) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-full h-full text-white"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </ScrollArea>
  );
};

export default NewChatDialog;
