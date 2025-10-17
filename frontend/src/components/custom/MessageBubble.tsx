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
      <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-md">
        <AvatarImage src={sender.avatar} alt={sender.name} />
        <AvatarFallback className="text-xs font-semibold gradient-primary text-white">{sender.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1 sm:max-w-[70%]",
          isSent ? "items-end text-right" : "items-start text-left",
        )}
      >
        <div
          className={cn(
            "w-full rounded-2xl px-4 py-2 text-sm shadow-md transition-all duration-300",
            isSent 
              ? "gradient-primary text-white shadow-glow" 
              : "glass-card",
            isEditing && "ring-2 ring-offset-2 ring-primary shadow-glow-strong",
          )}
        >
          <div className="flex items-start justify-between gap-3 text-xs">
            <div className="flex flex-col items-start gap-1">
              <span className={cn("font-bold", isSent ? "text-white/90" : "text-foreground")}>{isSent ? "You" : sender.name}</span>
              {edited && <span className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-medium">Edited</span>}
            </div>
            <span className={cn("text-[10px] font-medium uppercase tracking-[0.2em] whitespace-nowrap", isSent ? "text-white/70" : "text-muted-foreground")}>
              {formattedDate} · {formattedTime}
            </span>
          </div>
          <p className={cn("mt-2 whitespace-pre-wrap leading-relaxed", isSent ? "text-white" : "text-foreground")}>{message.content}</p>
        </div>
        <div className="flex w-full items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="font-medium">Delivered</span>
          {isOwnMessage && (onEdit || onDelete) && (
            <div
              className={cn(
                "flex items-center gap-1 text-[11px] font-medium transition glass rounded-lg px-1",
                isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
              )}
            >
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-primary/10"
                  onClick={() => onEdit(message)}
                  title="Edit message"
                  aria-label="Edit message"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onDelete(message)}
                  title="Delete message"
                  aria-label="Delete message"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
