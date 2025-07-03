import { useState } from "react";
import { useAppSelector } from "@/app/hooks";
import { useSearchUsersQuery } from "@/services/userApi";
import { useDebounce } from "@/utils/hooks";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, Loader2, MessageSquare } from "lucide-react";
import { useCreateChatRoomMutation } from "@/services/chatApi";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function NewChat() {
  const user = useAppSelector((state) => state.auth.user);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const navigate = useNavigate();

  const { data: searchResults, isLoading: searchLoading, error: searchError } = useSearchUsersQuery({ query: debouncedSearchQuery }, { skip: !debouncedSearchQuery });
  const [createChatRoom, { isLoading: creatingChatRoom }] = useCreateChatRoomMutation();

  const handleCreateChat = async (participantId: number) => {
    try {
      const selectedUser = searchResults?.find(u => u.id === participantId);
      if (!selectedUser) {
        toast({
          title: "Error",
          description: "Selected user not found.",
          variant: "destructive",
        });
        return;
      }
      const response = await createChatRoom({ participants: [user!, selectedUser] }).unwrap();
      toast({
        title: "Chat created",
        description: `Chat with ${searchResults?.find(u => u.id === participantId)?.name} started.`, 
      });
      navigate(`/chat?chatId=${response.id}`); // Navigate to the new chat
    } catch (error) {
      console.error("Failed to create chat room:", error);
      toast({
        title: "Error",
        description: "Failed to create chat room. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-grow overflow-y-auto p-4">
      <div className="w-full max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4">Start a New Chat</h2>
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users to start a chat..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          {searchLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : searchError ? (
            <p className="text-center text-red-500">Error searching users</p>
          ) : searchResults && searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.filter(u => u.id !== user?.id).map((searchUser) => (
                <div key={searchUser.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={searchUser.avatar} alt={searchUser.name} />
                      <AvatarFallback>{searchUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{searchUser.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCreateChat(searchUser.id)}
                    disabled={creatingChatRoom}
                  >
                    <MessageSquare className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            debouncedSearchQuery && <p className="text-center text-muted-foreground">No users found</p>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
