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
import { Search, UserPlus, Check, X, Loader2, UserX } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

export default function Friends() {
  const user = useAppSelector((state) => state.auth.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [friendFilter, setFriendFilter] = useState("all");
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
      toast({
        title: "Error",
        description: "Failed to send friend request. Please try again.",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to accept friend request. Please try again.",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: "Failed to decline friend request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredFriends = friendships?.flatMap((friendship) => {
    const friends = [friendship.user1, friendship.user2].filter((friend) => friend.id !== user?.id);
    return friends.filter((friend) => {
      if (friendFilter === "all") return true;
      return friend.name.toLowerCase().includes(friendFilter.toLowerCase());
    });
  });

  return (
    <div className="container p-4 mx-auto space-y-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Friends</CardTitle>
          <CardDescription>Manage your friends and friend requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="friends" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="requests">
                Requests
                {filteredRequests && filteredRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {filteredRequests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="add">Add Friends</TabsTrigger>
            </TabsList>
            <TabsContent value="friends">
              <div className="flex items-center mb-4 space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input placeholder="Filter friends" value={friendFilter} onChange={(e) => setFriendFilter(e.target.value)} className="flex-grow" />
              </div>
              <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                {friendshipsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : friendshipsError ? (
                  <p className="text-center text-red-500">Error loading friends</p>
                ) : filteredFriends && filteredFriends.length > 0 ? (
                  <div className="space-y-4">
                    {filteredFriends.map((friend) => (
                      <div key={friend.id} className="flex items-center justify-between p-3 transition-colors rounded-lg bg-muted hover:bg-muted/80">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={friend.avatar} alt={friend.name} />
                            <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{friend.name}</p>
                            <p className="text-sm text-muted-foreground">Online</p>
                          </div>
                        </div>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <UserX className="w-5 h-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Remove friend</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">You have no friends yet.</p>
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
                      <div key={request.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={request.from_user.avatar} alt={request.from_user.name} />
                            <AvatarFallback>{request.from_user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{request.from_user.name}</span>
                        </div>
                        <div className="flex space-x-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => handleAcceptFriendRequest(request.id)} disabled={acceptingRequest || request.status !== "pending"}>
                                  <Check className="w-5 h-5 text-green-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Accept request</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => handleDeclineFriendRequest(request.id)} disabled={decliningRequest || request.status !== "pending"}>
                                  <X className="w-5 h-5 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Decline request</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">No pending friend requests</p>
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
                    <div className="space-y-3">
                      {searchResults.map((searchUser) => (
                        <div key={searchUser.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={searchUser.avatar} alt={searchUser.name} />
                              <AvatarFallback>{searchUser.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{searchUser.name}</span>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="icon" onClick={() => handleSendFriendRequest(searchUser.id)} disabled={sendingRequest}>
                                  <UserPlus className="w-5 h-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Send friend request</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ))}
                    </div>
                  ) : (
                    debouncedSearchQuery && <p className="text-center text-muted-foreground">No users found</p>
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
