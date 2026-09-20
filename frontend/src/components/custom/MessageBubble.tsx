import { format } from 'date-fns';
import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message, User } from '@/services/chatApi';
import { cn, getAvatarUrl } from '@/lib/utils';
import { Pencil, Trash2, CheckCheck, Clock, Copy } from 'lucide-react';
import { MessageAttachment } from './chat-page/MessageAttachment';
import { toast } from '@/hooks/use-toast';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  isOwnMessage?: boolean;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  isEditing?: boolean;
  showAvatar?: boolean;
  isConsecutive?: boolean;
  senderAvatar?: string;
  senderName?: string;
}

function MessageBubble({
  message,
  isSent,
  isOwnMessage = false,
  onEdit,
  onDelete,
  isEditing,
  showAvatar = true,
  isConsecutive = false,
  senderAvatar,
  senderName,
}: MessageBubbleProps) {
  const sender: User = message.sender;
  const displayAvatar = senderAvatar || sender.avatar;
  const displayName = senderName || sender.name;
  const timestamp = new Date(message.timestamp);
  const updatedTime = new Date(message.updated_at);
  const formattedTime = format(timestamp, 'HH:mm');
  // Only show edited if the difference is more than 1 second (1000ms)
  const edited = updatedTime.getTime() - timestamp.getTime() > 1000;
  const isPending = message.id < 0;

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      toast({
        title: 'Copied',
        description: 'Message text copied to clipboard.',
      });
    }
  };

  return (
    <div
      className={cn(
        'group relative flex w-full gap-2.5 px-2 py-0.5 transition-colors rounded-xl hover:bg-card/30',
        isSent ? 'flex-row-reverse' : 'flex-row',
        isConsecutive ? 'mt-0.5' : 'mt-3.5',
        isPending && 'opacity-70'
      )}
    >
      {/* Avatar Area */}
      <div
        className={cn(
          'flex-shrink-0 w-8 flex flex-col justify-end',
          !showAvatar && 'invisible'
        )}
      >
        <Avatar
          className={cn(
            'h-8 w-8 rounded-xl border border-border/60 shadow-sm transition-transform hover:scale-105',
            isSent ? 'border-primary/30' : 'border-border'
          )}
        >
          <AvatarImage src={getAvatarUrl(displayAvatar)} alt={displayName} />
          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary rounded-xl">
            {displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div
        className={cn(
          'flex max-w-[85%] sm:max-w-[72%] flex-col min-w-0',
          isSent ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender Name in Group Chats */}
        {!isSent && !isConsecutive && (
          <span className="ml-1 text-[11px] font-bold text-muted-foreground/80 mb-1 flex items-center gap-1.5">
            <span>{displayName}</span>
            <span className="text-[9px] font-normal text-muted-foreground/50 font-mono">
              {formattedTime}
            </span>
          </span>
        )}

        <div className="relative max-w-full">
          {/* Floating Hover Actions Bar */}
          {!isPending && (
            <div
              className={cn(
                'absolute -top-3.5 flex items-center gap-0.5 p-0.5 rounded-xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-150 z-20',
                isSent ? 'right-2' : 'left-2'
              )}
            >
              {/* Copy button */}
              {message.content && (
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Copy text"
                  aria-label="Copy text"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}

              {/* Edit button */}
              {isOwnMessage && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(message)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  title="Edit message"
                  aria-label="Edit message"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}

              {/* Delete button */}
              {isOwnMessage && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(message)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Delete message"
                  aria-label="Delete message"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Bubble Container */}
          <div
            className={cn(
              'relative px-4 py-2.5 text-sm shadow-sm transition-all duration-200 overflow-hidden leading-relaxed break-words',
              isSent
                ? 'bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-md shadow-primary/15'
                : 'bg-card/85 hover:bg-card border border-white/[0.08] text-foreground shadow-sm backdrop-blur-md',
              isEditing &&
                'ring-2 ring-primary ring-offset-2 ring-offset-background',
              // Border Radius Tail Logic
              'rounded-2xl',
              isSent && showAvatar && 'rounded-br-sm',
              !isSent && showAvatar && 'rounded-bl-sm',
              isSent && !showAvatar && 'rounded-br-xl',
              !isSent && !showAvatar && 'rounded-bl-xl'
            )}
          >
            {message.attachment && (
              <div className="mb-2">
                <MessageAttachment
                  url={message.attachment}
                  type={
                    message.attachment_type as
                      'image' | 'video' | 'audio' | 'file'
                  }
                />
              </div>
            )}

            <p className={cn(isSent ? 'text-white' : 'text-foreground/95')}>
              {message.content}
            </p>

            {/* Timestamp & Receipts */}
            <div
              className={cn(
                'flex items-center gap-1.5 mt-1 select-none text-[10px]',
                isSent
                  ? 'justify-end text-white/80'
                  : 'justify-start text-muted-foreground/75'
              )}
            >
              <span>{formattedTime}</span>
              {edited && (
                <span className="text-[9px] opacity-80 uppercase tracking-wider">
                  Edited
                </span>
              )}
              {isSent && (
                <span className="ml-0.5">
                  {isPending ? (
                    <Clock className="w-3 h-3 opacity-80 animate-pulse" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(MessageBubble);
