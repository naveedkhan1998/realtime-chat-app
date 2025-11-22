import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message, User } from "@/services/chatApi";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
  isOwnMessage?: boolean;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  isEditing?: boolean;
}

export default function MessageBubble({ message, isSent, isOwnMessage = false, onEdit, onDelete, isEditing }: MessageBubbleProps) {
  const sender: User = message.sender;
  const timestamp = new Date(message.timestamp);
  const updatedTime = new Date(message.updated_at);
  const formattedTime = format(timestamp, "HH:mm");
  const edited = updatedTime.getTime() !== timestamp.getTime();

  return (
    <div
      className={cn(
        "group relative flex w-full gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isSent ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Avatar className={cn("h-8 w-8 border-2 shadow-sm", isSent ? "border-primary/20" : "border-white/10")}>
        <AvatarImage src={sender.avatar} alt={sender.name} />
        <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-muted to-muted/50 text-muted-foreground">
          {sender.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1 sm:max-w-[70%]",
          isSent ? "items-end text-right" : "items-start text-left",
        )}
      >
        <div
          className={cn(
            "relative w-full rounded-2xl px-4 py-2.5 text-sm shadow-sm transition-all duration-200",
            isSent 
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm" 
              : "bg-white/5 backdrop-blur-md border border-white/10 text-foreground rounded-tl-sm hover:bg-white/10",
            isEditing && "ring-2 ring-offset-2 ring-primary",
          )}
        >
          {/* Sender Name (Only for group chats or received messages) */}
          {!isSent && (
            <span className="block text-[10px] font-bold text-primary mb-1 opacity-80">
              {sender.name}
            </span>
          )}

          <p className={cn("whitespace-pre-wrap leading-relaxed break-words", isSent ? "text-primary-foreground" : "text-foreground/90")}>
            {message.content}
          </p>

          <div className={cn(
            "flex items-center gap-1.5 mt-1",
            isSent ? "justify-end text-primary-foreground/70" : "justify-start text-muted-foreground"
          )}>
            <span className="text-[9px] font-medium">{formattedTime}</span>
            {edited && <span className="text-[8px] uppercase tracking-wider opacity-80">Edited</span>}
          </div>
        </div>

        {/* Actions */}
        <div className={cn(
          "flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity px-1",
          isSent ? "flex-row-reverse" : "flex-row"
        )}>
          {isOwnMessage && (onEdit || onDelete) && (
            <>
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-primary/10 hover:text-primary rounded-full"
                  onClick={() => onEdit(message)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive rounded-full"
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
  );
}
