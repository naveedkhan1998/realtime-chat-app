import { type ReactNode, useState } from "react";
import { useAppSelector } from "@/app/hooks";
import { useGetFriendshipsQuery, useGetFriendRequestsQuery, useSendFriendRequestMutation, useAcceptFriendRequestMutation, useDeclineFriendRequestMutation } from "@/services/chatApi";
import { useSearchUsersQuery } from "@/services/userApi";
import { useDebounce } from "@/utils/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, UserPlus, Check, X, Loader2, UserX, Sparkles, Users2, Shield, Filter, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

  const [sendFriendRequest, { isLoading: sendingRequest }] = useSendFriendRequestMutation();
  const [acceptFriendRequest, { isLoading: acceptingRequest }] = useAcceptFriendRequestMutation();
  const [declineFriendRequest, { isLoading: decliningRequest }] = useDeclineFriendRequestMutation();
  const { data: searchResults, isLoading: searchLoading, error: searchError } = useSearchUsersQuery({ query: debouncedSearchQuery }, { skip: !debouncedSearchQuery });

  const filteredRequests = receivedRequests?.filter((request) => request.status === "pending");

  const filteredFriends = friendships?.flatMap((friendship) => {
    const connections = [friendship.user1, friendship.user2].filter((connection) => connection.id !== user?.id);
    return connections.filter((connection) => {
      if (friendFilter === "all") return true;
      return connection.name.toLowerCase().includes(friendFilter.toLowerCase());
    });
  });

  const totalFriends = filteredFriends?.length ?? 0;
  const pendingCount = filteredRequests?.length ?? 0;

  const handleSendFriendRequest = async (toUserId: number) => {
    try {
      await sendFriendRequest({ to_user_id: toUserId }).unwrap();
      toast({ title: "Request sent", description: "They'll receive your invite in their activity feed." });
    } catch (error) {
      console.error("Failed to send friend request:", error);
      toast({ title: "Error", description: "We couldn't send that invite. Give it another go.", variant: "destructive" });
    }
  };

  const handleAcceptFriendRequest = async (requestId: number) => {
    try {
      await acceptFriendRequest({ id: requestId }).unwrap();
      toast({ title: "Connection confirmed", description: "You're now connected and can start collaborating." });
      refetchFriendships();
      refetchReceivedRequests();
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      toast({ title: "Error", description: "We couldn't accept that invite. Try again shortly.", variant: "destructive" });
    }
  };

  const handleDeclineFriendRequest = async (requestId: number) => {
    try {
      await declineFriendRequest({ id: requestId }).unwrap();
      toast({ title: "Invite dismissed", description: "The requester has been notified." });
      refetchReceivedRequests();
    } catch (error) {
      console.error("Failed to decline friend request:", error);
      toast({ title: "Error", description: "We couldn't remove that invite. Try again shortly.", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full flex-col gap-6 p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Connections</h1>
        <p className="text-muted-foreground">Manage your network and discover new teammates.</p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="friends" className="flex-1 flex flex-col gap-6 overflow-hidden">
        <div className="flex items-center justify-between">
          <TabsList className="bg-muted/50 p-1 rounded-xl border border-white/5">
            <TabsTrigger value="friends" className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Friends <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary hover:bg-primary/20">{totalFriends}</Badge>
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Requests 
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-[10px]">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="discover" className="rounded-lg px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Discover
            </TabsTrigger>
          </TabsList>

          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Filter connections..." 
              value={friendFilter}
              onChange={(e) => setFriendFilter(e.target.value)}
              className="pl-9 bg-background/50 border-white/10 rounded-xl focus:bg-background transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <TabsContent value="friends" className="mt-0 h-full">
            {friendshipsLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : filteredFriends && filteredFriends.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredFriends.map((friend) => (
                  <FriendCard
                    key={friend.id}
                    user={friend}
                    action={
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                              <UserX className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove friend</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState 
                icon={Users2}
                title="No friends yet"
                description="Start building your network by inviting people from the Discover tab."
              />
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-0 h-full">
            {receivedRequestsLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : filteredRequests && filteredRequests.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    user={request.from_user}
                    onAccept={() => handleAcceptFriendRequest(request.id)}
                    onDecline={() => handleDeclineFriendRequest(request.id)}
                    isProcessing={acceptingRequest || decliningRequest}
                  />
                ))}
              </div>
            ) : (
              <EmptyState 
                icon={Shield}
                title="No pending requests"
                description="You're all caught up! Check back later for new invites."
              />
            )}
          </TabsContent>

          <TabsContent value="discover" className="mt-0 h-full space-y-6">
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search for people by name or email..."
                  className="h-12 pl-12 text-lg bg-background/50 border-white/10 rounded-2xl shadow-lg focus:ring-primary/20 transition-all"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>

            {searchLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults
                  .filter((candidate) => candidate.id !== user?.id)
                  .map((candidate) => (
                    <FriendCard
                      key={candidate.id}
                      user={candidate}
                      action={
                        <Button
                          size="sm"
                          className="rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                          onClick={() => handleSendFriendRequest(candidate.id)}
                          disabled={sendingRequest}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Connect
                        </Button>
                      }
                    />
                  ))}
              </div>
            ) : debouncedSearchQuery ? (
              <EmptyState 
                icon={Search}
                title="No results found"
                description={`We couldn't find anyone matching "${searchQuery}".`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 opacity-50">
                <Sparkles className="h-12 w-12 text-primary mb-4" />
                <p className="text-lg font-medium">Start typing to discover people</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function FriendCard({ user, action }: { user: any; action?: ReactNode }) {
  return (
    <div className="group relative flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-background/40 backdrop-blur-md hover:bg-background/60 hover:border-primary/20 hover:shadow-lg transition-all duration-300">
      <Avatar className="h-12 w-12 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-bold text-lg">
          {user.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate text-foreground">{user.name}</h3>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
          <Mail className="h-3 w-3" />
          {user.email}
        </p>
      </div>
      {action}
    </div>
  );
}

function RequestCard({ user, onAccept, onDecline, isProcessing }: { user: any; onAccept: () => void; onDecline: () => void; isProcessing: boolean }) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl border border-white/5 bg-background/40 backdrop-blur-md hover:bg-background/60 transition-all duration-300">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-background">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-muted text-muted-foreground font-bold">
            {user.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{user.name}</h3>
          <p className="text-xs text-muted-foreground">wants to connect</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-xl border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
          onClick={onDecline}
          disabled={isProcessing}
        >
          Decline
        </Button>
        <Button 
          size="sm" 
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          onClick={onAccept}
          disabled={isProcessing}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-primary/50" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">{description}</p>
    </div>
  );
}
