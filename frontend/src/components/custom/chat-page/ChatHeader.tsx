import { useState } from 'react';
import {
  ArrowLeft,
  Phone,
  PhoneCall,
  PhoneOff,
  Activity,
  Radio,
  Mic,
  MicOff,
  PanelRight,
  MoreVertical,
  Info,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import WebRTCStats, {
  ConnectionDetail,
  SfuStats,
} from '@/components/custom/WebRTCStats';
import { Led, PresetKey, channelNo } from '@/components/console';

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
  isMuted?: boolean;
  onToggleMute?: () => void;
  speakingUserIds?: number[];
  connectionDetails?: Record<number, ConnectionDetail>;
  isUsingSfu?: boolean;
  sfuStats?: SfuStats | null;
  onInfoClick?: () => void;
  isInfoOpen?: boolean;
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
  isMuted = false,
  onToggleMute,
  speakingUserIds = [],
  connectionDetails,
  isUsingSfu,
  sfuStats,
  onInfoClick,
  isInfoOpen = false,
}: ChatHeaderProps) {
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);

  // For P2P mode: filter huddle users that have connection details
  const connectedPeers = huddleUsers.filter(
    p =>
      connectionDetails && (connectionDetails as Record<number, unknown>)[p.id]
  );

  const hasActiveConnection =
    connectedPeers.length > 0 ||
    (isUsingSfu && sfuStats && (sfuStats.publish || sfuStats.subscribe));

  const isGroup = Boolean(activeRoom?.is_group_chat);
  const activeMembersCount = presence.filter(p => p.id !== user.id).length;
  const isOnline = activeMembersCount > 0;

  return (
    <>
      <header className="relative z-20 flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-border bg-card shrink-0">
        {/* Left Side: Back button + Profile/Channel Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {isMobile && (
            <button
              onClick={() => setActiveChat(undefined)}
              className="size-8 rounded-full key flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0 active:scale-95 transition-all"
              aria-label="Back to channels"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Interactive Channel Identity Area */}
          <button
            type="button"
            onClick={onInfoClick}
            className="flex items-center gap-2.5 min-w-0 text-left rounded-lg p-1 -m-1 hover:bg-well transition-colors group cursor-pointer focus:outline-none"
            title="View channel parameters"
          >
            {isGroup ? (
              <PresetKey
                name={activeRoom?.name}
                active={false}
                live={isHuddleActive}
                size="md"
              />
            ) : (
              <div className="relative shrink-0">
                <Avatar className="w-9 h-9 border border-border">
                  <AvatarImage
                    src={getAvatarUrl(otherParticipant.avatar)}
                    alt={otherParticipant.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="font-mono font-bold text-xs">
                    {otherParticipant.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                {isOnline && (
                  <Led tone="live" className="absolute -bottom-0.5 -right-0.5 ring-1 ring-card" />
                )}
              </div>
            )}

            {/* Title & Status */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">
                  {isGroup
                    ? activeRoom?.name || 'Group Channel'
                    : otherParticipant.name}
                </h2>
                {activeRoom?.id && (
                  <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-well text-muted-foreground hidden sm:inline-block">
                    CH·{channelNo(activeRoom.id)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-muted-foreground truncate">
                {isHuddleActive ? (
                  <span className="text-live font-semibold flex items-center gap-1 truncate">
                    <Led tone="live" blink />
                    ON AIR · {huddleUsers.length} CONNECTED
                  </span>
                ) : huddleUsers.length > 0 ? (
                  <span className="text-live font-semibold flex items-center gap-1 truncate">
                    <Radio className="w-3 h-3 text-live animate-pulse shrink-0" />
                    VOX ACTIVE ({huddleUsers.length})
                  </span>
                ) : isOnline ? (
                  <span className="text-live flex items-center gap-1 truncate">
                    <Led tone="live" />
                    {isGroup ? `${activeMembersCount} ONLINE` : 'ONLINE'}
                  </span>
                ) : (
                  <span className="text-muted-foreground/80 truncate">
                    {isGroup
                      ? `${activeRoom?.participants.length || 0} OPERATORS`
                      : 'OFFLINE'}
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Right Side: Call Controls + Telemetry + Details Toggle */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Active Speakers avatars */}
          {huddleUsers.length > 0 && !isMobile && (
            <div className="flex items-center -space-x-1.5 mr-1">
              {huddleUsers.slice(0, 3).map(p => {
                const isSpeaking = speakingUserIds.includes(p.id);
                return (
                  <div key={p.id} className="relative">
                    <Avatar
                      className={cn(
                        'w-7 h-7 border ring-1 transition-all',
                        isSpeaking
                          ? 'ring-live border-live animate-pulse'
                          : 'ring-card border-card'
                      )}
                    >
                      <AvatarImage src={getAvatarUrl(p.avatar)} />
                      <AvatarFallback className="font-mono text-[9px] bg-well font-bold">
                        {p.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inline Mute Key */}
          {isHuddleActive && onToggleMute && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggleMute}
                    className={cn(
                      'size-8 rounded-full flex items-center justify-center transition-all',
                      isMuted
                        ? 'bg-destructive text-destructive-foreground shadow-key'
                        : 'key text-live hover:text-live'
                    )}
                    aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  >
                    {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span className="font-mono text-xs">{isMuted ? 'UNMUTE [TX]' : 'MUTE [TX]'}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Voice Broadcast Action Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                {isHuddleActive ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={stopHuddle}
                    className="h-8 px-3 font-mono text-xs font-bold gap-1.5 active:translate-y-px"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>LEAVE</span>
                  </Button>
                ) : huddleUsers.length > 0 ? (
                  <button
                    onClick={startHuddle}
                    className="h-8 px-3 rounded-full bg-live text-live-foreground font-mono text-xs font-bold flex items-center gap-1.5 shadow-key active:translate-y-px"
                  >
                    <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                    <span>JOIN ({huddleUsers.length})</span>
                  </button>
                ) : (
                  <Button
                    onClick={startHuddle}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 font-mono text-xs font-semibold gap-1.5"
                    aria-label="Start voice broadcast"
                  >
                    <Phone className="w-3.5 h-3.5 text-live" />
                    <span>VOX</span>
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span className="font-mono text-xs">
                  {isHuddleActive ? 'DISCONNECT HUDDLE' : 'INITIATE VOICE TRANSMISSION'}
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Telemetry Stats Key */}
          {hasActiveConnection && !isMobile && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="size-8 rounded-full key flex items-center justify-center text-live hover:text-live transition-colors"
                    onClick={() => setShowConnectionDetails(true)}
                    aria-label="WebRTC Telemetry"
                  >
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span className="font-mono text-xs">WEBRTC DIAGNOSTICS</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Parameters Panel Toggle */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    'size-8 rounded-full flex items-center justify-center transition-all',
                    isInfoOpen
                      ? 'key-signal font-bold'
                      : 'key text-muted-foreground hover:text-foreground'
                  )}
                  onClick={onInfoClick}
                  aria-label="Channel parameters"
                >
                  <PanelRight className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span className="font-mono text-xs">
                  {isInfoOpen ? 'HIDE PARAMETERS' : 'CHANNEL PARAMETERS'}
                </span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Mobile Overflow Menu */}
          {isMobile && hasActiveConnection && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="size-8 rounded-full key flex items-center justify-center text-muted-foreground hover:text-foreground">
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setShowConnectionDetails(true)}
                  className="gap-2 text-xs font-mono"
                >
                  <Activity className="w-3.5 h-3.5 text-live" />
                  <span>DIAGNOSTICS</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onInfoClick} className="gap-2 text-xs font-mono">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  <span>PARAMETERS</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* WebRTC Diagnostics Dialog */}
      {isMobile ? (
        <Drawer
          open={showConnectionDetails}
          onOpenChange={setShowConnectionDetails}
        >
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-0 text-left">
              <DrawerTitle className="label-engraved">NETWORK TELEMETRY</DrawerTitle>
              <DrawerDescription className="font-mono text-xs text-muted-foreground">
                Live WebRTC & Audio Diagnostics
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-y-auto max-h-[65vh] pt-3">
              <WebRTCStats
                connectionDetails={connectionDetails || {}}
                connectedPeers={connectedPeers}
                isUsingSfu={isUsingSfu}
                sfuStats={sfuStats}
                scrollable={false}
              />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={showConnectionDetails}
          onOpenChange={setShowConnectionDetails}
        >
          <DialogContent className="max-w-lg p-0 bg-card overflow-hidden">
            <DialogHeader className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="label-engraved">NETWORK TELEMETRY</DialogTitle>
                  <DialogDescription className="font-mono text-xs text-muted-foreground mt-0.5">
                    Mode: {isUsingSfu ? 'Cloudflare Edge SFU' : 'P2P Mesh'} · {connectedPeers.length} Peers
                  </DialogDescription>
                </div>
                <Led tone="live" blink />
              </div>
            </DialogHeader>
            <div className="p-4">
              <WebRTCStats
                connectionDetails={connectionDetails || {}}
                connectedPeers={connectedPeers}
                isUsingSfu={isUsingSfu}
                sfuStats={sfuStats}
                scrollable={true}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
