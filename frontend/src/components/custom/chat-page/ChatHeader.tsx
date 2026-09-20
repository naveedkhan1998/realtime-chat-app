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
  Hash,
  PanelRight,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
import WebRTCStats, {
  ConnectionDetail,
  SfuStats,
} from '@/components/custom/WebRTCStats';

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

  // Show the activity button if we have P2P connections OR if we have SFU stats
  const hasActiveConnection =
    connectedPeers.length > 0 ||
    (isUsingSfu && sfuStats && (sfuStats.publish || sfuStats.subscribe));

  const isGroup = Boolean(activeRoom?.is_group_chat);
  const activeMembersCount = presence.filter(p => p.id !== user.id).length;
  const isOnline = activeMembersCount > 0;

  return (
    <>
      <header className="relative z-20 flex items-center justify-between gap-3 px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-border/60 bg-card/70 backdrop-blur-xl shrink-0 shadow-sm">
        {/* Left Side: Back button + Avatar + Channel/User Identity */}
        <div className="flex items-center flex-1 gap-2.5 sm:gap-3 min-w-0">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveChat(undefined)}
              className="w-8 h-8 -ml-1.5 rounded-xl hover:bg-muted text-muted-foreground shrink-0"
              aria-label="Back to conversations list"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          {/* Identity Icon / Avatar */}
          {isGroup ? (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-bold shadow-inner shrink-0">
              <Hash className="w-5 h-5 stroke-[2.5]" />
            </div>
          ) : (
            <div className="relative shrink-0">
              <Avatar className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-border/60 shadow-inner">
                <AvatarImage
                  src={getAvatarUrl(otherParticipant.avatar)}
                  alt={otherParticipant.name}
                  className="object-cover"
                />
                <AvatarFallback className="font-bold bg-primary/10 text-primary rounded-xl text-xs sm:text-sm">
                  {otherParticipant.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              {isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-card shadow-sm shadow-emerald-500/50" />
              )}
            </div>
          )}

          {/* Title & Presence Subtitle */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-bold truncate text-foreground tracking-tight">
                {isGroup
                  ? `# ${activeRoom?.name || 'channel'}`
                  : otherParticipant.name}
              </h2>
              {isHuddleActive && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 hidden xs:inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  In Call
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {isHuddleActive ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  {huddleUsers.length} in call
                </span>
              ) : huddleUsers.length > 0 ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <PhoneCall className="w-3 h-3 text-emerald-400 animate-pulse" />
                  Voice call active ({huddleUsers.length})
                </span>
              ) : isOnline ? (
                <span className="text-emerald-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {isGroup ? `${activeMembersCount} active` : 'Active now'}
                </span>
              ) : (
                <span className="text-muted-foreground/80">
                  {isGroup
                    ? `${activeRoom?.participants.length || 0} members`
                    : 'Offline'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Voice Call Controls + Live Stats + Details Drawer Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Active Speaking / In-call Avatars */}
          {huddleUsers.length > 0 && (
            <div className="flex items-center -space-x-2 mr-1">
              <TooltipProvider delayDuration={150}>
                {huddleUsers.slice(0, 3).map(p => {
                  const isSpeaking = speakingUserIds.includes(p.id);
                  return (
                    <Tooltip key={p.id}>
                      <TooltipTrigger asChild>
                        <Avatar
                          className={cn(
                            'w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 border-background ring-2 transition-all duration-200',
                            isSpeaking
                              ? 'ring-emerald-500 ring-offset-1 scale-105'
                              : 'ring-purple-500/30'
                          )}
                        >
                          <AvatarImage src={getAvatarUrl(p.avatar)} />
                          <AvatarFallback className="text-[10px] bg-muted font-bold">
                            {p.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p>
                          {p.name} {isSpeaking && '• Speaking'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
              {huddleUsers.length > 3 && (
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-card border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  +{huddleUsers.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Connection Mode Badge */}
          {isHuddleActive && huddleUsers.length > 0 && (
            <span
              className={cn(
                'px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg border hidden sm:inline-block',
                isUsingSfu
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              )}
              title={
                isUsingSfu
                  ? 'Cloudflare SFU Multi-peer Routing'
                  : 'Direct P2P Mesh WebRTC'
              }
            >
              {isUsingSfu ? 'SFU' : 'P2P'}
            </span>
          )}

          {/* Telemetry Stats Button */}
          {hasActiveConnection && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                    onClick={() => setShowConnectionDetails(true)}
                    aria-label="WebRTC Telemetry"
                  >
                    <Activity className="w-4 h-4 animate-pulse" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>WebRTC Telemetry</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Inline Mute Toggle if in call */}
          {isHuddleActive && onToggleMute && (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isMuted ? 'destructive' : 'secondary'}
                    size="icon"
                    className={cn(
                      'w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all',
                      !isMuted &&
                        'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25 border border-emerald-500/25'
                    )}
                    onClick={onToggleMute}
                    aria-label={
                      isMuted ? 'Unmute microphone' : 'Mute microphone'
                    }
                  >
                    {isMuted ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{isMuted ? 'Unmute microphone' : 'Mute microphone'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Primary Voice Call Button */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                {isHuddleActive ? (
                  <Button
                    variant="destructive"
                    onClick={stopHuddle}
                    className="h-9 px-4 rounded-xl font-semibold text-xs shadow-md shadow-destructive/25 gap-2 active:scale-95 transition-all"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End Call</span>
                  </Button>
                ) : huddleUsers.length > 0 ? (
                  <Button
                    onClick={startHuddle}
                    className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/25 gap-2 active:scale-95 transition-all"
                  >
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                    <span>Join ({huddleUsers.length})</span>
                  </Button>
                ) : (
                  <Button
                    onClick={startHuddle}
                    className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-600/25 gap-2 active:scale-95 transition-all"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call</span>
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>
                  {isHuddleActive
                    ? 'End voice call'
                    : huddleUsers.length > 0
                      ? `Join active voice call (${huddleUsers.length} in call)`
                      : isGroup
                        ? 'Start group voice call'
                        : `Call ${otherParticipant.name}`}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Toggle Details Panel */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'w-8 h-8 sm:w-9 sm:h-9 rounded-xl transition-all',
                    isInfoOpen
                      ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                  onClick={onInfoClick}
                  aria-label="Conversation details"
                >
                  <PanelRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>
                  {isInfoOpen ? 'Hide Details' : 'Show Conversation Details'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      {/* WebRTC Live Stats Modal / Drawer */}
      {isMobile ? (
        <Drawer
          open={showConnectionDetails}
          onOpenChange={setShowConnectionDetails}
        >
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-0">
              <DrawerTitle className="sr-only">Call Diagnostics</DrawerTitle>
              <DrawerDescription className="sr-only">
                Live WebRTC connection metrics
              </DrawerDescription>
            </DrawerHeader>
            {/* Hero Banner */}
            <div className="mx-4 mt-2 mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-indigo-500/5 to-emerald-500/5 border border-primary/15">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-primary/15 border border-primary/25">
                  <Activity className="w-5 h-5 text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Call Diagnostics
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Live network & audio telemetry
                  </p>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-1 text-[10px] font-bold rounded-lg border',
                    isUsingSfu
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  )}
                >
                  {isUsingSfu ? 'SFU Relay' : 'P2P Mesh'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {connectedPeers.length} peer
                  {connectedPeers.length !== 1 ? 's' : ''} connected
                </span>
                <span className="flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-primary/70" />
                  {isUsingSfu ? 'Cloudflare Edge' : 'Direct WebRTC'}
                </span>
              </div>
            </div>
            <div className="px-4 pb-6 overflow-y-auto max-h-[65vh]">
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
          <DialogContent className="max-w-lg p-0 rounded-2xl border-border/60 bg-card/98 backdrop-blur-2xl overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>Call Diagnostics</DialogTitle>
              <DialogDescription>
                Live WebRTC connection metrics
              </DialogDescription>
            </DialogHeader>
            {/* Hero Header */}
            <div className="p-5 pb-4 bg-gradient-to-br from-primary/10 via-indigo-500/5 to-emerald-500/5 border-b border-border/40">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 shadow-inner">
                  <Activity className="w-5 h-5 text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-1 ring-card" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-foreground tracking-tight">
                    Call Diagnostics
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time network performance & audio quality
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg border',
                    isUsingSfu
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  )}
                >
                  <Radio className="w-3 h-3" />
                  {isUsingSfu ? 'Cloudflare SFU' : 'Peer-to-Peer'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-card border border-border/50 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {connectedPeers.length} peer
                  {connectedPeers.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            {/* Stats Content */}
            <div className="p-5 pt-4">
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
