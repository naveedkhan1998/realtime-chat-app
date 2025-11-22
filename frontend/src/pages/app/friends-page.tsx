import { type ReactNode, useState } from "react";
import { useAppSelector } from "@/app/hooks";
import { useGetFriendshipsQuery, useGetFriendRequestsQuery, useSendFriendRequestMutation, useAcceptFriendRequestMutation, useDeclineFriendRequestMutation } from "@/services/chatApi";
import { useSearchUsersQuery } from "@/services/userApi";
import { useDebounce } from "@/utils/hooks";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, UserPlus, Loader2, UserX, Sparkles, Users2, Shield, Mail, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Friends() {
  const user = useAppSelector((state) => state.auth.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [friendFilter, setFriendFilter] = useState("all");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const { data: friendships, isLoading: friendshipsLoading, refetch: refetchFriendships } = useGetFriendshipsQuery(undefined, { pollingInterval: 10000 });
  const {
    data: receivedRequests,
    isLoading: receivedRequestsLoading,
    refetch: refetchReceivedRequests,
  } = useGetFriendRequestsQuery(undefined, { pollingInterval: 10000 });

  const [sendFriendRequest, { isLoading: sendingRequest }] = useSendFriendRequestMutation();
  const [acceptFriendRequest, { isLoading: acceptingRequest }] = useAcceptFriendRequestMutation();
  const [declineFriendRequest, { isLoading: decliningRequest }] = useDeclineFriendRequestMutation();
  const { data: searchResults, isLoading: searchLoading } = useSearchUsersQuery({ query: debouncedSearchQuery }, { skip: !debouncedSearchQuery });

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
    <div className="flex h-full flex-col gap-6 p-6 overflow-hidden relative">
       {/* Decorative Background */}
       <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col gap-2 relative z-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Connections</h1>
        <p className="text-muted-foreground text-lg">Manage your network and discover new teammates.</p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="friends" className="flex-1 flex flex-col gap-6 overflow-hidden relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <TabsList className="bg-background/50 backdrop-blur-md p-1 rounded-2xl border border-white/10 shadow-sm">
            <TabsTrigger value="friends" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Friends <Badge variant="secondary" className="ml-2 bg-white/20 text-inherit hover:bg-white/30 border-0">{totalFriends}</Badge>
            </TabsTrigger>
            <TabsTrigger value="requests" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Requests 
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-[10px] animate-pulse">{pendingCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="discover" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
              Discover
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Filter connections..." 
              value={friendFilter}
              onChange={(e) => setFriendFilter(e.target.value)}
              className="pl-10 h-11 bg-background/50 border-white/10 rounded-2xl focus:bg-background focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar -mr-2">
          <TabsContent value="friends" className="mt-0 h-full pb-6">
            {friendshipsLoading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
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
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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

          <TabsContent value="requests" className="mt-0 h-full pb-6">
            {receivedRequestsLoading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
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

          <TabsContent value="discover" className="mt-0 h-full pb-6 space-y-8">
            <div className="max-w-2xl mx-auto text-center space-y-6 pt-8">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-violet-600 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search for people by name or email..."
                    className="h-16 pl-14 text-lg bg-background border-white/10 rounded-2xl shadow-xl focus:ring-2 focus:ring-primary/20 transition-all"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </div>
            </div>

            {searchLoading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary/50" />
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
                          className="rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-none hover:shadow-md"
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
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                  <Sparkles className="relative h-16 w-16 text-primary mb-6" />
                </div>
                <p className="text-xl font-medium">Start typing to discover people</p>
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
    <div className="group relative flex items-center gap-4 p-4 rounded-3xl border border-white/5 bg-background/40 backdrop-blur-xl hover:bg-background/60 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
      <Avatar className="h-14 w-14 border-2 border-background shadow-sm group-hover:scale-105 transition-transform ring-2 ring-transparent group-hover:ring-primary/10">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="bg-gradient-to-br from-primary to-violet-600 text-white font-bold text-lg">
          {user.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <h3 className="font-semibold truncate text-foreground text-base">{user.name}</h3>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
          <Mail className="h-3 w-3 opacity-70" />
          {user.email}
        </p>
      </div>
      {action}
    </div>
  );
}

function RequestCard({ user, onAccept, onDecline, isProcessing }: { user: any; onAccept: () => void; onDecline: () => void; isProcessing: boolean }) {
  return (
    <div className="flex flex-col gap-4 p-5 rounded-3xl border border-white/5 bg-background/40 backdrop-blur-xl hover:bg-background/60 hover:border-primary/20 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-muted text-muted-foreground font-bold">
            {user.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{user.name}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Sparkles className="w-3 h-3 text-primary" />
            Wants to connect
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-xl border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 h-9"
          onClick={onDecline}
          disabled={isProcessing}
        >
          <X className="w-4 h-4 mr-2" />
          Decline
        </Button>
        <Button 
          size="sm" 
          className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 h-9"
          onClick={onAccept}
          disabled={isProcessing}
        >
          <Check className="w-4 h-4 mr-2" />
          Accept
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary/10 to-violet-500/10 flex items-center justify-center mb-6 shadow-inner border border-white/5">
        <Icon className="h-10 w-10 text-primary/60" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">{description}</p>
    </div>
  );
}
