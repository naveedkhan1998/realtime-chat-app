import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Users, Image, LogOut, Trash2, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { ChatRoom, Message, useDeleteChatRoomMutation } from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';
import { getAvatarUrl } from '@/lib/utils';
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

  const [deleteChatRoom, { isLoading: isDeleting }] =
    useDeleteChatRoomMutation();

  // Filter messages with attachments from the loaded messages
  const { mediaMessages, fileMessages } = useMemo(() => {
    const media: Message[] = [];
    const files: Message[] = [];

    messages.forEach(msg => {
      if (msg.attachment) {
        if (msg.attachment_type === 'image' || msg.attachment_type === 'video') {
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

  const handleDeleteChat = async () => {
    try {
      await deleteChatRoom({ id: room.id }).unwrap();
      toast({
        title: room.is_group_chat ? 'Left group' : 'Conversation deleted',
        description: room.is_group_chat
          ? 'You have left the group.'
          : 'The conversation has been deleted.',
      });
      onClose();
      navigate('/chat');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete conversation',
        variant: 'destructive',
      });
    }
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header - only show close button for desktop sidebar */}
        {showCloseButton && (
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="text-lg font-semibold text-foreground">Chat Info</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="transition-colors rounded-xl text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Room Info Card */}
            <div className="p-5 text-center border bg-muted/30 rounded-2xl border-border/30">
              {room.is_group_chat ? (
                <>
                  <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 shadow-xl bg-gradient-to-br from-primary via-secondary to-accent rounded-2xl shadow-primary/20">
                    <Users className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="text-lg font-bold text-foreground">
                    {room.name || 'Group Chat'}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {room.participants.length} members
                  </p>
                </>
              ) : otherParticipant ? (
                <>
                  <Avatar className="w-20 h-20 mx-auto mb-4 shadow-lg ring-4 ring-primary/20">
                    <AvatarImage
                      src={getAvatarUrl(otherParticipant.avatar)}
                      alt={otherParticipant.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
                      {otherParticipant.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h4 className="text-lg font-bold text-foreground">
                    {otherParticipant.name}
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {onlineUsers.includes(otherParticipant.id)
                      ? 'Online'
                      : 'Offline'}
                  </p>
                </>
              ) : null}
            </div>

            {/* Participants (for group chats) */}
            {room.is_group_chat && (
              <div>
                <h5 className="flex items-center gap-2 mb-3 text-xs font-bold tracking-widest uppercase text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  Participants
                </h5>
                <div className="p-2 space-y-1 bg-muted/20 rounded-xl">
                  {room.participants.map(participant => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="w-9 h-9 ring-2 ring-border/50">
                        <AvatarImage
                          src={getAvatarUrl(participant.avatar)}
                          alt={participant.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
                          {participant.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {participant.name}
                          {participant.id === user.id && (
                            <span className="text-muted-foreground"> (you)</span>
                          )}
                        </p>
                      </div>
                      {onlineUsers.includes(participant.id) && (
                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Shared Media & Files */}
            <div className="overflow-hidden">
              <Tabs defaultValue="media" className="w-full overflow-hidden">
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger value="media" className="text-xs">
                    <Image className="w-3.5 h-3.5 mr-1.5" />
                    Media ({mediaMessages.length})
                  </TabsTrigger>
                  <TabsTrigger value="files" className="text-xs">
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    Files ({fileMessages.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="media" className="mt-0">
                  {mediaMessages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {mediaMessages.slice(0, 12).map(message => (
                        <div key={message.id} className="aspect-square">
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
                    <div className="py-6 text-sm text-center text-muted-foreground bg-muted/20 rounded-xl">
                      No media shared yet
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="files" className="mt-0 overflow-hidden">
                  {fileMessages.length > 0 ? (
                    <div className="w-full space-y-2">
                      {fileMessages.slice(0, 12).map(message => (
                        <div key={message.id}>
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
                    <div className="py-6 text-sm text-center text-muted-foreground bg-muted/20 rounded-xl">
                      No files shared yet
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-border/30">
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="flex items-center w-full gap-3 px-4 py-3 transition-colors rounded-xl text-destructive hover:bg-destructive/10"
              >
                {room.is_group_chat ? (
                  <>
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Leave Group</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5" />
                    <span className="font-medium">Delete Conversation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {room.is_group_chat ? 'Leave Group?' : 'Delete Conversation?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {room.is_group_chat
                ? 'Are you sure you want to leave this group? You will no longer receive messages from this group.'
                : 'Are you sure you want to delete this conversation? This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {room.is_group_chat ? 'Leave' : 'Delete'}
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
  // Mobile: use Sheet (slides from right)
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="p-4 border-b border-border/50">
            <SheetTitle>Chat Info</SheetTitle>
          </SheetHeader>
          <ChatInfoContent
            room={room}
            user={user}
            onlineUsers={onlineUsers}
            onClose={onClose}
            messages={messages}
            showCloseButton={false}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: show as sidebar panel
  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden border-l bg-background/50 backdrop-blur-xl border-border/50 w-80">
      <ChatInfoContent
        room={room}
        user={user}
        onlineUsers={onlineUsers}
        onClose={onClose}
        messages={messages}
        showCloseButton={true}
      />
    </div>
  );
}
