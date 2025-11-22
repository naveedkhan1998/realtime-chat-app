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
  const formattedDate = format(timestamp, "MMM d, yyyy");
  const edited = updatedTime.getTime() !== timestamp.getTime();

  return (
    <div
      className={cn(
        "group relative flex w-full gap-3",
        isSent ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Avatar className="h-8 w-8 border border-border">
        <AvatarImage src={sender.avatar} alt={sender.name} />
        <AvatarFallback className="text-[10px] font-semibold bg-muted text-muted-foreground">{sender.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1 sm:max-w-[70%]",
          isSent ? "items-end text-right" : "items-start text-left",
        )}
      >
        <div
          className={cn(
            "w-full rounded-2xl px-4 py-2 text-sm shadow-sm transition-all duration-200",
            isSent 
              ? "bg-primary text-primary-foreground" 
              : "bg-card border border-border text-foreground",
            isEditing && "ring-2 ring-offset-2 ring-primary",
          )}
        >
          <div className="flex items-start justify-between gap-3 text-xs mb-1">
            <div className="flex flex-col items-start gap-0.5">
              <span className={cn("font-bold text-[11px]", isSent ? "text-primary-foreground/90" : "text-foreground")}>{isSent ? "You" : sender.name}</span>
              {edited && <span className={cn("text-[9px] uppercase tracking-wider font-medium", isSent ? "text-primary-foreground/70" : "text-muted-foreground")}>Edited</span>}
            </div>
            <span className={cn("text-[10px] whitespace-nowrap opacity-70", isSent ? "text-primary-foreground" : "text-muted-foreground")}>
              {formattedDate} · {formattedTime}
            </span>
          </div>
          <p className={cn("whitespace-pre-wrap leading-relaxed", isSent ? "text-primary-foreground" : "text-foreground")}>{message.content}</p>
        </div>
        <div className="flex w-full items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground px-1">
          <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity">Delivered</span>
          {isOwnMessage && (onEdit || onDelete) && (
            <div
              className={cn(
                "flex items-center gap-1 transition-opacity",
                isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-muted hover:text-foreground rounded-full"
                  onClick={() => onEdit(message)}
                  title="Edit message"
                  aria-label="Edit message"
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
                  title="Delete message"
                  aria-label="Delete message"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
