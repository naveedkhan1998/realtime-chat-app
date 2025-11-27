import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Users,
  Bell,
  Search,
  Image,
  LogOut,
  Trash2,
  Loader2,
  ExternalLink,
} from 'lucide-react';
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
  ChatRoom,
  useDeleteChatRoomMutation,
  useGetSharedMediaQuery,
} from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';
import { getAvatarUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface ChatInfoPanelProps {
  room: ChatRoom;
  user: UserProfile;
  onlineUsers: number[];
  onClose: () => void;
}

export default function ChatInfoPanel({
  room,
  user,
  onlineUsers,
  onClose,
}: ChatInfoPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [deleteChatRoom, { isLoading: isDeleting }] =
    useDeleteChatRoomMutation();
  const { data: sharedMedia, isLoading: isLoadingMedia } =
    useGetSharedMediaQuery({
      chat_room_id: room.id,
    });

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
      navigate('/chat');
    } catch (error) {
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
      <div className="flex flex-col h-full overflow-y-auto border-l bg-background/50 backdrop-blur-xl border-border/50 w-80">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
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

          {/* Room Info Card */}
          <div className="p-5 mb-6 text-center border bg-muted/30 rounded-2xl border-border/30">
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
                <Avatar className="w-20 h-20 mx-auto mb-4 shadow-lg ring-4 ring-primary/20 rounded-2xl">
                  <AvatarImage
                    src={getAvatarUrl(otherParticipant.avatar)}
                    alt={otherParticipant.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary rounded-2xl">
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

          {/* Actions */}
          <div className="mb-6 space-y-1">
            <button className="flex items-center w-full gap-3 px-4 py-3 transition-colors rounded-xl hover:bg-muted/50 group">
              <Bell className="w-5 h-5 transition-colors text-muted-foreground group-hover:text-foreground" />
              <span className="text-foreground/90">Notifications</span>
              <span className="ml-auto text-sm text-muted-foreground">On</span>
            </button>
            <button className="flex items-center w-full gap-3 px-4 py-3 transition-colors rounded-xl hover:bg-muted/50 group">
              <Search className="w-5 h-5 transition-colors text-muted-foreground group-hover:text-foreground" />
              <span className="text-foreground/90">Search in conversation</span>
            </button>
          </div>

          {/* Participants (for group chats) */}
          {room.is_group_chat && (
            <div className="mb-6">
              <h5 className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                Participants
              </h5>
              <div className="p-2 space-y-1 bg-muted/20 rounded-xl">
                {room.participants.map(participant => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-9 h-9 ring-2 ring-border/50 rounded-xl">
                      <AvatarImage
                        src={getAvatarUrl(participant.avatar)}
                        alt={participant.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground rounded-xl">
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

          {/* Shared Media */}
          <div className="mb-6">
            <h5 className="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Image className="w-3.5 h-3.5" />
              Shared Media
            </h5>
            {isLoadingMedia ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : sharedMedia && sharedMedia.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {sharedMedia.slice(0, 9).map(message => (
                  <a
                    key={message.id}
                    href={message.attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative overflow-hidden transition-all duration-200 bg-muted aspect-square rounded-xl group hover:ring-2 hover:ring-primary/50"
                  >
                    {message.attachment_type === 'image' ? (
                      <img
                        src={message.attachment}
                        alt="Shared media"
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-muted/50">
                        <ExternalLink className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center transition-opacity duration-200 opacity-0 bg-black/50 group-hover:opacity-100">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="py-8 text-sm text-center text-muted-foreground bg-muted/20 rounded-xl">
                No shared media yet
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="pt-5 border-t border-border/30">
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
