import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { AppShellContext } from '@/layouts/AppShell';
import { useAppSelector } from '@/app/hooks';
import { selectGlobalOnlineUsers } from '@/features/unifiedChatSlice';
import { useSearchUsersQuery } from '@/services/userApi';
import {
  useCreateChatRoomMutation,
  useGetFriendshipsQuery,
} from '@/services/chatApi';
import { useDebounce } from '@/utils/hooks';
import { toast } from '@/hooks/use-toast';
import { getAvatarUrl } from '@/lib/utils';

import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import {
  Search,
  Loader2,
  MessageSquarePlus,
  ArrowLeft,
  Heart,
  Users,
} from 'lucide-react';

export default function NewChatPage() {
  const user = useAppSelector(state => state.auth.user);
  const globalOnlineUsers = useAppSelector(selectGlobalOnlineUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const navigate = useNavigate();
  const { isMobile } = useOutletContext<AppShellContext>();

  const { data: searchResults, isLoading: searchLoading } = useSearchUsersQuery(
    { query: debouncedSearchQuery },
    { skip: !debouncedSearchQuery }
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
        title: 'Chat ready',
        description: `You're now chatting with ${participantName}.`,
      });
      navigate(`/chat/${response.id}`);
    } catch (error) {
      console.error('Failed to create chat room:', error);
      toast({
        title: 'Unable to create chat',
        description: 'Something went sideways. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPendingChatUserId(null);
    }
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      <Helmet>
        <title>New Chat | MNK Chat</title>
        <meta name="description" content="Start a new conversation" />
      </Helmet>

      {/* Decorative Background */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-6 py-5 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center max-w-4xl gap-4 mx-auto">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              className="p-2.5 hover:bg-muted rounded-xl transition-all duration-200 text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/chat')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-semibold text-foreground">New Chat</h1>
            <p className="text-sm text-muted-foreground">
              Search for users to start a conversation
            </p>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="relative z-10 p-5 border-b border-border/30">
        <div className="relative max-w-4xl mx-auto">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground">
            <Search className="w-5 h-5" />
          </span>
          <Input
            placeholder="Search by name or email..."
            className="w-full pl-12 pr-12 py-3.5 h-auto border border-border/50 rounded-2xl bg-muted/30 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:bg-background transition-all duration-200"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            autoFocus
          />
          {searchLoading && (
            <span className="absolute inset-y-0 right-0 flex items-center pr-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </span>
          )}
        </div>
      </div>

      {/* Search Results */}
      <div className="relative z-10 flex-1 p-3 overflow-y-auto custom-scrollbar">
        {searchLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Searching directory...
            </p>
          </div>
        ) : searchResults && searchResults.length > 0 ? (
          <div className="grid max-w-4xl grid-cols-1 gap-2 mx-auto">
            {searchResults
              .filter(candidate => candidate.id !== user?.id)
              .map(candidate => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/20 rounded-xl group"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-11 w-11 ring-2 ring-border/50">
                        <AvatarImage
                          src={getAvatarUrl(candidate.avatar)}
                          alt={candidate.name}
                        />
                        <AvatarFallback className="text-sm font-semibold text-white bg-gradient-to-br from-primary via-secondary to-accent">
                          {candidate.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {globalOnlineUsers.includes(candidate.id) && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {candidate.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {globalOnlineUsers.includes(candidate.id) ? (
                          <span className="font-medium text-green-500">
                            Online
                          </span>
                        ) : (
                          'Offline'
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 transition-colors rounded-lg opacity-0 hover:bg-primary/10 group-hover:opacity-100"
                    onClick={() =>
                      handleCreateChat(candidate.id, candidate.name)
                    }
                    disabled={creatingChatRoom}
                  >
                    {pendingChatUserId === candidate.id ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <MessageSquarePlus className="w-5 h-5 text-primary" />
                    )}
                  </Button>
                </div>
              ))}
          </div>
        ) : debouncedSearchQuery ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-20 h-20 mb-5 bg-muted/50 rounded-3xl ring-1 ring-border/50">
              <Users className="w-10 h-10 text-muted-foreground/60" />
            </div>
            <p className="font-medium text-muted-foreground">No users found</p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              We couldn't find anyone matching "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex items-center justify-center w-20 h-20 mb-5 bg-muted/50 rounded-3xl ring-1 ring-border/50">
              <Users className="w-10 h-10 text-muted-foreground/60" />
            </div>
            <p className="font-medium text-muted-foreground">
              Search for users to start chatting
            </p>
            <p className="mt-1 text-sm text-muted-foreground/60">
              Enter a name or email address above
            </p>
          </div>
        )}
      </div>

      {/* Friends Section */}
      <div className="relative z-10 border-t border-border/50 bg-muted/20">
        <div className="px-5 py-4">
          <h3 className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-muted-foreground">
            <Heart className="w-3.5 h-3.5" />
            Your Friends
          </h3>
        </div>
        <div className="px-3 pb-3 overflow-y-auto max-h-52 custom-scrollbar">
          {friendshipsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
            </div>
          ) : friends.length > 0 ? (
            friends.map(friend => (
              <div
                key={friend.id}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/20 rounded-xl group"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-11 w-11 ring-2 ring-border/50">
                      <AvatarImage
                        src={getAvatarUrl(friend.avatar)}
                        alt={friend.name}
                      />
                      <AvatarFallback className="text-sm font-semibold text-white bg-gradient-to-br from-primary via-secondary to-accent">
                        {friend.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {globalOnlineUsers.includes(friend.id) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-background rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{friend.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {globalOnlineUsers.includes(friend.id) ? (
                        <span className="font-medium text-green-500">
                          Online
                        </span>
                      ) : (
                        'Offline'
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-2 transition-colors rounded-lg opacity-0 hover:bg-primary/10 group-hover:opacity-100"
                  onClick={() => handleCreateChat(friend.id, friend.name)}
                  disabled={creatingChatRoom}
                >
                  {pendingChatUserId === friend.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <MessageSquarePlus className="w-5 h-5 text-primary" />
                  )}
                </Button>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="mb-1 text-sm text-muted-foreground">
                No friends yet
              </p>
              <p className="text-xs text-muted-foreground/70">
                Search for users to add friends
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
