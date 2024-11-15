import { useState } from "react";
import { useAppSelector } from "@/app/hooks";
import { useGetFriendshipsQuery, useGetFriendRequestsQuery, useSendFriendRequestMutation, useAcceptFriendRequestMutation, useDeclineFriendRequestMutation } from "@/services/chatApi";
import { useSearchUsersQuery } from "@/services/userApi";
import { useDebounce } from "@/utils/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, UserPlus, Check, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Friends() {
  const user = useAppSelector((state) => state.auth.user);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const { data: friendships, isLoading: friendshipsLoading, error: friendshipsError, refetch: refetchFriendships } = useGetFriendshipsQuery(undefined, { pollingInterval: 10000 });

  const {
    data: receivedRequests,
    isLoading: receivedRequestsLoading,
    error: receivedRequestsError,
    refetch: refetchReceivedRequests,
  } = useGetFriendRequestsQuery(undefined, { pollingInterval: 10000 });

  const filteredRequests = receivedRequests?.filter((request) => request.status === "pending");

  const [sendFriendRequest, { isLoading: sendingRequest }] = useSendFriendRequestMutation();
  const [acceptFriendRequest, { isLoading: acceptingRequest }] = useAcceptFriendRequestMutation();
  const [declineFriendRequest, { isLoading: decliningRequest }] = useDeclineFriendRequestMutation();

  const { data: searchResults, isLoading: searchLoading, error: searchError } = useSearchUsersQuery({ query: debouncedSearchQuery }, { skip: !debouncedSearchQuery });

  const handleSendFriendRequest = async (toUserId: number) => {
    try {
      await sendFriendRequest({ to_user_id: toUserId }).unwrap();
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully.",
      });
    } catch (error) {
      console.error("Failed to send friend request:", error);
    }
  };

  const handleAcceptFriendRequest = async (requestId: number) => {
    try {
      await acceptFriendRequest({ id: requestId }).unwrap();
      toast({
        title: "Friend request accepted",
        description: "You are now friends!",
      });
      refetchFriendships();
      refetchReceivedRequests();
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    }
  };

  const handleDeclineFriendRequest = async (requestId: number) => {
    try {
      await declineFriendRequest({ id: requestId }).unwrap();
      toast({
        title: "Friend request declined",
        description: "The friend request has been declined.",
      });
      refetchReceivedRequests();
    } catch (error) {
      console.error("Failed to decline friend request:", error);
    }
  };

  return (
    <div className="container p-4 mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Friends</CardTitle>
          <CardDescription>Manage your friends and friend requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="add">Add Friends</TabsTrigger>
            </TabsList>
            <TabsContent value="friends">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                {friendshipsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : friendshipsError ? (
                  <p className="text-center text-red-500">Error loading friends</p>
                ) : friendships && friendships.length > 0 ? (
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
                  <p className="text-center">You have no friends yet.</p>
                )}
              </ScrollArea>
            </TabsContent>
            <TabsContent value="requests">
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                {receivedRequestsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : receivedRequestsError ? (
                  <p className="text-center text-red-500">Error loading friend requests</p>
                ) : filteredRequests && filteredRequests.length > 0 ? (
                  <div className="space-y-4">
                    {filteredRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={request.from_user.avatar} alt={request.from_user.name} />
                            <AvatarFallback>{request.from_user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{request.from_user.name}</span>
                        </div>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleAcceptFriendRequest(request.id)} disabled={acceptingRequest || request.status !== "pending"}>
                            <Check className="w-5 h-5 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeclineFriendRequest(request.id)} disabled={decliningRequest || request.status !== "pending"}>
                            <X className="w-5 h-5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center">No pending friend requests</p>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="add">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search users" className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <ScrollArea className="h-[350px] w-full rounded-md border p-4">
                  {searchLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : searchError ? (
                    <p className="text-center text-red-500">Error searching users</p>
                  ) : searchResults && searchResults.length > 0 ? (
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
                    debouncedSearchQuery && <p className="text-center">No users found</p>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
