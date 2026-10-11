import { format } from 'date-fns';
import React, { memo, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message, User } from '@/services/chatApi';
import { cn, getAvatarUrl } from '@/lib/utils';
import {
  Pencil,
  Trash2,
  CheckCheck,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { MessageAttachment } from './chat-page/MessageAttachment';
import { toast } from '@/hooks/use-toast';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

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
  const [copied, setCopied] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const sender: User = message.sender;
  const displayAvatar = senderAvatar || sender.avatar;
  const displayName = senderName || sender.name;
  const timestamp = new Date(message.timestamp);
  const updatedTime = new Date(message.updated_at);
  const formattedTime = format(timestamp, 'HH:mm');
  const fullDate = format(timestamp, 'MMM d, yyyy h:mm a');
  // Only show edited if the difference is more than 1 second (1000ms)
  const edited = updatedTime.getTime() - timestamp.getTime() > 1000;
  const isPending = message.id < 0;

  const handleCopyText = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'COPIED TO CLIPBOARD',
        description: 'Message text copied.',
      });
    }
    setShowMobileDrawer(false);
  };

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      setShowMobileDrawer(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <>
      <div
        className={cn(
          'group relative flex w-full gap-2 px-2 py-0.5 transition-colors rounded-xl',
          isSent ? 'flex-row-reverse' : 'flex-row',
          isConsecutive ? 'pt-0.5' : 'pt-2.5 sm:pt-3',
          isPending && 'opacity-65'
        )}
      >
        {/* Avatar Area */}
        <div
          className={cn(
            'flex-shrink-0 w-7 sm:w-8 flex flex-col justify-end',
            !showAvatar && 'invisible'
          )}
        >
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg border border-border shadow-xs">
            <AvatarImage src={getAvatarUrl(displayAvatar)} alt={displayName} />
            <AvatarFallback className="font-mono text-[10px] font-bold bg-well">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Message Content Container */}
        <div
          className={cn(
            'flex max-w-[85%] sm:max-w-[75%] md:max-w-[70%] flex-col min-w-0',
            isSent ? 'items-end' : 'items-start'
          )}
        >
          {/* Sender Name in Group Chats */}
          {!isSent && !isConsecutive && (
            <span className="ml-1 font-mono text-[11px] font-bold text-foreground/80 mb-0.5 flex items-center gap-1.5">
              <span>{displayName}</span>
              <span className="text-[9px] font-normal text-muted-foreground/60 font-mono">
                {formattedTime}
              </span>
            </span>
          )}

          <div
            className="relative max-w-full"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
          >
            {/* Desktop Floating Actions Bar (Hover) */}
            {!isPending && (
              <div
                className={cn(
                  'hidden sm:flex absolute -top-4 items-center gap-0.5 p-0.5 rounded-lg bg-card border border-border shadow-panel opacity-0 group-hover:opacity-100 transition-all duration-150 z-20',
                  isSent ? 'right-2' : 'left-2'
                )}
              >
                {/* Copy button */}
                {message.content && (
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-well transition-colors"
                    title="Copy message"
                    aria-label="Copy message"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-live" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}

                {/* Edit button */}
                {isOwnMessage && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(message)}
                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-well transition-colors"
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
                    className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-well transition-colors"
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
              onClick={() => {
                if (window.innerWidth < 640) {
                  setShowMobileDrawer(true);
                }
              }}
              className={cn(
                'relative px-3.5 sm:px-4 py-2 sm:py-2.5 text-sm transition-all duration-150 overflow-hidden leading-relaxed break-words cursor-pointer sm:cursor-default select-text',
                isSent
                  ? 'bg-foreground text-background shadow-key'
                  : 'bg-card text-foreground shadow-panel border border-border/50',
                isEditing &&
                  'ring-2 ring-primary ring-offset-2 ring-offset-background',
                'rounded-2xl',
                isSent && showAvatar && 'rounded-br-xs',
                !isSent && showAvatar && 'rounded-bl-xs',
                isSent && !showAvatar && 'rounded-br-lg',
                !isSent && !showAvatar && 'rounded-bl-lg'
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

              {message.content && (
                <p
                  className={cn(
                    'text-[13.5px] sm:text-[14px] leading-relaxed select-text whitespace-pre-wrap',
                    isSent ? 'text-background' : 'text-foreground'
                  )}
                >
                  {message.content}
                </p>
              )}

              {/* Timestamp & Receipts Footer */}
              <div
                className={cn(
                  'flex items-center gap-1.5 mt-1 select-none font-mono text-[10px]',
                  isSent
                    ? 'justify-end text-background/70'
                    : 'justify-start text-muted-foreground/75'
                )}
              >
                <span>{formattedTime}</span>
                {edited && (
                  <span className="text-[9px] uppercase tracking-wider font-medium">
                    EDITED
                  </span>
                )}
                {isSent && (
                  <span className="ml-0.5">
                    {isPending ? (
                      <Clock className="w-3 h-3 opacity-80 animate-pulse" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5 text-primary" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Touch Action Drawer */}
      <Drawer open={showMobileDrawer} onOpenChange={setShowMobileDrawer}>
        <DrawerContent className="pb-6">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle className="label-engraved flex items-center justify-between">
              <span>MESSAGE OPTIONS</span>
              <span className="font-mono text-xs text-muted-foreground font-normal">
                {formattedTime}
              </span>
            </DrawerTitle>
            <DrawerDescription className="font-mono text-xs text-muted-foreground truncate">
              FROM: {isSent ? 'SELF' : displayName} · {fullDate}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 py-2 space-y-2">
            {/* Copy option */}
            {message.content && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-10 font-mono text-xs"
                onClick={() => handleCopyText()}
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
                <span>COPY TRANSMISSION TEXT</span>
              </Button>
            )}

            {/* Edit option */}
            {isOwnMessage && onEdit && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-10 font-mono text-xs text-primary hover:text-primary"
                onClick={() => {
                  setShowMobileDrawer(false);
                  onEdit(message);
                }}
              >
                <Pencil className="w-4 h-4 text-primary" />
                <span>EDIT TRANSMISSION</span>
              </Button>
            )}

            {/* Delete option */}
            {isOwnMessage && onDelete && (
              <Button
                variant="destructive"
                className="w-full justify-start gap-3 h-10 font-mono text-xs"
                onClick={() => {
                  setShowMobileDrawer(false);
                  onDelete(message);
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>DELETE TRANSMISSION</span>
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

export default memo(MessageBubble);
