import React, { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
import { Friendship, useGetFriendshipsQuery } from "@/services/chatApi";
import { useAppSelector } from "@/app/hooks";
import { DialogTitle } from "@radix-ui/react-dialog";
import { Switch } from "@/components/ui/switch";

const NewChatDialog: React.FC = () => {
  const { data: friendships, isLoading } = useGetFriendshipsQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<number[]>([]);

  // Filter the friendships to exclude the current user and match the search query
  const currentUser = useAppSelector((state) => state.auth.user);
  const filteredFriends = friendships
    ?.map((friendship: Friendship) => {
      const otherUser = friendship.users.find((user) => user.id !== currentUser?.id);
      return otherUser;
    })
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

  const handleSubmit = () => {
    console.log("Selected Friends:", selectedFriends);
    // Trigger chat or group creation logic here
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
            <Switch checked={isGroup} onCheckedChange={(checked) => setIsGroup(checked)} />
          </div>
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
        <Button onClick={handleSubmit} className="w-full mt-4">
          Start Chat
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;
