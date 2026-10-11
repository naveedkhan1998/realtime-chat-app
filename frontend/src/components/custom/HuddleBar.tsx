import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mic,
  MicOff,
  Headphones,
  PhoneOff,
  Activity,
  MessageSquare,
} from 'lucide-react';
import { useHuddle } from '@/contexts/HuddleContext';
import { useAppSelector } from '@/app/hooks';
import { selectRoomHuddleParticipants } from '@/features/unifiedChatSlice';
import { useGetChatRoomsQuery } from '@/services/chatApi';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import WebRTCStats from '@/components/custom/WebRTCStats';
import { cn, getAvatarUrl } from '@/lib/utils';
import { Led, Lcd, LevelMeter, Kbd } from '@/components/console';

export default function HuddleBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isHuddleActive,
    huddleChatId,
    stopHuddle,
    isMuted,
    toggleMute,
    isDeafened,
    toggleDeafen,
    speakingUserIds,
    connectionDetails,
    isUsingSfu,
    sfuStats,
  } = useHuddle();

  const user = useAppSelector(state => state.auth.user);
  const { data: chatRooms } = useGetChatRoomsQuery();
  const [showStatsDialog, setShowStatsDialog] = useState(false);

  // Participants of this active huddle
  const participants = useAppSelector(state =>
    huddleChatId ? selectRoomHuddleParticipants(state, huddleChatId) : []
  );

  // Identify room name
  const currentRoom = useMemo(() => {
    if (!huddleChatId || !chatRooms) return null;
    return chatRooms.find(r => r.id === huddleChatId);
  }, [huddleChatId, chatRooms]);

  const roomName = useMemo(() => {
    if (!currentRoom) return `Channel #${huddleChatId ?? ''}`;
    if (currentRoom.is_group_chat) return currentRoom.name;
    const counterpart = currentRoom.participants?.find(p => p.id !== user?.id);
    return counterpart ? counterpart.name : currentRoom.name || 'Private Station';
  }, [currentRoom, huddleChatId, user?.id]);

  const isCurrentRoomOpen = location.pathname === `/chat/${huddleChatId}`;

  // Keyboard shortcut: Ctrl/Cmd + Shift + M to mute
  useEffect(() => {
    if (!isHuddleActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        document.activeElement?.getAttribute('contenteditable') === 'true';

      if (isInput) return;

      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'm'
      ) {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHuddleActive, toggleMute]);

  if (!isHuddleActive || !huddleChatId || isCurrentRoomOpen) {
    return null;
  }

  const isLocalUserSpeaking = user ? speakingUserIds.includes(user.id) : false;

  return (
    <>
      <div className="fixed bottom-[calc(var(--dock-h,0px)+0.75rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg pointer-events-auto">
        <motion.div
          initial={{ y: 30, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 30, opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="panel shadow-lift p-2 sm:p-2.5 flex items-center justify-between gap-2.5 border border-border"
        >
          {/* Left: LCD Display Chip */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Lcd className="px-2 py-1 flex items-center gap-2 shrink-0">
              <Led tone="live" blink />
              <span className="font-mono text-2xs font-bold text-live uppercase tracking-wider">
                ON AIR
              </span>
              <LevelMeter active={isLocalUserSpeaking || speakingUserIds.length > 0} bars={3} />
            </Lcd>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-xs font-bold text-foreground truncate">
                {roomName}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground truncate">
                {participants.length} CONNECTED · {isUsingSfu ? 'SFU' : 'P2P'}
              </p>
            </div>
          </div>

          {/* Center: Avatars Pile (desktop) */}
          <div className="hidden sm:flex items-center -space-x-1.5 shrink-0 px-1">
            {participants.slice(0, 4).map(p => {
              const isSpeaking = speakingUserIds.includes(p.id);
              return (
                <div key={p.id} className="relative">
                  <Avatar
                    className={cn(
                      'w-6 h-6 border ring-1 transition-all',
                      isSpeaking
                        ? 'ring-live border-live animate-pulse'
                        : 'ring-card border-card'
                    )}
                  >
                    <AvatarImage
                      src={
                        'avatar' in p && p.avatar
                          ? getAvatarUrl(p.avatar)
                          : undefined
                      }
                    />
                    <AvatarFallback className="font-mono text-[8px] font-bold bg-well">
                      {p.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              );
            })}
          </div>

          {/* Right: Tactile Remote Keys */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Return to channel key */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(`/chat/${huddleChatId}`)}
                    className="size-7 rounded-md key flex items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label="Return to channel"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-mono text-xs">OPEN CHANNEL FREQUENCY</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Diagnostics key */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowStatsDialog(true)}
                    className="size-7 rounded-md key flex items-center justify-center text-live"
                    aria-label="WebRTC Telemetry"
                  >
                    <Activity className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-mono text-xs">NETWORK TELEMETRY</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Mute key */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleMute}
                    className={cn(
                      'size-7 rounded-md flex items-center justify-center transition-all',
                      isMuted
                        ? 'bg-destructive text-destructive-foreground shadow-key'
                        : 'key text-live'
                    )}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <MicOff className="w-3.5 h-3.5" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-mono text-xs">
                    {isMuted ? 'UNMUTE (CTRL+SHIFT+M)' : 'MUTE (CTRL+SHIFT+M)'}
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Deafen key */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleDeafen}
                    className={cn(
                      'size-7 rounded-md flex items-center justify-center transition-all',
                      isDeafened
                        ? 'bg-destructive text-destructive-foreground shadow-key'
                        : 'key text-muted-foreground hover:text-foreground'
                    )}
                    aria-label={isDeafened ? 'Undeafen' : 'Deafen'}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-mono text-xs">
                    {isDeafened ? 'UNDEAFEN AUDIO' : 'DEAFEN AUDIO'}
                  </span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Disconnect key */}
            <button
              onClick={stopHuddle}
              className="h-7 px-2.5 rounded-md bg-destructive text-destructive-foreground font-mono text-xs font-bold flex items-center gap-1 shadow-key active:translate-y-px"
              aria-label="Disconnect"
            >
              <PhoneOff className="w-3 h-3" />
              <span className="hidden sm:inline">END</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Diagnostics Modal: REMOTE HUDDLE TELEMETRY */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col bg-card border border-border shadow-lift sm:rounded-xl">
          {/* Top Instrument Bezel / Header */}
          <div className="relative px-5 py-4 border-b border-border bg-card select-none">
            {/* Corner chassis screws */}
            <span className="screw absolute top-3 left-3 opacity-60" aria-hidden="true" />
            <span className="screw absolute top-3 right-12 opacity-60" aria-hidden="true" />

            <div className="flex items-start justify-between gap-3 pl-3 pr-8">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="label-engraved text-xs font-bold text-foreground">
                    REMOTE HUDDLE TELEMETRY
                  </DialogTitle>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-well text-muted-foreground border border-border">
                    MOD·VOX·48K
                  </span>
                </div>
                <DialogDescription className="font-mono text-xs text-muted-foreground truncate">
                  CARRIER: <span className="text-foreground font-semibold">{roomName}</span> · FREQ·{huddleChatId}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Lcd className="px-2 py-0.5 flex items-center gap-1.5 shrink-0">
                  <Led tone="live" blink />
                  <span className="font-mono text-[10px] font-bold text-live">ON AIR</span>
                </Lcd>
              </div>
            </div>

            {/* Transceiver & RF status strip */}
            <div className="mt-3 mx-1 p-2 rounded-lg bg-well border border-border/80 flex flex-wrap items-center justify-between gap-2 text-2xs font-mono">
              <div className="flex items-center gap-3">
                {/* Local Mic Status */}
                <div className="flex items-center gap-1.5">
                  <Led tone={isMuted ? 'danger' : 'live'} />
                  <span className={cn(isMuted ? 'text-destructive font-bold' : 'text-live font-semibold')}>
                    {isMuted ? 'TX: MUTED' : 'TX: LIVE'}
                  </span>
                </div>

                {/* Local Audio Status */}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Headphones className="size-3" />
                  <span>{isDeafened ? 'RX: DEAF' : 'RX: ACTIVE'}</span>
                </div>

                {/* Topology */}
                <span className="hidden sm:inline text-muted-foreground/40">|</span>
                <span className="hidden sm:inline text-muted-foreground">
                  TOPOLOGY: {isUsingSfu ? 'SFU RELAY (EDGE)' : 'P2P FULL-MESH'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-card text-muted-foreground border border-border/60">
                  OPUS·48kHz·SRTP
                </span>
                <button
                  type="button"
                  onClick={toggleMute}
                  className={cn(
                    'h-5 px-2 rounded font-mono text-[10px] font-bold transition-all active:translate-y-px',
                    isMuted
                      ? 'bg-destructive text-destructive-foreground shadow-xs'
                      : 'key text-foreground'
                  )}
                >
                  {isMuted ? 'UNMUTE' : 'MUTE'}
                </button>
              </div>
            </div>
          </div>

          {/* Telemetry body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-card">
            <WebRTCStats
              connectionDetails={connectionDetails || {}}
              connectedPeers={participants as any}
              isUsingSfu={isUsingSfu}
              sfuStats={sfuStats}
              scrollable={false}
            />
          </div>

          {/* Instrument Footer */}
          <div className="relative border-t border-border bg-card p-3 sm:px-5 sm:py-3 flex items-center justify-between gap-3">
            {/* Calibration tick marks */}
            <div className="absolute -top-1.5 left-0 right-0 h-1.5 ticks opacity-30 pointer-events-none" />

            {/* Shortcut hint */}
            <div className="flex items-center gap-1.5 text-2xs font-mono text-muted-foreground">
              <span className="hidden sm:inline">SHORTCUT:</span>
              <Kbd>Ctrl</Kbd>
              <span>+</span>
              <Kbd>Shift</Kbd>
              <span>+</span>
              <Kbd>M</Kbd>
              <span className="hidden sm:inline text-muted-foreground/70">MUTE</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={stopHuddle}
                className="h-7 px-2.5 rounded-md bg-destructive text-destructive-foreground font-mono text-2xs font-bold flex items-center gap-1 shadow-key active:translate-y-px"
              >
                <PhoneOff className="size-3" />
                <span>LEAVE HUDDLE</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStatsDialog(false)}
                className="h-7 px-3 rounded-md key font-mono text-2xs font-bold text-foreground hover:bg-muted active:translate-y-px"
              >
                DISMISS TELEMETRY
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
