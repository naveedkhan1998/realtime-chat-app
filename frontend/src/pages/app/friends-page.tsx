import { type ReactNode, useState } from 'react';
import { useAppSelector } from '@/app/hooks';
import {
  useGetFriendshipsQuery,
  useGetFriendRequestsQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  User,
} from '@/services/chatApi';
import { useSearchUsersQuery } from '@/services/userApi';
import { useDebounce } from '@/utils/hooks';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  UserPlus,
  Loader2,
  UserX,
  Sparkles,
  Users2,
  Shield,
  Mail,
  Check,
  X,
  LucideProps,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Friends() {
  const user = useAppSelector(state => state.auth.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendFilter, setFriendFilter] = useState('all');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const {
    data: friendships,
    isLoading: friendshipsLoading,
    refetch: refetchFriendships,
  } = useGetFriendshipsQuery(undefined, { pollingInterval: 10000 });
  const {
    data: receivedRequests,
    isLoading: receivedRequestsLoading,
    refetch: refetchReceivedRequests,
  } = useGetFriendRequestsQuery(undefined, { pollingInterval: 10000 });

  const [sendFriendRequest, { isLoading: sendingRequest }] =
    useSendFriendRequestMutation();
  const [acceptFriendRequest, { isLoading: acceptingRequest }] =
    useAcceptFriendRequestMutation();
  const [declineFriendRequest, { isLoading: decliningRequest }] =
    useDeclineFriendRequestMutation();
  const { data: searchResults, isLoading: searchLoading } = useSearchUsersQuery(
    { query: debouncedSearchQuery },
    { skip: !debouncedSearchQuery }
  );

  const filteredRequests = receivedRequests?.filter(
    request => request.status === 'pending'
  );

  const filteredFriends = friendships?.flatMap(friendship => {
    const connections = [friendship.user1, friendship.user2].filter(
      connection => connection.id !== user?.id
    );
    return connections.filter(connection => {
      if (friendFilter === 'all') return true;
      return connection.name.toLowerCase().includes(friendFilter.toLowerCase());
    });
  });

  const totalFriends = filteredFriends?.length ?? 0;
  const pendingCount = filteredRequests?.length ?? 0;

  const handleSendFriendRequest = async (toUserId: number) => {
    try {
      await sendFriendRequest({ to_user_id: toUserId }).unwrap();
      toast({
        title: 'Request sent',
        description: "They'll receive your invite in their activity feed.",
      });
    } catch (error) {
      console.error('Failed to send friend request:', error);
      toast({
        title: 'Error',
        description: "We couldn't send that invite. Give it another go.",
        variant: 'destructive',
      });
    }
  };

  const handleAcceptFriendRequest = async (requestId: number) => {
    try {
      await acceptFriendRequest({ id: requestId }).unwrap();
      toast({
        title: 'Connection confirmed',
        description: "You're now connected and can start collaborating.",
      });
      refetchFriendships();
      refetchReceivedRequests();
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      toast({
        title: 'Error',
        description: "We couldn't accept that invite. Try again shortly.",
        variant: 'destructive',
      });
    }
  };

  const handleDeclineFriendRequest = async (requestId: number) => {
    try {
      await declineFriendRequest({ id: requestId }).unwrap();
      toast({
        title: 'Invite dismissed',
        description: 'The requester has been notified.',
      });
      refetchReceivedRequests();
    } catch (error) {
      console.error('Failed to decline friend request:', error);
      toast({
        title: 'Error',
        description: "We couldn't remove that invite. Try again shortly.",
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="relative flex flex-col h-full gap-6 p-6 overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Connections
        </h1>
        <p className="text-lg text-muted-foreground">
          Manage your network and discover new teammates.
        </p>
      </div>

      {/* Main Content */}
      <Tabs
        defaultValue="friends"
        className="relative z-10 flex flex-col flex-1 gap-6 overflow-hidden"
      >
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <TabsList className="p-1 border shadow-sm bg-background/50 backdrop-blur-md rounded-2xl border-white/10">
            <TabsTrigger
              value="friends"
              className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              Friends{' '}
              <Badge
                variant="secondary"
                className="ml-2 border-0 bg-white/20 text-inherit hover:bg-white/30"
              >
                {totalFriends}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              Requests
              {pendingCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-2 px-1.5 py-0.5 text-[10px] animate-pulse"
                >
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="discover"
              className="rounded-xl px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              Discover
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:w-72 group">
            <Search className="absolute w-4 h-4 transition-colors -translate-y-1/2 left-3 top-1/2 text-muted-foreground group-focus-within:text-primary" />
            <Input
              placeholder="Filter connections..."
              value={friendFilter}
              onChange={e => setFriendFilter(e.target.value)}
              className="pl-10 transition-all shadow-sm h-11 bg-background/50 border-white/10 rounded-2xl focus:bg-background focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex-1 pr-2 -mr-2 overflow-y-auto custom-scrollbar">
          <TabsContent value="friends" className="h-full pb-6 mt-0">
            {friendshipsLoading ? (
              <div className="flex items-center justify-center h-60">
                <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
              </div>
            ) : filteredFriends && filteredFriends.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredFriends.map(friend => (
                  <FriendCard
                    key={friend.id}
                    user={friend}
                    action={
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="transition-colors rounded-full h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <UserX className="w-4 h-4" />
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

          <TabsContent value="requests" className="h-full pb-6 mt-0">
            {receivedRequestsLoading ? (
              <div className="flex items-center justify-center h-60">
                <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
              </div>
            ) : filteredRequests && filteredRequests.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredRequests.map(request => (
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

          <TabsContent value="discover" className="h-full pb-6 mt-0 space-y-8">
            <div className="max-w-2xl pt-8 mx-auto space-y-6 text-center">
              <div className="relative group">
                <div className="absolute transition duration-1000 opacity-25 -inset-1 bg-gradient-to-r from-primary to-violet-600 rounded-3xl blur group-hover:opacity-50 group-hover:duration-200"></div>
                <div className="relative">
                  <Search className="absolute w-6 h-6 transition-colors -translate-y-1/2 left-5 top-1/2 text-muted-foreground group-focus-within:text-primary" />
                  <Input
                    placeholder="Search for people by name or email..."
                    className="h-16 text-lg transition-all shadow-xl pl-14 bg-background border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20"
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                  />
                </div>
              </div>
            </div>

            {searchLoading ? (
              <div className="flex items-center justify-center h-60">
                <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults
                  .filter(candidate => candidate.id !== user?.id)
                  .map(candidate => (
                    <FriendCard
                      key={candidate.id}
                      user={candidate}
                      action={
                        <Button
                          size="sm"
                          className="transition-all rounded-full shadow-none bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md"
                          onClick={() => handleSendFriendRequest(candidate.id)}
                          disabled={sendingRequest}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
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
                  <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl" />
                  <Sparkles className="relative w-16 h-16 mb-6 text-primary" />
                </div>
                <p className="text-xl font-medium">
                  Start typing to discover people
                </p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function FriendCard({ user, action }: { user: User; action?: ReactNode }) {
  return (
    <div className="relative flex items-center gap-4 p-4 transition-all duration-300 border group rounded-3xl border-white/5 bg-background/40 backdrop-blur-xl hover:bg-background/60 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
      <Avatar className="transition-transform border-2 shadow-sm h-14 w-14 border-background group-hover:scale-105 ring-2 ring-transparent group-hover:ring-primary/10">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="text-lg font-bold text-white bg-gradient-to-br from-primary to-violet-600">
          {user.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 space-y-1">
        <h3 className="text-base font-semibold truncate text-foreground">
          {user.name}
        </h3>
        <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
          <Mail className="w-3 h-3 opacity-70" />
          {user.email}
        </p>
      </div>
      {action}
    </div>
  );
}

function RequestCard({
  user,
  onAccept,
  onDecline,
  isProcessing,
}: {
  user: User;
  onAccept: () => void;
  onDecline: () => void;
  isProcessing: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 transition-all duration-300 border rounded-3xl border-white/5 bg-background/40 backdrop-blur-xl hover:bg-background/60 hover:border-primary/20 hover:shadow-xl">
      <div className="flex items-center gap-4">
        <Avatar className="w-12 h-12 border-2 shadow-sm border-background">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="font-bold bg-muted text-muted-foreground">
            {user.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{user.name}</h3>
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
          className="shadow-lg rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20 h-9"
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

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
  >;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="flex items-center justify-center w-20 h-20 mb-6 border shadow-inner rounded-3xl bg-gradient-to-br from-primary/10 to-violet-500/10 border-white/5">
        <Icon className="w-10 h-10 text-primary/60" />
      </div>
      <h3 className="mb-2 text-xl font-bold text-foreground">{title}</h3>
      <p className="max-w-sm mx-auto text-base leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
