import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, Users, MessageSquare, Loader2, Check } from 'lucide-react';
import { useCreateChatRoomMutation } from '@/services/chatApi';
import { useSearchUsersQuery } from '@/services/userApi';
import { useAppSelector } from '@/app/hooks';
import { selectGlobalOnlineUsers } from '@/features/unifiedChatSlice';
import { toast } from '@/hooks/use-toast';
import { getAvatarUrl, cn } from '@/lib/utils';
import { Led, channelNo } from '@/components/console';

interface NewChatDialogProps {
  trigger?: React.ReactNode;
}

export const NewChatDialog: React.FC<NewChatDialogProps> = ({ trigger }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: searchResults, isLoading } = useSearchUsersQuery(
    { query: searchQuery },
    { skip: !searchQuery }
  );

  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [createChatRoom, { isLoading: creatingChat }] =
    useCreateChatRoomMutation();
  const navigate = useNavigate();

  const currentUser = useAppSelector(state => state.auth.user);
  const globalOnlineUsers = useAppSelector(selectGlobalOnlineUsers);

  const filteredUsers =
    searchResults?.filter(user => user.id !== currentUser?.id) || [];

  const handleUserSelect = (userId: number) => {
    if (isGroup) {
      setSelectedUserIds(prev =>
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    } else {
      setSelectedUserIds([userId]);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        name: isGroup ? groupName.trim() : undefined,
        is_group_chat: isGroup,
        participant_ids: selectedUserIds,
      };
      const chatRoom = await createChatRoom(payload).unwrap();
      setSearchQuery('');
      setIsGroup(false);
      setGroupName('');
      setSelectedUserIds([]);
      setIsDialogOpen(false);
      navigate(`/chat/${chatRoom.id}`);
      toast({
        title: isGroup ? 'Channel Provisioned' : 'Channel Open',
        description: isGroup
          ? `${chatRoom.name ?? 'Group bus'} is online.`
          : 'Direct station channel established.',
      });
    } catch (error) {
      console.error('Error creating chat room:', error);
      toast({
        title: 'Patch Bay Failure',
        description: 'Unable to establish new channel connection.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            size="sm"
            className="w-full font-mono text-xs gap-1.5"
          >
            <Plus className="size-3.5" />
            OPEN CHANNEL
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="w-full sm:max-w-[440px] p-0 overflow-hidden border border-border bg-card">
        {/* Hardware Header Strip */}
        <DialogHeader className="p-4 border-b border-border bg-well/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="label-engraved text-primary font-bold">
              &sect;02 / PATCH BAY
            </span>
            <span className="ticks h-1 flex-1 opacity-60" aria-hidden />
          </div>
          <DialogTitle className="font-mono text-base font-bold tracking-tight text-foreground">
            INITIALIZE CHANNEL
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Channel Mode Rocker */}
          <div className="flex rounded-lg border border-border bg-well p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setIsGroup(false);
                setSelectedUserIds([]);
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded font-mono text-xs font-semibold transition-all cursor-pointer',
                !isGroup
                  ? 'bg-card text-foreground shadow-key border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MessageSquare className="size-3.5" />
              DIRECT [P2P]
            </button>
            <button
              type="button"
              onClick={() => {
                setIsGroup(true);
                setSelectedUserIds([]);
              }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded font-mono text-xs font-semibold transition-all cursor-pointer',
                isGroup
                  ? 'bg-card text-foreground shadow-key border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="size-3.5" />
              GROUP [BUS]
            </button>
          </div>

          {/* Group Name input if Group Mode */}
          {isGroup && (
            <div className="space-y-1.5">
              <label className="label-engraved text-foreground">
                Group Identifier
              </label>
              <Input
                placeholder="e.g. OPERATIONS-MAIN"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="font-mono text-xs h-9"
              />
            </div>
          )}

          {/* Search Well */}
          <div className="space-y-1.5">
            <label className="label-engraved text-muted-foreground">
              Station Directory Scan
            </label>
            <div className="relative">
              <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search callsign or handle..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="font-mono text-xs h-9 pl-9"
              />
            </div>
          </div>

          {/* Operator Directory List */}
          <ScrollArea className="h-56 rounded-lg border border-border bg-well/40 p-2">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 font-mono text-xs text-muted-foreground">
                <Loader2 className="size-5 animate-spin text-primary" />
                <span>SCANNING DIRECTORY...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 font-mono text-xs text-muted-foreground text-center px-4">
                {searchQuery ? (
                  <>
                    <span className="text-foreground font-semibold">NO OPERATORS MATCHED</span>
                    <span className="text-2xs text-muted-foreground/70 mt-1">
                      Check frequency or callsign query
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-foreground font-semibold">PATCH RECEPTACLE READY</span>
                    <span className="text-2xs text-muted-foreground/70 mt-1">
                      Enter callsign to scan station grid
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map(u => {
                  const isSelected = selectedUserIds.includes(u.id);
                  const isOnline = globalOnlineUsers.includes(u.id);

                  return (
                    <div
                      key={u.id}
                      onClick={() => handleUserSelect(u.id)}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-md font-mono text-xs cursor-pointer transition-colors border',
                        isSelected
                          ? 'bg-card border-primary text-foreground shadow-sm'
                          : 'border-transparent hover:bg-card/60 hover:border-border text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <Avatar className="size-7 rounded-md border border-border">
                            <AvatarImage src={getAvatarUrl(u.avatar)} alt={u.name} />
                            <AvatarFallback className="font-mono text-2xs bg-well">
                              {u.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <Led
                              tone="live"
                              className="absolute -bottom-0.5 -right-0.5 ring-1 ring-card"
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold truncate">{u.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            OP·{channelNo(u.id)}
                          </div>
                        </div>
                      </div>

                      <div
                        className={cn(
                          'size-5 rounded flex items-center justify-center border transition-colors shrink-0',
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border bg-well'
                        )}
                      >
                        {isSelected && <Check className="size-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-3 border-t border-border bg-well/50">
          <div className="font-mono text-2xs text-muted-foreground">
            {selectedUserIds.length}{' '}
            {selectedUserIds.length === 1 ? 'OPERATOR' : 'OPERATORS'} LINKED
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              className="font-mono text-xs h-8 px-3"
            >
              CANCEL
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={
                creatingChat ||
                (isGroup
                  ? !groupName.trim() || selectedUserIds.length === 0
                  : selectedUserIds.length !== 1)
              }
              className="font-mono text-xs h-8 px-4"
            >
              {creatingChat ? (
                <>
                  <Loader2 className="size-3 animate-spin mr-1.5" />
                  CONNECTING...
                </>
              ) : (
                'CONNECT'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewChatDialog;
