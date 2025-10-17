import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppSelector } from "@/app/hooks";
import { useSearchUsersQuery } from "@/services/userApi";
import { useCreateChatRoomMutation } from "@/services/chatApi";
import { useDebounce } from "@/utils/hooks";
import { toast } from "@/hooks/use-toast";

import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Search, Loader2, MessageSquare, Sparkles, ShieldCheck } from "lucide-react";

export default function NewChat() {
  const user = useAppSelector((state) => state.auth.user);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const navigate = useNavigate();

  const { data: searchResults, isLoading: searchLoading, error: searchError } = useSearchUsersQuery({ query: debouncedSearchQuery }, { skip: !debouncedSearchQuery });
  const [createChatRoom, { isLoading: creatingChatRoom }] = useCreateChatRoomMutation();

  const handleCreateChat = async (participantId: number) => {
    try {
      const selectedUser = searchResults?.find((candidate) => candidate.id === participantId);
      if (!selectedUser || !user) {
        toast({
          title: "User not available",
          description: "We couldn't identify that profile. Refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      const response = await createChatRoom({ participants: [user, selectedUser] }).unwrap();
      toast({
        title: "Conversation created",
        description: `We opened a direct line with ${selectedUser.name}.`,
      });
      navigate(`/chat/${response.id}`);
    } catch (error) {
      console.error("Failed to create chat room:", error);
      toast({
        title: "Unable to create chat",
        description: "Something went sideways. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <section className="rounded-2xl border border-border bg-background px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium uppercase text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              New chat
            </div>
            <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">Start a direct conversation</h1>
            <p className="max-w-xl text-sm text-muted-foreground">Find a teammate or friend to open a new chat. We handle the room and realtime setup automatically.</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground sm:max-w-xs">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <ShieldCheck className="h-4 w-4" />
              Secure defaults
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Chats inherit the same Channels, Redis, and Postgres stack you use elsewhere in the app.</p>
          </div>
        </div>
      </section>

      <Card className="border border-border bg-background/70">
        <CardContent className="space-y-5 p-4 sm:p-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email"
              className="h-11 rounded-full border border-border bg-background pl-10 text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/30"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <ScrollArea className="h-[340px] w-full rounded-xl border border-border bg-background/60 p-3">
            {searchLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : searchError ? (
              <div className="rounded-lg border border-red-300/60 bg-red-50 p-5 text-center text-sm text-red-600 dark:border-red-400/40 dark:bg-red-900/40 dark:text-red-100">
                We couldn't search right now. Refresh and try again.
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults
                  .filter((candidate) => candidate.id !== user?.id)
                  .map((candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-3 transition hover:border-primary/30">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border bg-muted/40">
                          <AvatarImage src={candidate.avatar} alt={candidate.name} />
                          <AvatarFallback className="text-sm font-semibold text-primary">{candidate.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{candidate.name}</p>
                          <p className="text-xs text-muted-foreground">{candidate.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-full border border-border text-sm font-semibold text-primary hover:bg-primary/10"
                        onClick={() => handleCreateChat(candidate.id)}
                        disabled={creatingChatRoom}
                      >
                        <MessageSquare className="h-4 w-4" />
                        Create
                      </Button>
                    </div>
                  ))}
              </div>
            ) : debouncedSearchQuery ? (
              <EmptyResults message="No matching teammates yet. Invite them or try a different email." />
            ) : (
              <EmptyResults message="Search for someone to start a conversation." />
            )}
          </ScrollArea>

          <div className="rounded-xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground">
            Start a multi-person conversation from the sidebar by creating a group chat after selecting the participants you need.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyResults({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">{message}</div>;
}
