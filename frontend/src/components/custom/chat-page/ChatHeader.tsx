import {
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, getAvatarUrl } from '@/lib/utils';
import { ChatRoom } from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';

interface ChatHeaderProps {
  activeRoom: ChatRoom | undefined;
  otherParticipant: UserProfile;
  presence: UserProfile[];
  user: UserProfile;
  isMobile: boolean;
  setActiveChat: (chatId: number | undefined) => void;
  huddleUsers: Array<{ id: number; name: string; avatar: string }>;
  isHuddleActive: boolean;
  startHuddle: () => void;
  stopHuddle: () => void;
  connectionDetails?: Record<number, any>;
}

export default function ChatHeader({
  activeRoom,
  otherParticipant,
  presence,
  user,
  isMobile,
  setActiveChat,
  huddleUsers,
  isHuddleActive,
  startHuddle,
  stopHuddle,
  connectionDetails,
}: ChatHeaderProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const details = selectedParticipant
    ? connectionDetails?.[selectedParticipant.id]
    : null;

  const renderDetailsContent = () => {
    if (!details) return <p className="text-sm text-muted-foreground">No connection details available.</p>;

    return (
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-muted/50">
          <h4 className="mb-2 text-sm font-medium">Active Connection</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-muted-foreground">Type:</div>
            <div className="font-medium text-primary">{details.type}</div>
            <div className="text-muted-foreground">Local Protocol:</div>
            <div>{details.activePair?.local?.protocol?.toUpperCase() || 'N/A'}</div>
            <div className="text-muted-foreground">Local Type:</div>
            <div>{details.activePair?.local?.candidateType || 'N/A'}</div>
            <div className="text-muted-foreground">Remote Type:</div>
            <div>{details.activePair?.remote?.candidateType || 'N/A'}</div>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">Candidate Pairs Tried</h4>
          <ScrollArea className="h-[200px] rounded-md border p-2">
            <div className="space-y-2">
              {details.candidatePairs?.map((pair: any) => (
                <div
                  key={pair.id}
                  className={cn(
                    "p-2 text-xs rounded border",
                    pair.selected ? "bg-primary/10 border-primary/20" : "bg-background border-border"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "font-medium",
                      pair.state === 'succeeded' ? "text-green-500" :
                      pair.state === 'failed' ? "text-red-500" : "text-yellow-500"
                    )}>
                      {pair.state.toUpperCase()}
                    </span>
                    {pair.selected && <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">Active</span>}
                  </div>
                  <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center text-[10px] text-muted-foreground">
                    <div className="truncate" title={pair.local?.address}>
                      L: {pair.local?.type} ({pair.local?.protocol})
                    </div>
                    <div>↔</div>
                    <div className="text-right truncate" title={pair.remote?.address}>
                      R: {pair.remote?.type} ({pair.remote?.protocol})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  return (
    <>
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-6 py-4 border-b shadow-sm bg-background/80 backdrop-blur-xl border-border/40">
        <div className="flex items-center flex-1 gap-3">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveChat(undefined)}
              className="w-8 h-8 -ml-2 rounded-full hover:bg-primary/10"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Avatar className="w-10 h-10 border-2 shadow-sm border-background ring-2 ring-primary/10">
            <AvatarImage
              src={
                activeRoom?.is_group_chat
                  ? ''
                  : getAvatarUrl(otherParticipant.avatar)
              }
              alt={activeRoom?.name || otherParticipant.name}
            />
            <AvatarFallback className="font-bold bg-primary/10 text-primary">
              {(activeRoom?.is_group_chat
                ? activeRoom.name
                : otherParticipant.name
              )?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate text-foreground">
              {activeRoom?.name || otherParticipant.name}
            </p>
            <div className="flex items-center gap-2">
              {presence.filter(p => p.id !== user.id).length > 0 ? (
                <>
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex w-full h-full bg-green-400 rounded-full opacity-75 animate-ping"></span>
                    <span className="relative inline-flex w-2 h-2 bg-green-500 rounded-full"></span>
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {activeRoom?.is_group_chat
                      ? `${presence.filter(p => p.id !== user.id).length} active`
                      : 'Active now'}
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Offline</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Huddle Participants */}
          {huddleUsers.length > 0 && (
            <div className="flex items-center mr-3 -space-x-2">
              <TooltipProvider>
                {huddleUsers.map(p => (
                  <Tooltip key={p.id}>
                    <TooltipTrigger asChild>
                      <div onClick={() => setSelectedParticipant(p)}>
                        <Avatar className="w-8 h-8 transition-all border-2 cursor-pointer border-background ring-2 ring-green-500/20 hover:ring-green-500">
                          <AvatarImage src={getAvatarUrl(p.avatar)} />
                          <AvatarFallback className="text-[10px] bg-muted">
                            {p.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </TooltipTrigger>
                    {connectionDetails && connectionDetails[p.id] && (
                      <TooltipContent>
                        <p>{connectionDetails[p.id].type}</p>
                        <p className="text-[10px] ">Click for details</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          )}

          <Button
            variant={isHuddleActive ? 'destructive' : 'ghost'}
            size="icon"
            className={cn(
              'h-9 w-9 rounded-full transition-all',
              isHuddleActive && 'animate-pulse shadow-lg shadow-destructive/20'
            )}
            onClick={isHuddleActive ? stopHuddle : startHuddle}
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 hover:bg-primary/10 text-muted-foreground hover:text-primary"
          >
            <Video className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 hover:bg-primary/10 text-muted-foreground hover:text-primary"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Search in Chat</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {isMobile ? (
        <Drawer open={!!selectedParticipant} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Connection Details</DrawerTitle>
              <DrawerDescription>
                WebRTC stats for {selectedParticipant?.name}
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4">
              {renderDetailsContent()}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={!!selectedParticipant} onOpenChange={(open) => !open && setSelectedParticipant(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connection Details</DialogTitle>
              <DialogDescription>
                WebRTC stats for {selectedParticipant?.name}
              </DialogDescription>
            </DialogHeader>
            {renderDetailsContent()}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
