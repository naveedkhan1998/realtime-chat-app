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
import { cn, getAvatarUrl } from '@/lib/utils';
import { ChatRoom } from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';

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
}: ChatHeaderProps) {
  return (
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
            {huddleUsers.map(p => (
              <Avatar
                key={p.id}
                className="w-8 h-8 border-2 border-background ring-2 ring-green-500/20"
              >
                <AvatarImage src={getAvatarUrl(p.avatar)} />
                <AvatarFallback className="text-[10px] bg-muted">
                  {p.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ))}
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
  );
}
