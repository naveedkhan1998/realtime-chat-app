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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { Search, UserPlus, Check, X, Loader2, UserX, Sparkles, Users2, Shield, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
      toast({
        title: "Request sent",
        description: "They'll receive your invite in their activity feed.",
      });
    } catch (error) {
      console.error("Failed to send friend request:", error);
      toast({
        title: "Error",
        description: "We couldn't send that invite. Give it another go.",
        variant: "destructive",
      });
    }
  };

  const handleAcceptFriendRequest = async (requestId: number) => {
    try {
      await acceptFriendRequest({ id: requestId }).unwrap();
      toast({
        title: "Connection confirmed",
        description: "You're now connected and can start collaborating.",
      });
      refetchFriendships();
      refetchReceivedRequests();
    } catch (error) {
      console.error("Failed to accept friend request:", error);
      toast({
        title: "Error",
        description: "We couldn't accept that invite. Try again shortly.",
        variant: "destructive",
      });
    }
  };

  const handleDeclineFriendRequest = async (requestId: number) => {
    try {
      await declineFriendRequest({ id: requestId }).unwrap();
      toast({
        title: "Invite dismissed",
        description: "The requester has been notified.",
      });
      refetchReceivedRequests();
    } catch (error) {
      console.error("Failed to decline friend request:", error);
      toast({
        title: "Error",
        description: "We couldn't remove that invite. Try again shortly.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <section className="rounded-2xl border border-border bg-background px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Connections
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Manage the people you chat with</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">Respond to invitations, keep an eye on active friends, and discover teammates to start new threads with.</p>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-md">
            <MetricCard icon={Users2} label="Friends" value={totalFriends.toString()} helper="Confirmed connections" />
            <MetricCard icon={Shield} label="Requests" value={pendingCount.toString()} helper="Waiting for a response" />
          </div>
        </div>
      </section>

      <Card className="border border-border bg-background/70">
        <CardContent className="space-y-6 p-4 sm:p-6">
          <Tabs defaultValue="friends" className="w-full space-y-5">
            <TabsList className="grid w-full grid-cols-3 rounded-xl border border-border bg-muted/40 p-1 text-sm">
              <TabsTrigger value="friends" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground">
                Friends
              </TabsTrigger>
              <TabsTrigger value="requests" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground">
                Requests
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-2 rounded-full bg-primary/10 text-[11px] text-primary">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="discover" className="rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground">
                Discover
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex min-w-[220px] flex-1">
                  <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter by name"
                    value={friendFilter}
                    onChange={(event) => setFriendFilter(event.target.value)}
                    className="h-11 rounded-full border border-border bg-background pl-10 text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Total {totalFriends}</p>
              </div>
              <GradientScrollArea loading={friendshipsLoading} error={friendshipsError && "Unable to load your connections."}>
                {filteredFriends && filteredFriends.length > 0 ? (
                  filteredFriends.map((friend) => (
                    <ConnectionRow
                      key={friend.id}
                      title={friend.name}
                      subtitle="Online"
                      avatar={friend.avatar}
                      action={
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full border border-border text-muted-foreground hover:text-destructive">
                                <UserX className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Remove friend</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      }
                    />
                  ))
                ) : (
                  <EmptyState message="No connections yet. Invite collaborators to start chatting." />
                )}
              </GradientScrollArea>
            </TabsContent>

            <TabsContent value="requests" className="space-y-5">
              <GradientScrollArea loading={receivedRequestsLoading} error={receivedRequestsError && "Couldn't fetch pending invites."}>
                {filteredRequests && filteredRequests.length > 0 ? (
                  filteredRequests.map((request) => (
                    <ConnectionRow
                      key={request.id}
                      title={request.from_user.name}
                      subtitle={request.from_user.email}
                      avatar={request.from_user.avatar}
                      action={
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="rounded-full border border-border text-green-600 hover:bg-green-500/10"
                                  onClick={() => handleAcceptFriendRequest(request.id)}
                                  disabled={acceptingRequest || request.status !== "pending"}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Accept request</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="rounded-full border border-border text-red-500 hover:bg-red-500/10"
                                  onClick={() => handleDeclineFriendRequest(request.id)}
                                  disabled={decliningRequest || request.status !== "pending"}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Decline request</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      }
                    />
                  ))
                ) : (
                  <EmptyState message="No pending invites right now." />
                )}
              </GradientScrollArea>
            </TabsContent>

            <TabsContent value="discover" className="space-y-5">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email"
                  className="h-11 rounded-full border border-border bg-background pl-10 text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <GradientScrollArea loading={searchLoading} error={searchError && "We couldn't perform that lookup just yet."}>
                {searchResults && searchResults.length > 0 ? (
                  searchResults
                    .filter((candidate) => candidate.id !== user?.id)
                    .map((candidate) => (
                      <ConnectionRow
                        key={candidate.id}
                        title={candidate.name}
                        subtitle={candidate.email}
                        avatar={candidate.avatar}
                        action={
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="rounded-full border border-border text-primary hover:bg-primary/10"
                                  onClick={() => handleSendFriendRequest(candidate.id)}
                                  disabled={sendingRequest}
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Send request</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        }
                      />
                    ))
                ) : debouncedSearchQuery ? (
                  <EmptyState message="No matching profiles yet. Try another name or invite them directly." />
                ) : (
                  <EmptyState message="Search for teammates to add them to your chat list." />
                )}
              </GradientScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function ConnectionRow({ title, subtitle, avatar, action }: { title: string; subtitle: string; avatar?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-3 py-3 transition hover:border-primary/30">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-border bg-muted/40">
          <AvatarImage src={avatar} alt={title} />
          <AvatarFallback className="text-sm font-semibold text-primary">{title.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, helper }: { icon: React.ElementType; label: string; value: string; helper: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-sm">
      <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </div>
    </div>
  );
}

function GradientScrollArea({ children, loading, error }: { children: React.ReactNode; loading: boolean; error?: string | false }) {
  return (
    <ScrollArea className="h-[340px] w-full rounded-xl border border-border bg-background/60 p-3">
      {loading ? (
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-300/60 bg-red-50 p-5 text-center text-sm text-red-600 dark:border-red-400/40 dark:bg-red-900/40 dark:text-red-100">
          {error}
        </div>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </ScrollArea>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
