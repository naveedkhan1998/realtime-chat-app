import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/app/hooks';
import {
  useGetFriendshipsQuery,
  useGetFriendRequestsQuery,
  useSendFriendRequestMutation,
  useAcceptFriendRequestMutation,
  useDeclineFriendRequestMutation,
  useCreateChatRoomMutation,
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
  Sparkles,
  Users2,
  UserCheck,
  Check,
  X,
  ArrowLeft,
  LucideProps,
  MessageSquare,
  Radio,
  ShieldCheck,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Helmet } from 'react-helmet-async';
import { getAvatarUrl } from '@/lib/utils';

export default function Friends() {
  const user = useAppSelector(state => state.auth.user);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [friendFilter, setFriendFilter] = useState('');
  const [startingChatFriendId, setStartingChatFriendId] = useState<
    number | null
  >(null);
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
  const [createChatRoom] = useCreateChatRoomMutation();

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

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/chat');
    }
  };

  const handleStartChat = async (friendId: number) => {
    setStartingChatFriendId(friendId);
    try {
      const room = await createChatRoom({
        participant_ids: [friendId],
        is_group_chat: false,
      }).unwrap();
      navigate(`/chat/${room.id}`);
    } catch (error) {
      console.error('Failed to open chat:', error);
      toast({
        title: 'Error opening chat',
        description: 'Navigating to your conversations list.',
        variant: 'destructive',
      });
      navigate('/chat');
    } finally {
      setStartingChatFriendId(null);
    }
  };

  const handleSendFriendRequest = async (toUserId: number) => {
    try {
      await sendFriendRequest({ to_user_id: toUserId }).unwrap();
      toast({
        title: 'Friend request sent',
        description: "They'll receive your request and can accept anytime.",
      });
    } catch (error: unknown) {
      console.error('Failed to send friend request:', error);
      const err = error as { data?: { detail?: string; message?: string } };
      const message =
        err?.data?.detail ||
        err?.data?.message ||
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
        description: 'You can now start messaging each other in real-time.',
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
        description: 'The friend request has been dismissed.',
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

  const getUserStatus = (
    userId: number
  ): 'friend' | 'pending' | 'none' | 'self' => {
    if (userId === user?.id) return 'self';
    if (existingFriendIds.has(userId)) return 'friend';
    if (pendingRequestUserIds.has(userId)) return 'pending';
    return 'none';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/50">
      <Helmet>
        <title>Friends & Teammates | MNK Chat</title>
        <meta
          name="description"
          content="Manage your friends, team connections, and pending invitations"
        />
      </Helmet>

      {/* Header - Modern Glass Banner */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-4 border-b bg-card/60 backdrop-blur-xl border-border/50">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
            aria-label="Back to chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold truncate text-foreground tracking-tight flex items-center gap-2">
              <span>Friends & Teammates</span>
            </h1>
            <p className="text-xs sm:text-sm truncate text-muted-foreground hidden xs:block">
              Collaborate in real-time via direct messages and voice huddles
            </p>
          </div>
        </div>

        {/* Quick Stat Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary border-primary/20"
          >
            {totalFriends} {totalFriends === 1 ? 'Friend' : 'Friends'}
          </Badge>
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="px-2 py-1 text-xs font-bold rounded-lg animate-pulse"
            >
              {pendingCount} new
            </Badge>
          )}
        </div>
      </header>

      {/* Main Tabs Container */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        {/* Modern Segmented Navigation Tabs */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-border/40 bg-card/30 backdrop-blur-md">
          <TabsList className="grid w-full grid-cols-3 p-1 rounded-xl sm:rounded-2xl bg-muted/40 border border-border/40 h-auto">
            {/* Friends Tab */}
            <TabsTrigger
              value="friends"
              className="flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 text-muted-foreground"
            >
              <Users2 className="w-4 h-4 shrink-0" />
              <span>All Friends</span>
              <span className="ml-1 text-[11px] px-1.5 py-0.2 rounded-full bg-primary/15 text-primary font-bold">
                {totalFriends}
              </span>
            </TabsTrigger>

            {/* Requests Tab */}
            <TabsTrigger
              value="requests"
              className="flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 text-muted-foreground relative"
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Requests</span>
              {pendingCount > 0 ? (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-destructive text-white font-bold animate-pulse">
                  {pendingCount}
                </span>
              ) : null}
            </TabsTrigger>

            {/* Discover Tab */}
            <TabsTrigger
              value="discover"
              className="flex items-center justify-center gap-1.5 rounded-lg sm:rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-border/50 text-muted-foreground"
            >
              <UserPlus className="w-4 h-4 shrink-0 text-primary" />
              <span className="font-semibold text-foreground">Add Friend</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content Panes */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* TAB 1: Friends */}
          <TabsContent
            value="friends"
            className="h-full m-0 outline-none flex flex-col"
          >
            {/* Filter Input */}
            <div className="px-3 sm:px-6 py-3">
              <div className="relative max-w-lg">
                <Search className="absolute w-4 h-4 -translate-y-1/2 left-3.5 top-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Filter friends by name..."
                  value={friendFilter}
                  onChange={e => setFriendFilter(e.target.value)}
                  className="h-10 pl-10 pr-9 text-[16px] sm:text-sm rounded-xl bg-card/60 border-border/50 focus:border-primary/50 focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/70"
                />
                {friendFilter && (
                  <button
                    type="button"
                    onClick={() => setFriendFilter('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Friends Cards Grid */}
            <ScrollArea className="flex-1">
              <div className="px-3 sm:px-6 pb-28 sm:pb-12">
                {friendshipsLoading ? (
                  <LoadingState message="Loading your friends..." />
                ) : filteredFriends && filteredFriends.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredFriends.map(friend => (
                      <FriendCard
                        key={friend.id}
                        user={friend}
                        onMessage={() => handleStartChat(friend.id)}
                        isStartingChat={startingChatFriendId === friend.id}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Users2}
                    title="No friends found"
                    description={
                      friendFilter
                        ? `No friends matched "${friendFilter}". Try another search.`
                        : "You haven't connected with anyone yet. Explore the Add Friend tab to connect with colleagues!"
                    }
                    actionLabel={friendFilter ? 'Clear Filter' : 'Find People'}
                    onAction={
                      friendFilter
                        ? () => setFriendFilter('')
                        : () => setActiveTab('discover')
                    }
                  />
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB 2: Requests */}
          <TabsContent
            value="requests"
            className="h-full m-0 outline-none flex flex-col"
          >
            <ScrollArea className="flex-1">
              <div className="px-3 sm:px-6 py-4 pb-28 sm:pb-12">
                {receivedRequestsLoading ? (
                  <LoadingState message="Checking for pending invitations..." />
                ) : filteredRequests && filteredRequests.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                    description="You're completely caught up! Any incoming friend invitations will appear here."
                    actionLabel="Find Teammates"
                    onAction={() => setActiveTab('discover')}
                  />
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB 3: Discover / Add Friend */}
          <TabsContent
            value="discover"
            className="h-full m-0 outline-none flex flex-col"
          >
            {/* Search Input Banner */}
            <div className="px-3 sm:px-6 py-4 sm:py-6">
              <div className="max-w-xl mx-auto p-4 sm:p-6 rounded-3xl border border-primary/20 bg-primary/5 backdrop-blur-xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-base font-bold text-foreground">
                    Add New Friend
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  Search by teammate username or email address to send an
                  instant friend request.
                </p>

                <div className="relative">
                  <Search className="absolute w-5 h-5 -translate-y-1/2 left-3.5 top-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Enter teammate name or email..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-11 sm:h-12 pl-11 pr-10 text-[16px] sm:text-base rounded-2xl bg-card/80 border-border/60 focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {searchQuery.length > 0 && searchQuery.length < 2 && (
                  <p className="mt-2 text-xs text-center text-muted-foreground">
                    Type at least 2 characters to search across directory
                  </p>
                )}
              </div>
            </div>

            {/* Discover Results */}
            <ScrollArea className="flex-1">
              <div className="px-3 sm:px-6 pb-28 sm:pb-12 max-w-4xl mx-auto">
                {searchLoading ? (
                  <LoadingState message="Searching the workspace directory..." />
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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
                    description={`No registered members matched "${searchQuery}". Please verify spelling or try another search term.`}
                  />
                ) : (
                  <div className="text-center py-12 text-muted-foreground space-y-2">
                    <ShieldCheck className="w-10 h-10 mx-auto text-primary/40 mb-2" />
                    <p className="text-sm font-medium">
                      Safe & Verified Workspace
                    </p>
                    <p className="text-xs max-w-xs mx-auto">
                      Search colleagues to connect and start real-time messaging
                      with WebRTC audio huddles.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// 1. Friend Card Component
function FriendCard({
  user,
  onMessage,
  isStartingChat,
}: {
  user: User;
  onMessage: () => void;
  isStartingChat: boolean;
}) {
  return (
    <div className="group relative flex flex-col justify-between p-3.5 sm:p-4 rounded-2xl bg-card/50 hover:bg-card/85 border border-border/50 hover:border-primary/40 backdrop-blur-xl transition-all duration-200 shadow-sm hover:shadow-md">
      <div className="flex items-center gap-3 min-w-0 mb-3">
        <div className="relative shrink-0">
          <Avatar className="w-12 h-12 rounded-2xl border border-border/60 shadow-inner">
            <AvatarImage
              src={getAvatarUrl(user.avatar)}
              alt={user.name}
              className="object-cover"
            />
            <AvatarFallback className="text-sm font-bold bg-primary/15 text-primary rounded-2xl">
              {user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {/* Glowing Online Ring */}
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-card shadow-sm shadow-emerald-500/50" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-bold truncate text-foreground group-hover:text-primary transition-colors">
            {user.name}
          </h3>
          <p className="text-xs truncate text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            Active now • Teammate
          </p>
        </div>
      </div>

      {/* Action Row */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
        <Button
          size="sm"
          onClick={onMessage}
          disabled={isStartingChat}
          className="h-8.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold transition-all gap-1.5 shadow-sm active:scale-95 text-xs"
        >
          {isStartingChat ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message</span>
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onMessage}
          disabled={isStartingChat}
          className="h-8.5 rounded-xl border-border/60 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/30 font-medium transition-all gap-1.5 text-xs text-muted-foreground"
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Huddle</span>
        </Button>
      </div>
    </div>
  );
}

// 2. Request Card Component
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
    <div className="p-4 rounded-2xl bg-card/60 border border-border/50 hover:border-primary/40 backdrop-blur-xl transition-all shadow-sm">
      <div className="flex items-center gap-3 mb-3.5">
        <Avatar className="w-11 h-11 rounded-2xl border border-border/60">
          <AvatarImage
            src={getAvatarUrl(user.avatar)}
            alt={user.name}
            className="object-cover"
          />
          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary rounded-2xl">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-bold truncate text-foreground">
            {user.name}
          </h3>
          <p className="flex items-center gap-1 text-xs text-primary font-medium mt-0.5">
            <Sparkles className="w-3 h-3 text-primary animate-pulse" />
            Wants to connect with you
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onDecline}
          disabled={isProcessing}
          className="rounded-xl h-9 border-border/60 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors text-xs font-semibold"
        >
          <X className="w-4 h-4 mr-1.5" />
          Decline
        </Button>
        <Button
          size="sm"
          onClick={onAccept}
          disabled={isProcessing}
          className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/25 transition-all active:scale-95 text-xs"
        >
          <Check className="w-4 h-4 mr-1.5" />
          Accept
        </Button>
      </div>
    </div>
  );
}

// 3. Discover Card Component
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
    <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-card/50 hover:bg-card/85 border border-border/50 hover:border-primary/40 backdrop-blur-xl transition-all shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="w-11 h-11 rounded-2xl border border-border/60">
          <AvatarImage
            src={getAvatarUrl(user.avatar)}
            alt={user.name}
            className="object-cover"
          />
          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary rounded-2xl">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold truncate text-foreground">
            {user.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {status === 'friend'
              ? 'Already friends'
              : status === 'pending'
                ? 'Request pending'
                : 'Workspace Member'}
          </p>
        </div>
      </div>

      <div className="shrink-0">
        {status === 'friend' ? (
          <Badge
            variant="secondary"
            className="text-xs py-1 px-2.5 rounded-lg bg-primary/10 text-primary border-primary/20"
          >
            <UserCheck className="w-3.5 h-3.5 mr-1" />
            Friends
          </Badge>
        ) : status === 'pending' ? (
          <Badge
            variant="outline"
            className="text-xs py-1 px-2.5 rounded-lg border-amber-500/30 text-amber-500 bg-amber-500/10"
          >
            Pending
          </Badge>
        ) : (
          <Button
            size="sm"
            onClick={onSendRequest}
            disabled={isLoading}
            className="h-9 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm shadow-primary/20 active:scale-95 transition-all text-xs"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-1.5" />
                <span>Add</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// 4. Loading State Component
function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// 5. Empty State Component
function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, 'ref'> & React.RefAttributes<SVGSVGElement>
  >;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center max-w-sm mx-auto">
      <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-3xl bg-muted/40 border border-border/60 shadow-inner">
        <Icon className="w-8 h-8 text-muted-foreground/70" />
      </div>
      <h3 className="mb-1.5 text-base sm:text-lg font-bold text-foreground tracking-tight">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="mt-5 rounded-xl border-border/60 text-xs font-semibold hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
