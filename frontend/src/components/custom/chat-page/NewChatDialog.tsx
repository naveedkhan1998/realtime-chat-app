import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { Friendship, useCreateChatRoomMutation, useGetFriendshipsQuery } from "@/services/chatApi";
import { useAppSelector } from "@/app/hooks";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";

const NewChatDialog: React.FC = () => {
  const { data: friendships, isLoading } = useGetFriendshipsQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState(""); // State for group name
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);
  const [createChatRoom] = useCreateChatRoomMutation(); // Mutation hook for creating a chat room
  const navigate = useNavigate();

  const currentUser = useAppSelector((state) => state.auth.user);

  // Filter the friendships to exclude the current user and match the search query
  const filteredFriends = friendships
    ?.flatMap((friendship: Friendship) => friendship.users.filter((user) => user.id !== currentUser?.id))
    .filter((user) => user && user.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleFriendSelect = (friendId: number) => {
    if (isGroup) {
      if (selectedFriends.includes(friendId)) {
        setSelectedFriends((prev) => prev.filter((id) => id !== friendId));
      } else {
        setSelectedFriends((prev) => [...prev, friendId]);
      }
    } else {
      setSelectedFriends([friendId]);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: isGroup ? groupName : "",
        is_group_chat: isGroup,
        participants: selectedFriends,
      };
      //@ts-expect-error - The response type is not defined in the createChatRoom mutation
      const response = await createChatRoom(payload);
      console.log("Chat Room Created:", response);
      // Reset state after successful creation
      setSearchQuery("");
      setIsGroup(false);
      setGroupName("");
      setSelectedFriends([]);
    } catch (error) {
      console.error("Error creating chat room:", error);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full mb-4">
          <PlusCircle className="w-4 h-4 mr-2" /> New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-md p-4">
        <DialogTitle className="text-lg font-semibold">Start a New Chat</DialogTitle>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span>Create a Group?</span>
            <Switch
              checked={isGroup}
              onCheckedChange={(checked) => {
                setIsGroup(checked);
                if (!checked) setGroupName(""); // Reset group name if group toggle is turned off
              }}
            />
          </div>
          {isGroup && <Input placeholder="Enter group name" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mb-2" />}
          <Input placeholder="Search friends" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
        </div>
        <ScrollArea className="h-64">
          {isLoading ? (
            <p>Loading friends...</p>
          ) : (
            <div className="space-y-2">
              {filteredFriends?.map((friend) => (
                <div
                  key={friend?.id}
                  className={`flex items-center p-2 rounded-md cursor-pointer ${friend && selectedFriends.includes(friend.id) ? "bg-gray-200" : ""}`}
                  onClick={() => friend && handleFriendSelect(friend.id)}
                >
                  <Avatar className="w-8 h-8 mr-3">
                    <AvatarImage src={friend?.avatar} alt={friend?.name} />
                    <AvatarFallback>{friend?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{friend?.name}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <Button onClick={() => navigate("/friends")}>Add Friends</Button>
        <DialogClose asChild>
          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={isGroup && !groupName} // Disable button if group name is empty for group chats
          >
            Start Chat
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;
