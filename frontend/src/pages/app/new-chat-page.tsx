import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { useAppSelector } from '@/app/hooks';
import { selectGlobalOnlineUsers } from '@/features/unifiedChatSlice';
import { useSearchUsersQuery } from '@/services/userApi';
import {
  useCreateChatRoomMutation,
  useGetFriendshipsQuery,
  User,
} from '@/services/chatApi';
import { useDebounce } from '@/utils/hooks';
import { toast } from '@/hooks/use-toast';
import { getAvatarUrl } from '@/lib/utils';

import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

import {
  Search,
  Loader2,
  MessageSquarePlus,
  ArrowLeft,
  Users2,
  LucideProps,
} from 'lucide-react';

export default function NewChatPage() {
  const user = useAppSelector(state => state.auth.user);
  const globalOnlineUsers = useAppSelector(selectGlobalOnlineUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const navigate = useNavigate();

  const { data: searchResults, isLoading: searchLoading } = useSearchUsersQuery(
    { query: debouncedSearchQuery },
    { skip: !debouncedSearchQuery || debouncedSearchQuery.length < 2 }
  );
  const { data: friendships, isLoading: friendshipsLoading } =
    useGetFriendshipsQuery();
  const [createChatRoom, { isLoading: creatingChatRoom }] =
    useCreateChatRoomMutation();
  const [pendingChatUserId, setPendingChatUserId] = useState<number | null>(
    null
  );

  // Get friends list from friendships
  const friends =
    friendships?.flatMap(friendship => {
      return [friendship.user1, friendship.user2].filter(
        friend => friend.id !== user?.id
      );
    }) || [];

  const handleCreateChat = async (
    participantId: number,
    participantName: string
  ) => {
    setPendingChatUserId(participantId);
    try {
      const response = await createChatRoom({
        participant_ids: [participantId],
      }).unwrap();
      toast({
        title: 'Chat created',
        description: `You can now chat with ${participantName}.`,
      });
      navigate(`/chat/${response.id}`);
    } catch (error) {
      console.error('Failed to create chat room:', error);
      toast({
        title: 'Error',
        description: 'Failed to create chat. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingChatUserId(null);
    }
  };

  const isOnline = (userId: number) => globalOnlineUsers.includes(userId);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Helmet>
        <title>New Chat | MNK Chat</title>
        <meta name="description" content="Start a new conversation" />
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
            New Chat
          </h1>
          <p className="text-xs truncate sm:text-sm text-muted-foreground">
            Start a conversation
          </p>
        </div>
      </header>

      {/* Search Input */}
      <div className="px-4 py-4 border-b sm:px-6 border-border/50 bg-background/50">
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute w-5 h-5 -translate-y-1/2 left-4 top-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-12 pl-12 text-base border rounded-xl bg-muted/50 border-border/50 focus:bg-background"
              autoFocus
            />
            {searchLoading && (
              <Loader2 className="absolute w-5 h-5 -translate-y-1/2 right-4 top-1/2 animate-spin text-primary" />
            )}
          </div>
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="mt-2 text-xs text-center text-muted-foreground">
              Type at least 2 characters to search
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Search Results Section */}
        {(searchLoading ||
          (searchResults && searchResults.length > 0) ||
          (debouncedSearchQuery && debouncedSearchQuery.length >= 2)) && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 py-2 sm:px-6">
              <h2 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Search Results
              </h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-4 pb-4 sm:px-6">
                {searchLoading ? (
                  <LoadingState />
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults
                      .filter(candidate => candidate.id !== user?.id)
                      .map(candidate => (
                        <UserCard
                          key={candidate.id}
                          user={candidate}
                          isOnline={isOnline(candidate.id)}
                          onStartChat={() =>
                            handleCreateChat(candidate.id, candidate.name)
                          }
                          isLoading={
                            creatingChatRoom &&
                            pendingChatUserId === candidate.id
                          }
                          disabled={creatingChatRoom}
                        />
                      ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Search}
                    title="No users found"
                    description={`No results for "${searchQuery}". Try a different search.`}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Friends Section - Always visible when not searching */}
        {!debouncedSearchQuery || debouncedSearchQuery.length < 2 ? (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 py-2 sm:px-6">
              <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                <Users2 className="w-3.5 h-3.5" />
                Your Friends
                {friends.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="px-1.5 py-0 text-[10px] bg-primary/10 text-primary border-0"
                  >
                    {friends.length}
                  </Badge>
                )}
              </h2>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-4 pb-6 sm:px-6">
                {friendshipsLoading ? (
                  <LoadingState />
                ) : friends.length > 0 ? (
                  <div className="space-y-2">
                    {friends.map(friend => (
                      <UserCard
                        key={friend.id}
                        user={friend}
                        isOnline={isOnline(friend.id)}
                        onStartChat={() =>
                          handleCreateChat(friend.id, friend.name)
                        }
                        isLoading={
                          creatingChatRoom && pendingChatUserId === friend.id
                        }
                        disabled={creatingChatRoom}
                        isFriend
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Users2}
                    title="No friends yet"
                    description="Add friends to quickly start conversations with them."
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        ) : null}

        {/* Default state when no search */}
        {!debouncedSearchQuery && friends.length === 0 && !friendshipsLoading && (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}

// Loading State Component
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

// User Card Component
function UserCard({
  user,
  isOnline,
  onStartChat,
  isLoading,
  disabled,
  isFriend,
}: {
  user: User;
  isOnline: boolean;
  onStartChat: () => void;
  isLoading: boolean;
  disabled: boolean;
  isFriend?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 transition-colors border rounded-xl bg-card border-border/50 hover:bg-accent/50 sm:p-4">
      <div className="relative">
        <Avatar className="w-10 h-10 border sm:w-12 sm:h-12 border-border/50">
          <AvatarImage src={getAvatarUrl(user.avatar)} alt={user.name} />
          <AvatarFallback className="text-sm font-semibold sm:text-base bg-primary/10 text-primary">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 rounded-full sm:w-3.5 sm:h-3.5 border-card" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate sm:text-base text-foreground">
          {user.name}
        </h3>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {isOnline ? (
            <span className="font-medium text-green-500">Online</span>
          ) : (
            <span>Offline</span>
          )}
          {isFriend && (
            <>
              <span className="text-border">•</span>
              <span>Friend</span>
            </>
          )}
        </p>
      </div>
      <Button
        size="sm"
        onClick={onStartChat}
        disabled={disabled}
        className="h-9 rounded-lg shrink-0 sm:h-10"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <MessageSquarePlus className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">Chat</span>
          </>
        )}
      </Button>
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
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="flex items-center justify-center w-14 h-14 mb-4 border rounded-2xl bg-muted/50 border-border/50">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
      <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
