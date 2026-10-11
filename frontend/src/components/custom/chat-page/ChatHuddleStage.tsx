import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Headphones,
  Phone,
  PhoneOff,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
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
import { Led, LevelMeter, Lcd, Kbd } from '@/components/console';

interface ChatHuddleStageProps {
  roomId?: number;
  participants: Array<{ id: number; name: string; avatar: string }>;
  isInHuddle: boolean;
  onJoinHuddle: () => void;
  onLeaveHuddle: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isDeafened: boolean;
  onToggleDeafen: () => void;
  speakingUserIds: number[];
  volumeLevels: Record<number, number>;
  connectionDetails?: Record<number, any>;
  isUsingSfu?: boolean;
  sfuStats?: any;
  currentUserId: number;
}

export default function ChatHuddleStage({
  roomId,
  participants,
  isInHuddle,
  onJoinHuddle,
  onLeaveHuddle,
  isMuted,
  onToggleMute,
  isDeafened,
  onToggleDeafen,
  speakingUserIds,
  volumeLevels,
  connectionDetails,
  isUsingSfu,
  sfuStats,
  currentUserId,
}: ChatHuddleStageProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // If no one is in a huddle, don't show the stage
  if (!participants || participants.length === 0) {
    return null;
  }

  // Case 1: Room has active huddle, but current user hasn't joined
  if (!isInHuddle) {
    return (
      <div className="px-3 sm:px-4 py-2 bg-live/10 border-b border-live/30">
        <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <Led tone="live" blink />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                <span>VOX BROADCAST ACTIVE</span>
                <span className="font-mono text-2xs px-1.5 py-0.2 rounded bg-live/20 text-live">
                  {participants.length} CONNECTED
                </span>
              </div>
              <p className="font-mono text-[10.5px] text-muted-foreground truncate">
                {participants.map(p => p.name).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Avatars */}
            <div className="hidden sm:flex items-center -space-x-1.5 mr-1">
              {participants.slice(0, 4).map(p => (
                <Avatar
                  key={p.id}
                  className="w-6 h-6 border ring-1 ring-card"
                >
                  <AvatarImage src={getAvatarUrl(p.avatar)} />
                  <AvatarFallback className="font-mono text-[8px] bg-well font-bold">
                    {p.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>

            <button
              onClick={onJoinHuddle}
              className="h-7 px-3 rounded-full bg-live text-live-foreground font-mono text-xs font-bold flex items-center gap-1.5 shadow-key active:translate-y-px"
            >
              <Phone className="w-3 h-3 fill-current" />
              <span>TUNE IN</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Current user is connected to the huddle (Mixing console)
  return (
    <>
      <div className="border-b border-border bg-well shadow-well transition-all">
        <div className="px-3 sm:px-4 py-2 max-w-5xl mx-auto">
          {/* Header Control Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Led tone="live" blink />
              <div className="min-w-0 font-mono text-xs font-bold text-foreground flex items-center gap-2">
                <span className="text-live">ON AIR</span>
                <span className="text-muted-foreground font-normal">/</span>
                <span className="text-muted-foreground font-medium text-[11px]">
                  MODE: {isUsingSfu ? 'SFU RELAY' : 'P2P MESH'} · {participants.length} OPERATORS
                </span>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Telemetry Stats */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowStatsModal(true)}
                      className="size-7 rounded-md key flex items-center justify-center text-live"
                    >
                      <Activity className="w-3.5 h-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="font-mono text-xs">WEBRTC TELEMETRY</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Mute button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onToggleMute}
                      className={cn(
                        'h-7 px-2.5 rounded-md font-mono text-[11px] font-bold flex items-center gap-1 transition-all',
                        isMuted
                          ? 'bg-destructive text-destructive-foreground shadow-key'
                          : 'key text-live'
                      )}
                    >
                      {isMuted ? (
                        <>
                          <MicOff className="w-3 h-3" />
                          <span className="hidden xs:inline">MUTED</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3 h-3" />
                          <span className="hidden xs:inline">MUTE</span>
                        </>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span className="font-mono text-xs">{isMuted ? 'UNMUTE [TX]' : 'MUTE [TX]'}</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Deafen button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onToggleDeafen}
                      className={cn(
                        'size-7 rounded-md flex items-center justify-center transition-all',
                        isDeafened
                          ? 'bg-destructive text-destructive-foreground shadow-key'
                          : 'key text-foreground'
                      )}
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

              {/* Disconnect button */}
              <button
                onClick={onLeaveHuddle}
                className="h-7 px-2.5 rounded-md bg-destructive text-destructive-foreground font-mono text-[11px] font-bold flex items-center gap-1 shadow-key active:translate-y-px"
              >
                <PhoneOff className="w-3 h-3" />
                <span className="hidden xs:inline">LEAVE</span>
              </button>

              {/* Collapse toggle */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="size-7 rounded-md key flex items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label={isCollapsed ? 'Expand console' : 'Collapse console'}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Participant Mixer Strips (Collapsible) */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden pt-2"
              >
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {participants.map(p => {
                    const isSelf = p.id === currentUserId;
                    const isSpeaking = speakingUserIds.includes(p.id);
                    const userMuted = isSelf && isMuted;
                    const volume = volumeLevels[p.id] || 0;

                    return (
                      <div
                        key={p.id}
                        className={cn(
                          'relative flex flex-col items-center justify-center p-2 rounded-lg border transition-all',
                          'bg-card text-card-foreground shadow-panel',
                          isSpeaking
                            ? 'border-live/60 ring-1 ring-live/40'
                            : 'border-border'
                        )}
                      >
                        {/* Avatar */}
                        <div className="relative mb-1">
                          <Avatar
                            className={cn(
                              'w-8 h-8 border ring-1 transition-all',
                              isSpeaking
                                ? 'ring-live border-live animate-pulse'
                                : 'ring-card border-card'
                            )}
                          >
                            <AvatarImage src={getAvatarUrl(p.avatar)} />
                            <AvatarFallback className="font-mono text-[9px] font-bold bg-well">
                              {p.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          {userMuted && (
                            <span className="absolute -bottom-1 -right-1 bg-destructive text-destructive-foreground p-0.5 rounded-full shadow-xs">
                              <MicOff className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <span className="font-mono text-[10.5px] font-bold truncate max-w-full text-foreground">
                          {p.name} {isSelf && '(YOU)'}
                        </span>

                        {/* Status + Level Meter */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <LevelMeter
                            active={isSpeaking}
                            level={isSpeaking ? Math.min(1, volume * 2) : 0}
                            bars={4}
                          />
                          <span
                            className={cn(
                              'font-mono text-[9px]',
                              userMuted
                                ? 'text-destructive font-bold'
                                : isSpeaking
                                  ? 'text-live font-bold'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {userMuted
                              ? 'MUTED'
                              : isSpeaking
                                ? 'VOX'
                                : 'STANDBY'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Diagnostics Dialog */}
      <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
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
                    WEBRTC AUDIO TELEMETRY
                  </DialogTitle>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-well text-muted-foreground border border-border">
                    MOD·VOX·48K
                  </span>
                </div>
                <DialogDescription className="font-mono text-xs text-muted-foreground truncate">
                  CARRIER: <span className="text-foreground font-semibold">CHANNEL #{roomId ?? ''}</span> · REALTIME PACKET & LATENCY METRICS
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
                  onClick={onToggleMute}
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
                onClick={onLeaveHuddle}
                className="h-7 px-2.5 rounded-md bg-destructive text-destructive-foreground font-mono text-2xs font-bold flex items-center gap-1 shadow-key active:translate-y-px"
              >
                <PhoneOff className="size-3" />
                <span>LEAVE HUDDLE</span>
              </button>
              <button
                type="button"
                onClick={() => setShowStatsModal(false)}
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
