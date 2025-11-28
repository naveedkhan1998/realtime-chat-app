import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  UserPlus,
  Loader2,
  UserX,
  Sparkles,
  Users2,
  UserCheck,
  Check,
  X,
  ArrowLeft,
  LucideProps,
  MessageCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet-async';

export default function Friends() {
  const user = useAppSelector(state => state.auth.user);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [friendFilter, setFriendFilter] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

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
    { skip: !debouncedSearchQuery || debouncedSearchQuery.length < 2 }
  );

  const filteredRequests = receivedRequests?.filter(
    request => request.status === 'pending'
  );

  // Get existing friend IDs for filtering search results
  const existingFriendIds = new Set(
    friendships?.flatMap(f => [f.user1.id, f.user2.id]) || []
  );

  // Get pending request user IDs
  const pendingRequestUserIds = new Set(
    receivedRequests?.map(r => r.from_user.id) || []
  );

  const filteredFriends = friendships?.flatMap(friendship => {
    const connections = [friendship.user1, friendship.user2].filter(
      connection => connection.id !== user?.id
    );
    return connections.filter(connection => {
      if (!friendFilter) return true;
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
        description: "They'll receive your friend request soon.",
      });
    } catch (error: any) {
      console.error('Failed to send friend request:', error);
      const message =
        error?.data?.detail ||
        error?.data?.message ||
        "We couldn't send that request. Please try again.";
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleAcceptFriendRequest = async (requestId: number) => {
    try {
      await acceptFriendRequest({ id: requestId }).unwrap();
      toast({
        title: 'Friend added!',
        description: 'You can now start chatting with your new friend.',
      });
      refetchFriendships();
      refetchReceivedRequests();
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      toast({
        title: 'Error',
        description: "Couldn't accept the request. Please try again.",
        variant: 'destructive',
      });
    }
  };

  const handleDeclineFriendRequest = async (requestId: number) => {
    try {
      await declineFriendRequest({ id: requestId }).unwrap();
      toast({
        title: 'Request declined',
        description: 'The friend request has been removed.',
      });
      refetchReceivedRequests();
    } catch (error) {
      console.error('Failed to decline friend request:', error);
      toast({
        title: 'Error',
        description: "Couldn't decline the request. Please try again.",
        variant: 'destructive',
      });
    }
  };

  // Check if a user is already a friend or has a pending request
  const getUserStatus = (
    userId: number
  ): 'friend' | 'pending' | 'none' | 'self' => {
    if (userId === user?.id) return 'self';
    if (existingFriendIds.has(userId)) return 'friend';
    if (pendingRequestUserIds.has(userId)) return 'pending';
    return 'none';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Helmet>
        <title>Friends | MNK Chat</title>
        <meta
          name="description"
          content="Manage your friends and connections"
        />
      </Helmet>

      {/* Header - Consistent with other pages */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b sm:gap-4 sm:px-6 sm:py-4 bg-background/80 backdrop-blur-xl border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl shrink-0 sm:w-10 sm:h-10"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold truncate sm:text-xl text-foreground">
            Friends
          </h1>
          <p className="text-xs truncate sm:text-sm text-muted-foreground">
            Manage your connections
          </p>
        </div>
      </header>

      {/* Main Content */}
      <Tabs
        defaultValue="friends"
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        {/* Tabs Header */}
        <div className="px-4 py-3 border-b sm:px-6 border-border/50 bg-background/50">
          <TabsList className="grid w-full h-auto grid-cols-3 gap-1 p-1 rounded-xl bg-muted/50">
            <TabsTrigger
              value="friends"
              className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Users2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Friends</span>
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px] sm:text-xs bg-primary/10 text-primary border-0"
              >
                {totalFriends}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Requests</span>
              {pendingCount > 0 && (
                <Badge
                  variant="destructive"
                  className="px-1.5 py-0 text-[10px] animate-pulse"
                >
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="discover"
              className="flex items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs sm:text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Discover</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Friends Tab */}
          <TabsContent value="friends" className="h-full m-0 outline-none">
            <div className="flex flex-col h-full">
              {/* Filter Input */}
              <div className="px-4 py-3 sm:px-6">
                <div className="relative">
                  <Search className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Filter friends..."
                    value={friendFilter}
                    onChange={e => setFriendFilter(e.target.value)}
                    className="h-10 pl-10 border rounded-xl bg-muted/50 border-border/50 focus:bg-background"
                  />
                </div>
              </div>

              {/* Friends List */}
              <ScrollArea className="flex-1">
                <div className="px-4 pb-6 sm:px-6">
                  {friendshipsLoading ? (
                    <LoadingState />
                  ) : filteredFriends && filteredFriends.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredFriends.map(friend => (
                        <FriendCard
                          key={friend.id}
                          user={friend}
                          onMessage={() => navigate(`/chat`)}
                          onRemove={() => {
                            toast({
                              title: 'Coming soon',
                              description:
                                'Remove friend feature will be available soon.',
                            });
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Users2}
                      title="No friends yet"
                      description="Head to the Discover tab to find and add friends."
                    />
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="h-full m-0 outline-none">
            <ScrollArea className="h-full">
              <div className="px-4 py-3 pb-6 sm:px-6">
                {receivedRequestsLoading ? (
                  <LoadingState />
                ) : filteredRequests && filteredRequests.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                    icon={UserCheck}
                    title="No pending requests"
                    description="You're all caught up! New friend requests will appear here."
                  />
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Discover Tab */}
          <TabsContent value="discover" className="h-full m-0 outline-none">
            <div className="flex flex-col h-full">
              {/* Search Input */}
              <div className="px-4 py-4 sm:px-6">
                <div className="max-w-xl mx-auto">
                  <div className="relative">
                    <Search className="absolute w-5 h-5 -translate-y-1/2 left-4 top-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="h-12 pl-12 text-base border rounded-xl bg-muted/50 border-border/50 focus:bg-background"
                    />
                  </div>
                  {searchQuery.length > 0 && searchQuery.length < 2 && (
                    <p className="mt-2 text-xs text-center text-muted-foreground">
                      Type at least 2 characters to search
                    </p>
                  )}
                </div>
              </div>

              {/* Search Results */}
              <ScrollArea className="flex-1">
                <div className="px-4 pb-6 sm:px-6">
                  {searchLoading ? (
                    <LoadingState />
                  ) : searchResults && searchResults.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {searchResults.map(candidate => {
                        const status = getUserStatus(candidate.id);
                        if (status === 'self') return null;

                        return (
                          <DiscoverCard
                            key={candidate.id}
                            user={candidate}
                            status={status}
                            onSendRequest={() =>
                              handleSendFriendRequest(candidate.id)
                            }
                            isLoading={sendingRequest}
                          />
                        );
                      })}
                    </div>
                  ) : debouncedSearchQuery && debouncedSearchQuery.length >= 2 ? (
                    <EmptyState
                      icon={Search}
                      title="No users found"
                      description={`No results for "${searchQuery}". Try a different search term.`}
                    />
                  ) : (
                    <EmptyState
                      icon={Sparkles}
                      title="Find new friends"
                      description="Search for people by their name or email address."
                    />
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// Loading State Component
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// Friend Card Component
function FriendCard({
  user,
  onMessage,
  onRemove,
}: {
  user: User;
  onMessage: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 transition-colors border rounded-xl bg-card border-border/50 hover:bg-accent/50 sm:p-4">
      <Avatar className="w-10 h-10 border sm:w-12 sm:h-12 border-border/50">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="text-sm font-semibold sm:text-base bg-primary/10 text-primary">
          {user.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate sm:text-base text-foreground">
          {user.name}
        </h3>
        <p className="text-xs truncate text-muted-foreground">Friend</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMessage}
          className="w-8 h-8 rounded-lg sm:w-9 sm:h-9 hover:bg-primary/10 hover:text-primary"
        >
          <MessageCircle className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="w-8 h-8 rounded-lg sm:w-9 sm:h-9 hover:bg-destructive/10 hover:text-destructive"
        >
          <UserX className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Request Card Component
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
    <div className="p-3 transition-colors border rounded-xl bg-card border-border/50 hover:bg-accent/50 sm:p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="w-10 h-10 border sm:w-12 sm:h-12 border-border/50">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="text-sm font-semibold sm:text-base bg-primary/10 text-primary">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate sm:text-base text-foreground">
            {user.name}
          </h3>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary" />
            Wants to be friends
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDecline}
          disabled={isProcessing}
          className="rounded-lg h-9 border-border/50 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20"
        >
          <X className="w-4 h-4 mr-1.5" />
          Decline
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isProcessing}
          className="rounded-lg h-9"
        >
          <Check className="w-4 h-4 mr-1.5" />
          Accept
        </Button>
      </div>
    </div>
  );
}

// Discover Card Component
function DiscoverCard({
  user,
  status,
  onSendRequest,
  isLoading,
}: {
  user: User;
  status: 'friend' | 'pending' | 'none';
  onSendRequest: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 transition-colors border rounded-xl bg-card border-border/50 hover:bg-accent/50 sm:p-4">
      <Avatar className="w-10 h-10 border sm:w-12 sm:h-12 border-border/50">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback className="text-sm font-semibold sm:text-base bg-primary/10 text-primary">
          {user.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate sm:text-base text-foreground">
          {user.name}
        </h3>
        {status === 'friend' && (
          <p className="text-xs text-muted-foreground">Already friends</p>
        )}
        {status === 'pending' && (
          <p className="text-xs text-muted-foreground">Request pending</p>
        )}
      </div>
      <div className="shrink-0">
        {status === 'friend' ? (
          <Badge variant="secondary" className="text-xs">
            <UserCheck className="w-3 h-3 mr-1" />
            Friends
          </Badge>
        ) : status === 'pending' ? (
          <Badge variant="outline" className="text-xs">
            Pending
          </Badge>
        ) : (
          <Button
            size="sm"
            onClick={onSendRequest}
            disabled={isLoading}
            className="h-8 rounded-lg sm:h-9"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-1.5" />
                <span className="hidden sm:inline">Add</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// Empty State Component
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
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex items-center justify-center w-16 h-16 mb-4 border rounded-2xl bg-muted/50 border-border/50">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-foreground">{title}</h3>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
