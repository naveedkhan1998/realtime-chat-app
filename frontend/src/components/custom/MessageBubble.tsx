import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message, User } from "@/services/chatApi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, CheckCheck } from "lucide-react";

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

export default function MessageBubble({ 
  message, 
  isSent, 
  isOwnMessage = false, 
  onEdit, 
  onDelete, 
  isEditing,
  showAvatar = true,
  isConsecutive = false,
  senderAvatar,
  senderName
}: MessageBubbleProps) {
  const sender: User = message.sender;
  const displayAvatar = senderAvatar || sender.avatar;
  const displayName = senderName || sender.name;
  const timestamp = new Date(message.timestamp);
  const updatedTime = new Date(message.updated_at);
  const formattedTime = format(timestamp, "HH:mm");
  const edited = updatedTime.getTime() !== timestamp.getTime();

  return (
    <div
      className={cn(
        "group relative flex w-full gap-2 px-2 transition-all duration-200 hover:bg-white/[0.02]",
        isSent ? "flex-row-reverse" : "flex-row",
        isConsecutive ? "mt-0.5" : "mt-4"
      )}
    >
      {/* Avatar Area */}
      <div className={cn("flex-shrink-0 w-8 flex flex-col justify-end", !showAvatar && "invisible")}>
        <Avatar className={cn("h-8 w-8 border-2 shadow-sm transition-transform hover:scale-105", isSent ? "border-primary/20" : "border-white/10")}>
          <AvatarImage src={displayAvatar} alt={displayName} />
          <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-muted to-muted/50 text-muted-foreground">
            {displayName.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </div>
      
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1 sm:max-w-[70%]",
          isSent ? "items-end" : "items-start"
        )}
      >
        {/* Sender Name (Only for group chats or received messages, and not consecutive) */}
        {!isSent && !isConsecutive && (
          <span className="ml-1 text-[10px] font-bold text-muted-foreground/70 mb-0.5">
            {displayName}
          </span>
        )}

        <div className="relative group/bubble">
          <div
            className={cn(
              "relative px-4 py-2.5 text-sm shadow-sm transition-all duration-200",
              isSent 
                ? "bg-gradient-to-br from-primary to-violet-600 text-white rounded-2xl rounded-tr-sm" 
                : "bg-white/10 backdrop-blur-md border border-white/5 text-foreground rounded-2xl rounded-tl-sm hover:bg-white/15",
              isEditing && "ring-2 ring-offset-2 ring-primary",
              isConsecutive && (isSent ? "rounded-tr-2xl" : "rounded-tl-2xl")
            )}
          >
            <p className={cn("whitespace-pre-wrap leading-relaxed break-words", isSent ? "text-white/95" : "text-foreground/90")}>
              {message.content}
            </p>

            <div className={cn(
              "flex items-center gap-1 mt-1 select-none",
              isSent ? "justify-end text-white/70" : "justify-start text-muted-foreground/60"
            )}>
              <span className="text-[9px] font-medium">{formattedTime}</span>
              {edited && <span className="text-[8px] uppercase tracking-wider opacity-80">Edited</span>}
              {isSent && (
                <span className="ml-0.5">
                  <CheckCheck className="w-3 h-3 opacity-80" />
                </span>
              )}
            </div>
          </div>

          {/* Actions - Floating outside */}
          <div className={cn(
            "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/bubble:opacity-100 transition-all duration-200",
            isSent ? "-left-16" : "-right-16"
          )}>
            {isOwnMessage && (onEdit || onDelete) && (
              <>
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-background/50 hover:text-primary rounded-full backdrop-blur-sm border border-white/5 shadow-sm"
                    onClick={() => onEdit(message)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive rounded-full backdrop-blur-sm border border-white/5 shadow-sm"
                    onClick={() => onDelete(message)}
                  >
                    <Trash2 className="h-3 w-3" />
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
