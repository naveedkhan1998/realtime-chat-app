import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Users,
  Image,
  LogOut,
  Trash2,
  Loader2,
  FileText,
  Hash,
  Crown,
  Phone,
  PhoneOff,
  Bell,
  BellOff,
  Copy,
  Download,
} from 'lucide-react';
import { useHuddle } from '@/contexts/HuddleContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { cn, getAvatarUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { MessageAttachment } from './MessageAttachment';

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
        title: room.is_group_chat ? 'Left group' : 'Conversation deleted',
        description: room.is_group_chat
          ? 'You have left the group conversation.'
          : 'The conversation has been deleted.',
      });
      onClose();
      navigate('/chat');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation.',
        variant: 'destructive',
      });
    }
    setShowDeleteDialog(false);
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(room.id.toString());
    toast({
      title: 'Copied',
      description: `Room ID #${room.id} copied to clipboard.`,
    });
  };

  return (
    <>
      <div className="flex flex-col h-full bg-card/60 backdrop-blur-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">
              Conversation Details
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-mono font-medium text-muted-foreground">
              #{room.id}
            </span>
          </div>
          {showCloseButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Scrollable Body */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5 pb-24 sm:pb-8">
            {/* Hero Profile Card */}
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 dark:bg-card/90 backdrop-blur-md shadow-xs">
              {/* Cover Banner */}
              <div className="h-20 w-full bg-gradient-to-r from-primary/30 via-indigo-600/25 to-purple-600/30 relative" />

              <div className="px-4 pb-4 pt-0 -mt-10 text-center">
                {room.is_group_chat ? (
                  <div className="flex items-center justify-center w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/30 to-indigo-500/30 border-2 border-card text-primary shadow-lg">
                    <Hash className="w-10 h-10 stroke-[2.2]" />
                  </div>
                ) : otherParticipant ? (
                  <div className="relative w-20 h-20 mx-auto mb-3">
                    <Avatar className="w-full h-full rounded-2xl border-2 border-card shadow-lg ring-2 ring-primary/20">
                      <AvatarImage
                        src={getAvatarUrl(otherParticipant.avatar)}
                        alt={otherParticipant.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-2xl font-bold bg-primary/15 text-primary rounded-2xl">
                        {otherParticipant.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {isOtherOnline && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-card shadow-xs shadow-emerald-500/50" />
                    )}
                  </div>
                ) : null}

                <h4 className="text-base font-bold text-foreground truncate">
                  {room.is_group_chat
                    ? `# ${room.name || 'group-channel'}`
                    : otherParticipant?.name}
                </h4>

                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {room.is_group_chat
                    ? `${room.participants.length} total participants`
                    : isOtherOnline
                      ? 'Active now in workspace'
                      : 'Offline'}
                </p>

                {/* Quick Action Toolbar */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/40">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMutedLocally(!isMutedLocally);
                      toast({
                        title: isMutedLocally
                          ? 'Unmuted'
                          : 'Notifications Muted',
                        description: isMutedLocally
                          ? 'Sound alerts re-enabled for this chat.'
                          : 'Sound alerts muted for this chat.',
                      });
                    }}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-card hover:bg-muted/60 border border-border/50 text-xs font-medium transition-all active:scale-95"
                  >
                    {isMutedLocally ? (
                      <BellOff className="w-4 h-4 text-amber-500 mb-1" />
                    ) : (
                      <Bell className="w-4 h-4 text-muted-foreground mb-1" />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {isMutedLocally ? 'Muted' : 'Mute'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyRoomId}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-card hover:bg-muted/60 border border-border/50 text-xs font-medium transition-all active:scale-95"
                  >
                    <Copy className="w-4 h-4 text-muted-foreground mb-1" />
                    <span className="text-[10px] text-muted-foreground">
                      Copy ID
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isHuddleActive && huddleChatId === room.id) {
                        stopHuddle();
                        toast({
                          title: 'Call Ended',
                          description: 'Disconnected from audio call.',
                        });
                      } else {
                        startHuddle(room.id);
                        toast({
                          title: 'Starting Call',
                          description: `Connecting to audio call in #${room.name || 'room'}...`,
                        });
                      }
                    }}
                    className={cn(
                      'flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all active:scale-95',
                      isHuddleActive && huddleChatId === room.id
                        ? 'bg-destructive/10 hover:bg-destructive/20 border-destructive/30 text-destructive'
                        : 'bg-card hover:bg-muted/60 border-border/50 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {isHuddleActive && huddleChatId === room.id ? (
                      <>
                        <PhoneOff className="w-4 h-4 text-destructive mb-1" />
                        <span className="text-[10px] text-destructive font-semibold">
                          End Call
                        </span>
                      </>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 text-emerald-500 mb-1" />
                        <span className="text-[10px] text-muted-foreground">
                          Call
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Participants Section (for group chats) */}
            {room.is_group_chat && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Members — {room.participants.length}
                  </h5>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 border-border/50 text-muted-foreground"
                  >
                    {
                      room.participants.filter(p => onlineUsers.includes(p.id))
                        .length
                    }{' '}
                    Online
                  </Badge>
                </div>

                <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md overflow-hidden divide-y divide-border/30">
                  {room.participants.map((participant, index) => {
                    const isOnline = onlineUsers.includes(participant.id);
                    const isSelf = participant.id === user.id;
                    const isRoomAdmin = index === 0;

                    return (
                      <div
                        key={participant.id}
                        className="flex items-center gap-3 px-3.5 py-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="relative shrink-0">
                          <Avatar className="w-8 h-8 rounded-xl border border-border/60">
                            <AvatarImage
                              src={getAvatarUrl(participant.avatar)}
                              alt={participant.name}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary rounded-xl">
                              {participant.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          {isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-semibold truncate text-foreground flex items-center gap-1">
                            <span>{participant.name}</span>
                            {isSelf && (
                              <span className="text-[10px] text-muted-foreground font-normal">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70 truncate">
                            {isOnline ? 'Online' : 'Offline'}
                          </p>
                        </div>

                        {isRoomAdmin && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] py-0 px-1.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 gap-1 shrink-0"
                          >
                            <Crown className="w-2.5 h-2.5" />
                            Admin
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Shared Media & Files */}
            <div className="space-y-2.5">
              <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                <Image className="w-3.5 h-3.5 text-primary" />
                Shared Assets
              </h5>

              <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-3">
                <Tabs defaultValue="media" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-3 bg-muted/40 p-1 rounded-xl h-auto">
                    <TabsTrigger
                      value="media"
                      className="text-xs py-1.5 rounded-lg data-[state=active]:bg-card"
                    >
                      <Image className="w-3.5 h-3.5 mr-1.5" />
                      Media ({mediaMessages.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="files"
                      className="text-xs py-1.5 rounded-lg data-[state=active]:bg-card"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      Files ({fileMessages.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="media" className="mt-0">
                    {mediaMessages.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {mediaMessages.slice(0, 12).map(message => (
                          <div
                            key={message.id}
                            className="aspect-square rounded-xl overflow-hidden border border-border/40 shadow-inner group relative"
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
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        No photos or videos shared yet
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="files" className="mt-0">
                    {fileMessages.length > 0 ? (
                      <div className="space-y-2">
                        {fileMessages.slice(0, 8).map(message => (
                          <div
                            key={message.id}
                            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border/40 text-xs"
                          >
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <span className="truncate flex-1 font-medium text-foreground">
                              {message.content || 'Document attachment'}
                            </span>
                            {message.attachment && (
                              <a
                                href={message.attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                title="Download / Open file"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        No documents or files shared yet
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Danger Zone: Leave / Delete Conversation */}
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full h-11 rounded-xl border-destructive/25 text-destructive hover:bg-destructive/10 hover:border-destructive/40 text-xs font-semibold gap-2 transition-all active:scale-95"
              >
                {room.is_group_chat ? (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    Leave Group Channel
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Direct Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {room.is_group_chat ? 'Leave Group?' : 'Delete Conversation?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              {room.is_group_chat
                ? 'Are you sure you want to leave this group channel? You will no longer receive messages or audio huddle notifications.'
                : 'Are you sure you want to delete this conversation? This will remove the message history from your workspace.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-border/60 text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              disabled={isDeleting}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : null}
              {room.is_group_chat ? 'Leave Group' : 'Delete Chat'}
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
  // Mobile: slide-in Sheet from right
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-0 border-border/60 bg-card/95 backdrop-blur-2xl"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Chat Details</SheetTitle>
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

  // Desktop: Integrated right-hand 4th column sidebar
  if (!isOpen) return null;

  return (
    <aside className="flex flex-col h-full overflow-hidden border-l border-border/60 bg-card/50 backdrop-blur-2xl w-80 shrink-0 z-10 transition-all duration-200">
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
