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
  Users,
} from 'lucide-react';
import { useHuddle } from '@/contexts/HuddleContext';
import { useAppSelector } from '@/app/hooks';
import { selectRoomHuddleParticipants } from '@/features/unifiedChatSlice';
import { useGetChatRoomsQuery } from '@/services/chatApi';
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
    if (!currentRoom) return `Huddle Room #${huddleChatId ?? ''}`;
    if (currentRoom.is_group_chat) return currentRoom.name;
    const counterpart = currentRoom.participants?.find(p => p.id !== user?.id);
    return counterpart ? counterpart.name : currentRoom.name || 'Private Chat';
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
      <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-xl pointer-events-auto">
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 50, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={cn(
            'overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300',
            'bg-card/90 dark:bg-card/95 backdrop-blur-xl',
            'border-emerald-500/30 dark:border-emerald-500/25',
            'audio-live-glow'
          )}
        >
          {/* Main Huddle Bar Header / Compact Content */}
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
            {/* Left: Live indicator & Room Info */}
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Dynamic Equalizer / Live Radio Waves */}
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 flex-shrink-0">
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                {/* Audio Wave Visualizer Bars */}
                <div className="flex items-end gap-0.5 h-3.5 w-3.5">
                  <div
                    className={cn(
                      'w-1 bg-emerald-500 rounded-full transition-all duration-150',
                      isLocalUserSpeaking || speakingUserIds.length > 0
                        ? 'animate-wave-1'
                        : 'h-1.5'
                    )}
                  />
                  <div
                    className={cn(
                      'w-1 bg-emerald-500 rounded-full transition-all duration-150',
                      isLocalUserSpeaking || speakingUserIds.length > 0
                        ? 'animate-wave-2'
                        : 'h-2.5'
                    )}
                  />
                  <div
                    className={cn(
                      'w-1 bg-emerald-500 rounded-full transition-all duration-150',
                      isLocalUserSpeaking || speakingUserIds.length > 0
                        ? 'animate-wave-3'
                        : 'h-1.5'
                    )}
                  />
                </div>
              </div>

              {/* Room details */}
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-semibold truncate text-foreground">
                    {roomName}
                  </span>
                  <span
                    className={cn(
                      'text-[9px] px-1.5 py-0.5 rounded-full font-medium border flex-shrink-0',
                      isUsingSfu
                        ? 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/30'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    )}
                  >
                    {isUsingSfu ? 'SFU' : 'P2P Mesh'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-500" />
                    {participants.length} in huddle
                  </span>
                  {speakingUserIds.length > 0 && (
                    <span className="text-emerald-500 font-medium animate-pulse">
                      • Speaking...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Center: Participant Avatars Pile */}
            <div className="hidden sm:flex items-center -space-x-2 flex-shrink-0 px-2">
              <TooltipProvider>
                {participants.slice(0, 5).map(p => {
                  const isSpeaking = speakingUserIds.includes(p.id);
                  const isSelf = user?.id === p.id;
                  const selfMuted = isSelf && isMuted;

                  return (
                    <Tooltip key={p.id}>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Avatar
                            className={cn(
                              'w-8 h-8 border-2 border-background shadow-sm transition-transform',
                              isSpeaking &&
                                'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background scale-105'
                            )}
                          >
                            <AvatarImage
                              src={
                                'avatar' in p && p.avatar
                                  ? getAvatarUrl(p.avatar)
                                  : undefined
                              }
                            />
                            <AvatarFallback className="text-[10px] font-bold bg-muted">
                              {p.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {selfMuted && (
                            <span className="absolute -bottom-1 -right-1 bg-destructive text-destructive-foreground p-0.5 rounded-full shadow-sm">
                              <MicOff className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-semibold">
                          {p.name} {isSelf && '(You)'}
                        </p>
                        {isSpeaking && (
                          <p className="text-xs text-emerald-500 font-medium">
                            Speaking
                          </p>
                        )}
                        {selfMuted && (
                          <p className="text-xs text-destructive font-medium">
                            Microphone Muted
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
                {participants.length > 5 && (
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted text-[10px] font-bold border-2 border-background text-muted-foreground">
                    +{participants.length - 5}
                  </div>
                )}
              </TooltipProvider>
            </div>

            {/* Right: Actions / Call Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
              {/* Navigate to Chat button if elsewhere */}
              {!isCurrentRoomOpen && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/chat/${huddleChatId}`)}
                        className="h-8 w-8 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Go to Chat Room</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* WebRTC Stats Trigger */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowStatsDialog(true)}
                      className="h-8 w-8 rounded-xl hover:bg-muted text-muted-foreground hover:text-emerald-500"
                    >
                      <Activity className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>WebRTC & Audio Telemetry</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Mute Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isMuted ? 'destructive' : 'secondary'}
                      size="sm"
                      onClick={toggleMute}
                      className={cn(
                        'h-8 px-2.5 rounded-xl font-medium gap-1.5 text-xs transition-all',
                        !isMuted &&
                          'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20'
                      )}
                    >
                      {isMuted ? (
                        <>
                          <MicOff className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Unmute</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="hidden sm:inline">Mute</span>
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isMuted ? 'Unmute Mic' : 'Mute Mic'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Ctrl+Shift+M
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Deafen Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleDeafen}
                      className={cn(
                        'h-8 w-8 rounded-xl transition-all',
                        isDeafened
                          ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {isDeafened ? (
                        <Headphones className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <Headphones className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isDeafened
                      ? 'Undeafen Audio'
                      : 'Deafen (Mute Incoming Audio)'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Hangup / Leave Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={stopHuddle}
                      className="h-8 px-2.5 rounded-xl gap-1.5 font-medium text-xs shadow-md shadow-destructive/20 hover:scale-102 transition-transform"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Leave</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Disconnect from Huddle</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </motion.div>
      </div>

      {/* WebRTC Diagnostics & Audio Telemetry Modal */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  WebRTC Network & Audio Telemetry
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Real-time peer-to-peer and SFU connection metrics for{' '}
                  {roomName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-background/50">
            <WebRTCStats
              connectionDetails={connectionDetails}
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
