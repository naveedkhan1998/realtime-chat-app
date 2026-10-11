import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  LogOut,
  Trash2,
  FileText,
  Phone,
  PhoneOff,
  Bell,
  BellOff,
  Copy,
} from 'lucide-react';
import { useHuddle } from '@/contexts/HuddleContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChatRoom,
  Message,
  useDeleteChatRoomMutation,
} from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';
import { getAvatarUrl, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MessageAttachment } from './MessageAttachment';
import { PresetKey, SectionLabel, Led, channelNo } from '@/components/console';

interface ChatInfoPanelProps {
  room: ChatRoom;
  user: UserProfile;
  onlineUsers: number[];
  onClose: () => void;
  isMobile: boolean;
  isOpen: boolean;
  messages: Message[];
}

function ChatInfoContent({
  room,
  user,
  onlineUsers,
  onClose,
  messages,
  showCloseButton = true,
}: {
  room: ChatRoom;
  user: UserProfile;
  onlineUsers: number[];
  onClose: () => void;
  messages: Message[];
  showCloseButton?: boolean;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isMutedLocally, setIsMutedLocally] = useState(false);
  const { isHuddleActive, huddleChatId, startHuddle, stopHuddle } = useHuddle();

  const [deleteChatRoom, { isLoading: isDeleting }] =
    useDeleteChatRoomMutation();

  // Filter messages with attachments
  const { mediaMessages, fileMessages } = useMemo(() => {
    const media: Message[] = [];
    const files: Message[] = [];

    messages.forEach(msg => {
      if (msg.attachment) {
        if (
          msg.attachment_type === 'image' ||
          msg.attachment_type === 'video'
        ) {
          media.push(msg);
        } else {
          files.push(msg);
        }
      }
    });

    return { mediaMessages: media, fileMessages: files };
  }, [messages]);

  const otherParticipant = room.is_group_chat
    ? null
    : room.participants.find(p => p.id !== user.id);

  const isOtherOnline = otherParticipant
    ? onlineUsers.includes(otherParticipant.id)
    : false;

  const handleDeleteChat = async () => {
    try {
      await deleteChatRoom({ id: room.id }).unwrap();
      toast({
        title: room.is_group_chat ? 'Channel exited' : 'Channel purged',
        description: room.is_group_chat
          ? 'You have exited the channel.'
          : 'Channel data purged.',
      });
      onClose();
      navigate('/chat');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to purge channel.',
        variant: 'destructive',
      });
    }
    setShowDeleteDialog(false);
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(room.id.toString());
    toast({
      title: 'COPIED TO CLIPBOARD',
      description: `Channel ID CH·${channelNo(room.id)} copied.`,
    });
  };

  return (
    <>
      <div className="flex flex-col h-full bg-card">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="label-engraved text-foreground">
              CHANNEL PARAMETERS
            </span>
            <span className="font-mono text-2xs px-1.5 py-0.5 rounded bg-well text-muted-foreground">
              CH·{channelNo(room.id)}
            </span>
          </div>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="size-7 rounded-md key flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="Close parameters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable Body */}
        <ScrollArea className="flex-1 custom-scrollbar">
          <div className="p-4 space-y-4 pb-20 sm:pb-8">
            {/* Identity Card */}
            <div className="panel p-4 text-center">
              <div className="flex justify-center mb-2.5">
                {room.is_group_chat ? (
                  <PresetKey name={room.name} size="xl" />
                ) : otherParticipant ? (
                  <div className="relative">
                    <Avatar className="w-16 h-16 rounded-xl border border-border shadow-md">
                      <AvatarImage
                        src={getAvatarUrl(otherParticipant.avatar)}
                        alt={otherParticipant.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="font-mono text-xl font-bold bg-well">
                        {otherParticipant.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {isOtherOnline && (
                      <Led tone="live" className="absolute -bottom-1 -right-1 ring-2 ring-card" />
                    )}
                  </div>
                ) : null}
              </div>

              <h4 className="display-wide text-base font-bold text-foreground truncate">
                {room.is_group_chat
                  ? room.name || 'Group Channel'
                  : otherParticipant?.name}
              </h4>

              <p className="font-mono text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                {room.is_group_chat
                  ? `${room.participants.length} CONNECTED OPERATORS`
                  : isOtherOnline
                    ? 'ONLINE · READY'
                    : 'OFFLINE'}
              </p>

              {/* Hardware Quick Action Keys */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsMutedLocally(!isMutedLocally);
                    toast({
                      title: isMutedLocally ? 'ALERTS ENABLED' : 'ALERTS SILENCED',
                      description: isMutedLocally
                        ? 'Audible notifications active.'
                        : 'Notifications muted for this channel.',
                    });
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-lg key text-xs transition-all"
                >
                  {isMutedLocally ? (
                    <BellOff className="w-3.5 h-3.5 text-primary mb-1" />
                  ) : (
                    <Bell className="w-3.5 h-3.5 text-muted-foreground mb-1" />
                  )}
                  <span className="font-mono text-[9px] uppercase tracking-wider">
                    {isMutedLocally ? 'MUTED' : 'ALERTS'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyRoomId}
                  className="flex flex-col items-center justify-center p-2 rounded-lg key text-xs transition-all"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground mb-1" />
                  <span className="font-mono text-[9px] uppercase tracking-wider">
                    FREQ ID
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isHuddleActive && huddleChatId === room.id) {
                      stopHuddle();
                    } else {
                      startHuddle(room.id);
                    }
                  }}
                  className={cn(
                    'flex flex-col items-center justify-center p-2 rounded-lg text-xs transition-all',
                    isHuddleActive && huddleChatId === room.id
                      ? 'bg-destructive text-destructive-foreground shadow-key font-bold'
                      : 'key text-live'
                  )}
                >
                  {isHuddleActive && huddleChatId === room.id ? (
                    <>
                      <PhoneOff className="w-3.5 h-3.5 mb-1" />
                      <span className="font-mono text-[9px] uppercase tracking-wider">
                        DISCONNECT
                      </span>
                    </>
                  ) : (
                    <>
                      <Phone className="w-3.5 h-3.5 mb-1" />
                      <span className="font-mono text-[9px] uppercase tracking-wider">
                        VOX
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Participants Section */}
            {room.is_group_chat && (
              <div className="space-y-2">
                <SectionLabel count={room.participants.length}>
                  STATION OPERATORS
                </SectionLabel>

                <div className="panel divide-y divide-border overflow-hidden">
                  {room.participants.map((participant, index) => {
                    const isOnline = onlineUsers.includes(participant.id);
                    const isSelf = participant.id === user.id;
                    const isRoomAdmin = index === 0;

                    return (
                      <div
                        key={participant.id}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-well transition-colors"
                      >
                        <div className="relative shrink-0">
                          <Avatar className="w-7 h-7 border border-border">
                            <AvatarImage
                              src={getAvatarUrl(participant.avatar)}
                              alt={participant.name}
                              className="object-cover"
                            />
                            <AvatarFallback className="font-mono text-[9px] font-bold">
                              {participant.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <Led tone="live" className="absolute -bottom-0.5 -right-0.5 ring-1 ring-card" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs font-semibold truncate text-foreground flex items-center gap-1">
                            <span>{participant.name}</span>
                            {isSelf && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                (YOU)
                              </span>
                            )}
                          </p>
                        </div>

                        {isRoomAdmin && (
                          <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-well text-primary border border-border">
                            HOST
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shared Media Tabs */}
            <div className="space-y-2">
              <SectionLabel>SHARED LOGS & MEDIA</SectionLabel>

              <div className="panel p-3">
                <Tabs defaultValue="media" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 mb-2.5">
                    <TabsTrigger value="media" className="font-mono text-xs">
                      MEDIA ({mediaMessages.length})
                    </TabsTrigger>
                    <TabsTrigger value="files" className="font-mono text-xs">
                      FILES ({fileMessages.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="media" className="mt-0">
                    {mediaMessages.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {mediaMessages.slice(0, 9).map(message => (
                          <div
                            key={message.id}
                            className="aspect-square rounded-md overflow-hidden border border-border bg-well relative"
                          >
                            {message.attachment && (
                              <MessageAttachment
                                url={message.attachment}
                                type={message.attachment_type}
                                compact
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-6 font-mono text-xs text-muted-foreground">
                        NO MEDIA LOGGED
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="files" className="mt-0">
                    {fileMessages.length > 0 ? (
                      <div className="space-y-1.5">
                        {fileMessages.slice(0, 6).map(message => (
                          <div
                            key={message.id}
                            className="p-2 rounded bg-well shadow-well flex items-center gap-2"
                          >
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-mono text-xs truncate flex-1 text-foreground">
                              {message.content || 'File payload'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-6 font-mono text-xs text-muted-foreground">
                        NO DOCUMENTS LOGGED
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full h-10 rounded-lg key flex items-center justify-center gap-2 text-destructive hover:bg-destructive/10 transition-colors font-mono text-xs font-bold"
              >
                {room.is_group_chat ? (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>EXIT CHANNEL</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>PURGE CHANNEL LOG</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <Led tone="danger" blink />
              <AlertDialogTitle className="label-engraved text-destructive">
                {room.is_group_chat ? 'EXIT CHANNEL' : 'PURGE CHANNEL LOG'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="font-mono text-xs text-muted-foreground mt-1">
              {room.is_group_chat
                ? 'Are you sure you want to exit this group channel?'
                : 'Are you sure you want to purge this direct channel history? This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="font-mono text-xs h-9">
              ABORT
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground font-mono text-xs h-9 font-bold hover:brightness-105"
            >
              {isDeleting ? 'PURGING...' : 'CONFIRM'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ChatInfoPanel({
  room,
  user,
  onlineUsers,
  onClose,
  isMobile,
  isOpen,
  messages,
}: ChatInfoPanelProps) {
  if (!isOpen) return null;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-card">
          <SheetHeader className="sr-only">
            <SheetTitle>Channel Parameters</SheetTitle>
          </SheetHeader>
          <ChatInfoContent
            room={room}
            user={user}
            onlineUsers={onlineUsers}
            onClose={onClose}
            messages={messages}
            showCloseButton={true}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="w-[320px] lg:w-[340px] flex-shrink-0 h-full border-l border-border bg-card">
      <ChatInfoContent
        room={room}
        user={user}
        onlineUsers={onlineUsers}
        onClose={onClose}
        messages={messages}
        showCloseButton={true}
      />
    </aside>
  );
}
