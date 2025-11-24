import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import { AppShellContext } from '@/layouts/AppShell';
import { useAppSelector } from '@/app/hooks';
import { useSearchUsersQuery } from '@/services/userApi';
import { useCreateChatRoomMutation } from '@/services/chatApi';
import { useDebounce } from '@/utils/hooks';
import { toast } from '@/hooks/use-toast';

import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Search,
  Loader2,
  MessageSquarePlus,
  Sparkles,
  Globe,
  UserPlus,
  ArrowLeft,
} from 'lucide-react';

export default function NewChatPage() {
  const user = useAppSelector(state => state.auth.user);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const navigate = useNavigate();
  const { isMobile } = useOutletContext<AppShellContext>();

  const { data: searchResults, isLoading: searchLoading } = useSearchUsersQuery(
    { query: debouncedSearchQuery },
    { skip: !debouncedSearchQuery }
  );
  const [createChatRoom, { isLoading: creatingChatRoom }] =
    useCreateChatRoomMutation();
  const [pendingChatUserId, setPendingChatUserId] = useState<number | null>(
    null
  );

  const handleCreateChat = async (participantId: number) => {
    setPendingChatUserId(participantId);
    try {
      const selectedUser = searchResults?.find(
        candidate => candidate.id === participantId
      );
      if (!selectedUser || !user) {
        toast({
          title: 'User not available',
          description:
            "We couldn't identify that profile. Refresh and try again.",
          variant: 'destructive',
        });
        return;
      }

      const response = await createChatRoom({
        participant_ids: [selectedUser.id],
      }).unwrap();
      toast({
        title: 'Chat ready',
        description: `You're now chatting with ${selectedUser.name}.`,
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
    <div className="relative flex flex-col h-full gap-6 p-4 md:p-8 overflow-hidden">
      <Helmet>
        <title>New Chat | MNK Chat</title>
        <meta name="description" content="Start a new conversation" />
      </Helmet>
      {/* Decorative Background */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col gap-4 max-w-4xl mx-auto w-full">
        {isMobile && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start pl-0 -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/chat')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              New Message
            </h1>
            <Badge
              variant="secondary"
              className="bg-primary/10 text-primary border-primary/20"
            >
              <Globe className="w-3 h-3 mr-1" />
              Directory
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Find people and start a conversation.
          </p>
        </div>

        {/* Search Area */}
        <div className="relative group w-full">
          <div className="absolute transition duration-1000 -inset-0.5 bg-gradient-to-r from-primary to-violet-600 rounded-2xl blur opacity-20 group-hover:opacity-40 group-hover:duration-200"></div>
          <div className="relative">
            <Search className="absolute w-5 h-5 transition-colors -translate-y-1/2 left-4 top-1/2 text-muted-foreground group-focus-within:text-primary" />
            <Input
              placeholder="Search by name or email..."
              className="h-14 text-base transition-all shadow-lg pl-12 bg-background/80 border-border/50 rounded-xl focus:bg-background focus:ring-2 focus:ring-primary/20 backdrop-blur-xl placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="relative z-10 flex-1 w-full max-w-4xl mx-auto mt-2 overflow-y-auto custom-scrollbar pr-2">
        {searchLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
            <p className="text-sm text-muted-foreground animate-pulse">
              Searching directory...
            </p>
          </div>
        ) : searchResults && searchResults.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {searchResults
              .filter(candidate => candidate.id !== user?.id)
              .map(candidate => (
                <div
                  key={candidate.id}
                  className="relative flex items-center gap-4 p-3 transition-all duration-200 border group rounded-2xl border-border/40 bg-card/50 hover:bg-accent/50 hover:border-primary/20 hover:shadow-md"
                >
                  <Avatar className="transition-transform border shadow-sm h-12 w-12 border-border/50 group-hover:scale-105">
                    <AvatarImage src={candidate.avatar} alt={candidate.name} />
                    <AvatarFallback className="text-base font-bold text-primary-foreground bg-primary/80">
                      {candidate.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h3 className="text-sm font-semibold truncate text-foreground">
                      {candidate.name}
                    </h3>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 px-4 transition-all rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground shadow-none hover:shadow-md"
                    onClick={() => handleCreateChat(candidate.id)}
                    disabled={creatingChatRoom}
                  >
                    {pendingChatUserId === candidate.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquarePlus className="w-4 h-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Chat</span>
                  </Button>
                </div>
              ))}
          </div>
        ) : debouncedSearchQuery ? (
          <div className="flex flex-col items-center justify-center py-16 text-center opacity-80">
            <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-muted">
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-foreground">
              No users found
            </h3>
            <p className="text-sm text-muted-foreground">
              We couldn't find anyone matching "{searchQuery}".
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 opacity-60">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-primary/40 blur-xl" />
              <div className="relative flex items-center justify-center w-20 h-20 border shadow-xl rounded-2xl bg-card border-border/50">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
            </div>
            <p className="max-w-sm text-center text-muted-foreground">
              Type a name or email above to find people in the global directory.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
