import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
  Mail,
  UserPlus,
  ArrowRight
} from 'lucide-react';

export default function NewChat() {
  const user = useAppSelector(state => state.auth.user);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const navigate = useNavigate();

  const {
    data: searchResults,
    isLoading: searchLoading,
  } = useSearchUsersQuery(
    { query: debouncedSearchQuery },
    { skip: !debouncedSearchQuery }
  );
  const [createChatRoom, { isLoading: creatingChatRoom }] =
    useCreateChatRoomMutation();

  const handleCreateChat = async (participantId: number) => {
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
    }
  };

  return (
    <div className="relative flex flex-col h-full gap-6 p-6 overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Directory</h1>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            <Globe className="w-3 h-3 mr-1" />
            Global Search
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground">Discover people and start new conversations.</p>
      </div>

      {/* Search Area */}
      <div className="relative z-10 w-full max-w-3xl mx-auto mt-4">
        <div className="relative group">
          <div className="absolute transition duration-1000 -inset-1 bg-gradient-to-r from-primary to-violet-600 rounded-3xl blur opacity-20 group-hover:opacity-40 group-hover:duration-200"></div>
          <div className="relative">
            <Search className="absolute w-6 h-6 transition-colors -translate-y-1/2 left-5 top-1/2 text-muted-foreground group-focus-within:text-primary" />
            <Input
              placeholder="Search for anyone by name or email..."
              className="h-16 text-lg transition-all shadow-xl pl-14 bg-background border-white/10 rounded-2xl focus:ring-2 focus:ring-primary/20"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoFocus
            />
          </div>
        </div>
      </div>

      {/* Results Area */}
      <div className="relative z-10 flex-1 pr-2 mt-4 overflow-y-auto custom-scrollbar">
        {searchLoading ? (
          <div className="flex flex-col items-center justify-center gap-4 h-60">
            <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
            <p className="text-muted-foreground animate-pulse">Searching the directory...</p>
          </div>
        ) : searchResults && searchResults.length > 0 ? (
          <div className="grid max-w-5xl grid-cols-1 gap-4 mx-auto md:grid-cols-2 lg:grid-cols-3">
            {searchResults
              .filter(candidate => candidate.id !== user?.id)
              .map(candidate => (
                <div
                  key={candidate.id}
                  className="relative flex items-center gap-4 p-4 transition-all duration-300 border group rounded-3xl border-white/5 bg-background/40 backdrop-blur-xl hover:bg-background/60 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
                >
                  <Avatar className="transition-transform border-2 shadow-sm h-14 w-14 border-background group-hover:scale-105 ring-2 ring-transparent group-hover:ring-primary/10">
                    <AvatarImage src={candidate.avatar} alt={candidate.name} />
                    <AvatarFallback className="text-lg font-bold text-white bg-gradient-to-br from-primary to-violet-600">
                      {candidate.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <h3 className="text-base font-semibold truncate text-foreground">{candidate.name}</h3>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                      <Mail className="w-3 h-3 opacity-70" />
                      {candidate.email}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    className="transition-all translate-x-2 rounded-full shadow-none opacity-0 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-md group-hover:opacity-100 group-hover:translate-x-0"
                    onClick={() => handleCreateChat(candidate.id)}
                    disabled={creatingChatRoom}
                  >
                    <MessageSquarePlus className="w-5 h-5" />
                  </Button>
                </div>
              ))}
          </div>
        ) : debouncedSearchQuery ? (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="flex items-center justify-center w-20 h-20 mb-6 border rounded-3xl bg-destructive/5 border-destructive/10">
              <UserPlus className="w-10 h-10 text-destructive/40" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">No users found</h3>
            <p className="max-w-sm mx-auto text-base text-muted-foreground">
              We couldn't find anyone matching "{searchQuery}". Try a different name or email.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="relative mb-8">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
              <div className="relative flex items-center justify-center w-24 h-24 border shadow-2xl rounded-3xl bg-gradient-to-br from-primary/10 to-violet-500/10 border-white/10">
                <Sparkles className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h3 className="mb-3 text-2xl font-bold text-foreground">Global Directory</h3>
            <p className="max-w-md text-lg leading-relaxed text-center text-muted-foreground">
              Search for anyone in the organization to start a secure, encrypted conversation instantly.
            </p>
            
            <div className="grid w-full max-w-2xl grid-cols-1 gap-4 mt-12 sm:grid-cols-3 opacity-70">
              {[
                { icon: Search, label: "Search" },
                { icon: ArrowRight, label: "Select" },
                { icon: MessageSquarePlus, label: "Chat" }
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-2 p-4 border rounded-2xl bg-white/5 border-white/5">
                  <step.icon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
