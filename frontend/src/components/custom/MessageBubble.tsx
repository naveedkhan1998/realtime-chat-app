import { format } from 'date-fns';
import { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message, User } from '@/services/chatApi';
import { cn, getAvatarUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, CheckCheck, Clock } from 'lucide-react';
import { MessageAttachment } from './chat-page/MessageAttachment';

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
  // Only show edited if the difference is more than 1 second (1000ms) to account for server processing time
  const edited = updatedTime.getTime() - timestamp.getTime() > 1000;
  const isPending = message.id < 0;

  return (
    <div
      className={cn(
        'group relative flex w-full gap-2 px-2 transition-all duration-200 hover:bg-muted/30',
        isSent ? 'flex-row-reverse' : 'flex-row',
        isConsecutive ? 'mt-0.5' : 'mt-4',
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
            'h-8 w-8 border-2 shadow-sm transition-transform hover:scale-105',
            isSent ? 'border-primary/20' : 'border-border'
          )}
        >
          <AvatarImage src={getAvatarUrl(displayAvatar)} alt={displayName} />
          <AvatarFallback className="text-[10px] font-bold bg-muted text-muted-foreground">
            {displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div
        className={cn(
          'flex max-w-[80%] flex-col gap-1 sm:max-w-[70%] min-w-0',
          isSent ? 'items-end' : 'items-start'
        )}
      >
        {/* Sender Name (Only for group chats or received messages, and not consecutive) */}
        {!isSent && !isConsecutive && (
          <span className="ml-1 text-[10px] font-bold text-muted-foreground/70 mb-0.5">
            {displayName}
          </span>
        )}

        <div className="relative max-w-full group/bubble">
          <div
            className={cn(
              'relative px-4 py-2.5 text-sm shadow-sm transition-all duration-200 overflow-hidden',
              isSent
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 backdrop-blur-md border border-border text-foreground hover:bg-muted/80',
              isEditing && 'ring-2 ring-offset-2 ring-primary',
              // Border Radius Logic
              'rounded-2xl',
              isSent && showAvatar && 'rounded-br-sm', // Tail for last sent
              !isSent && showAvatar && 'rounded-bl-sm', // Tail for last received
              isSent && !showAvatar && 'rounded-br-xl', // No tail for middle sent
              !isSent && !showAvatar && 'rounded-bl-xl' // No tail for middle received
            )}
          >
            {message.attachment && (
              <div className="mb-2">
                <MessageAttachment
                  url={message.attachment}
                  type={message.attachment_type as any}
                />
              </div>
            )}
            <p
              className={cn(
                'whitespace-pre-wrap leading-relaxed break-words',
                isSent ? 'text-primary-foreground/95' : 'text-foreground/90'
              )}
            >
              {message.content}
            </p>

            <div
              className={cn(
                'flex items-center gap-1 mt-1 select-none',
                isSent
                  ? 'justify-end text-primary-foreground/80'
                  : 'justify-start text-muted-foreground/80'
              )}
            >
              <span className="text-[9px] font-medium">{formattedTime}</span>
              {edited && (
                <span className="text-[8px] uppercase tracking-wider opacity-80">
                  Edited
                </span>
              )}
              {isSent && (
                <span className="ml-0.5">
                  {isPending ? (
                    <Clock className="w-3 h-3 opacity-80 animate-pulse" />
                  ) : (
                    <CheckCheck className="w-3 h-3 opacity-80" />
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Actions - Floating outside */}
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-all duration-200',
              isSent ? '-left-16' : '-right-16'
            )}
          >
            {isOwnMessage && !isPending && (onEdit || onDelete) && (
              <>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="border rounded-full shadow-sm h-7 w-7 hover:bg-background/50 hover:text-primary backdrop-blur-sm border-border"
                    onClick={() => onEdit(message)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="border rounded-full shadow-sm h-7 w-7 hover:bg-destructive/10 hover:text-destructive backdrop-blur-sm border-border"
                    onClick={() => onDelete(message)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(MessageBubble);
