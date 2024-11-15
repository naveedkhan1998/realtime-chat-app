import React, { useState } from "react";
import { useAppSelector } from "@/app/hooks";
import { useGetFriendshipsQuery, useGetFriendRequestsQuery, useSendFriendRequestMutation, useAcceptFriendRequestMutation, useDeclineFriendRequestMutation } from "@/services/chatApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable";
import { Search, UserPlus, Check, X } from "lucide-react";
import { useDebounce } from "@/utils/hooks";
import { useSearchUsersQuery } from "@/services/userApi";

const Friends: React.FC = () => {
  const user = useAppSelector((state) => state.auth.user);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Fetch friendships
  const { data: friendships, isLoading: friendshipsLoading, error: friendshipsError } = useGetFriendshipsQuery();

  // Fetch received friend requests
  const { data: receivedRequests, isLoading: receivedRequestsLoading, error: receivedRequestsError } = useGetFriendRequestsQuery();

  // Send friend request mutation
  const [sendFriendRequest, { isLoading: sendingRequest }] = useSendFriendRequestMutation();

  // Accept friend request mutation
  const [acceptFriendRequest, { isLoading: acceptingRequest }] = useAcceptFriendRequestMutation();

  // Decline friend request mutation
  const [declineFriendRequest, { isLoading: decliningRequest }] = useDeclineFriendRequestMutation();

  // Fetch users for sending friend requests
  const { data: searchResults, isLoading: searchLoading, error: searchError } = useSearchUsersQuery({ query: debouncedSearchQuery }, { skip: !debouncedSearchQuery });

  const handleSendFriendRequest = async (toUserId: number) => {
    try {
      await sendFriendRequest({ to_user_id: toUserId }).unwrap();
      alert("Friend request sent");
    } catch (error) {
      console.error("Failed to send friend request:", error);
    }
  };

  const handleAcceptFriendRequest = async (requestId: number) => {
    try {
      await acceptFriendRequest({ id: requestId }).unwrap();
      alert("Friend request accepted");
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    }
  };

  const handleDeclineFriendRequest = async (requestId: number) => {
    try {
      await declineFriendRequest({ id: requestId }).unwrap();
      alert("Friend request declined");
    } catch (error) {
      console.error("Failed to decline friend request:", error);
    }
  };

  const Sidebar: React.FC = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="p-4">
        {/* User Info */}
        <div className="flex items-center mb-6 space-x-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{user?.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>

        {/* Search Users */}
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input placeholder="Search users" className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Search Results */}
        <ScrollArea className="flex-1">
          {searchLoading ? (
            <p>Searching...</p>
          ) : searchError ? (
            <p>Error searching users</p>
          ) : searchResults && searchResults?.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((searchUser) => (
                <div key={searchUser.id} className="flex items-center justify-between p-2">
                  <div className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={searchUser.avatar} alt={searchUser.name} />
                      <AvatarFallback>{searchUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>{searchUser.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleSendFriendRequest(searchUser.id)} disabled={sendingRequest}>
                    <UserPlus className="w-5 h-5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            debouncedSearchQuery && <p>No users found</p>
          )}
        </ScrollArea>
      </div>
    </div>
  );

  const MainContent: React.FC = () => (
    <div className="flex flex-col h-full p-4">
      {/* Incoming Friend Requests */}
      <h2 className="mb-4 text-2xl font-semibold">Friend Requests</h2>
      {receivedRequestsLoading ? (
        <p>Loading friend requests...</p>
      ) : receivedRequestsError ? (
        <p>Error loading friend requests</p>
      ) : receivedRequests && receivedRequests?.length > 0 ? (
        <div className="space-y-4">
          {receivedRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={request.from_user.avatar} alt={request.from_user.name} />
                  <AvatarFallback>{request.from_user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{request.from_user.name}</span>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" size="icon" onClick={() => handleAcceptFriendRequest(request.id)} disabled={acceptingRequest}>
                  <Check className="w-5 h-5 text-green-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeclineFriendRequest(request.id)} disabled={decliningRequest}>
                  <X className="w-5 h-5 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>No friend requests</p>
      )}

      {/* Friends List */}
      <h2 className="mt-8 mb-4 text-2xl font-semibold">Your Friends</h2>
      {friendshipsLoading ? (
        <p>Loading friends...</p>
      ) : friendshipsError ? (
        <p>Error loading friends</p>
      ) : friendships && friendships?.length > 0 ? (
        <div className="space-y-4">
          {friendships.map((friendship) =>
            friendship.users
              .filter((friend) => friend.id !== user?.id)
              .map((friend) => (
                <div key={friend.id} className="flex items-center p-2 border rounded">
                  <Avatar className="w-8 h-8 mr-2">
                    <AvatarImage src={friend.avatar} alt={friend.name} />
                    <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span>{friend.name}</span>
                </div>
              ))
          )}
        </div>
      ) : (
        <p>You have no friends yet.</p>
      )}
    </div>
  );

  return (
    <div className="h-full bg-gray-100 dark:bg-gray-900">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <Sidebar />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>
          <MainContent />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default Friends;
