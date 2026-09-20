import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Headphones,
  Phone,
  PhoneOff,
  Radio,
  Activity,
  ChevronDown,
  ChevronUp,
  Volume2,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import WebRTCStats from '@/components/custom/WebRTCStats';
import { cn, getAvatarUrl } from '@/lib/utils';

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
      <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500/15 via-background/40 to-emerald-500/10 border-b border-emerald-500/25 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 sm:gap-3 max-w-4xl mx-auto">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex-shrink-0 animate-pulse">
              <Radio className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">
                  Voice Call Active
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/30">
                  {participants.length}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">
                {participants.map(p => p.name).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Avatars */}
            <div className="hidden sm:flex items-center -space-x-2 mr-1">
              {participants.slice(0, 4).map(p => (
                <Avatar
                  key={p.id}
                  className="w-7 h-7 border-2 border-background ring-1 ring-emerald-500/30"
                >
                  <AvatarImage src={getAvatarUrl(p.avatar)} />
                  <AvatarFallback className="text-[9px]">
                    {p.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>

            <Button
              size="sm"
              onClick={onJoinHuddle}
              className="h-8 px-3 rounded-xl font-semibold gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Phone className="w-3.5 h-3.5 fill-current" />
              <span>Join</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Current user is connected to the huddle
  return (
    <>
      <div className="border-b border-emerald-500/25 bg-card/75 dark:bg-card/90 backdrop-blur-xl transition-all duration-300">
        <div className="px-3 sm:px-4 py-2 max-w-5xl mx-auto">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-500 shrink-0">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-foreground truncate">
                    Live Audio Call
                  </span>
                  <span
                    className={cn(
                      'text-[9px] px-1.5 py-0.2 rounded-md font-mono font-semibold border hidden xs:inline-block',
                      isUsingSfu
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                    )}
                  >
                    {isUsingSfu ? 'SFU' : 'P2P'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* Stats button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowStatsModal(true)}
                      className="h-8 w-8 rounded-xl hover:bg-muted text-muted-foreground hover:text-emerald-500"
                    >
                      <Activity className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>WebRTC & Audio Telemetry</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Mute button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isMuted ? 'destructive' : 'secondary'}
                      size="sm"
                      onClick={onToggleMute}
                      className={cn(
                        'h-8 px-2.5 rounded-xl text-xs font-medium gap-1 transition-all',
                        !isMuted &&
                          'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20'
                      )}
                    >
                      {isMuted ? (
                        <>
                          <MicOff className="w-3 h-3" />
                          <span className="hidden xs:inline">Muted</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3 h-3 text-emerald-500" />
                          <span className="hidden xs:inline">Mute</span>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Deafen button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onToggleDeafen}
                      className={cn(
                        'h-8 w-8 rounded-xl',
                        isDeafened
                          ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Headphones className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isDeafened
                      ? 'Undeafen audio'
                      : 'Deafen incoming audio'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Leave call button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={onLeaveHuddle}
                className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1 shadow-xs shadow-destructive/20 active:scale-95"
              >
                <PhoneOff className="w-3 h-3" />
                <span className="hidden xs:inline">Leave</span>
              </Button>

              {/* Toggle collapse */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 rounded-xl text-muted-foreground hover:bg-muted"
                aria-label={isCollapsed ? 'Expand call stage' : 'Collapse call stage'}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Participant Grid (Collapsible) */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pt-2.5"
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
                          'relative flex flex-col items-center justify-center p-2 rounded-2xl border transition-all duration-200',
                          'bg-card/90 dark:bg-card/80 backdrop-blur-md',
                          isSpeaking
                            ? 'border-emerald-500/60 shadow-xs shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                            : 'border-border/60 hover:border-border'
                        )}
                      >
                        {/* Avatar with speaking wave ring */}
                        <div className="relative mb-1">
                          <Avatar
                            className={cn(
                              'w-10 h-10 border-2 border-background shadow-xs transition-transform duration-200',
                              isSpeaking &&
                                'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background scale-105'
                            )}
                          >
                            <AvatarImage src={getAvatarUrl(p.avatar)} />
                            <AvatarFallback className="text-xs font-bold bg-muted">
                              {p.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Mute indicator overlay */}
                          {userMuted && (
                            <span className="absolute -bottom-1 -right-1 bg-destructive text-destructive-foreground p-0.5 rounded-full shadow-xs">
                              <MicOff className="w-2.5 h-2.5" />
                            </span>
                          )}

                          {/* Speaking wave icon */}
                          {isSpeaking && (
                            <span className="absolute -top-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-xs animate-bounce">
                              <Volume2 className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <span className="text-[11px] font-semibold truncate max-w-full text-foreground">
                          {p.name} {isSelf && '(You)'}
                        </span>

                        {/* Status Label */}
                        <span
                          className={cn(
                            'text-[9px] font-medium',
                            userMuted
                              ? 'text-destructive'
                              : isSpeaking
                                ? 'text-emerald-500'
                                : 'text-muted-foreground'
                          )}
                        >
                          {userMuted
                            ? 'Muted'
                            : isSpeaking
                              ? 'Speaking'
                              : 'Listening'}
                        </span>

                        {/* Mini live volume bar */}
                        <div className="w-full bg-muted/60 h-1 rounded-full mt-1 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-100',
                              isSpeaking ? 'bg-emerald-500' : 'bg-transparent'
                            )}
                            style={{ width: `${Math.min(100, volume * 1.5)}%` }}
                          />
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
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden flex flex-col rounded-3xl">
          <DialogHeader className="px-6 py-4 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Huddle Connection & Diagnostics
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Low-level WebRTC metrics, audio packet telemetry, and latency
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background/50">
            <WebRTCStats
              connectionDetails={connectionDetails || {}}
              connectedPeers={participants as any}
              isUsingSfu={isUsingSfu}
              sfuStats={sfuStats}
              scrollable={false}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
