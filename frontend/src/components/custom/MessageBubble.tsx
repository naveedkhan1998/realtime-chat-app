import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message, User } from "@/services/chatApi";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

export default function MessageBubble({ message, isSent }: MessageBubbleProps) {
  const sender: User = message.sender;
  const timestamp = new Date(message.timestamp);
  const formattedTime = format(timestamp, "HH:mm");

  return (
    <div className={cn("flex w-full gap-3", isSent ? "flex-row-reverse" : "flex-row")}>
      <Avatar className="h-9 w-9 border border-border bg-muted/40 text-primary">
        <AvatarImage src={sender.avatar} alt={sender.name} />
        <AvatarFallback className="text-xs font-semibold text-primary">{sender.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className={cn("flex max-w-[80%] flex-col gap-1 sm:max-w-[70%]", isSent ? "items-end text-right" : "items-start text-left")}>
        <div
          className={cn(
            "w-full rounded-2xl px-4 py-2 text-sm shadow-sm",
            isSent ? "bg-primary text-primary-foreground" : "border border-border bg-background"
          )}
        >
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className={cn("font-semibold", isSent ? "text-primary-foreground/80" : "text-foreground/80")}>{isSent ? "You" : sender.name}</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{formattedTime}</span>
          </div>
          <p className={cn("mt-1 whitespace-pre-wrap leading-relaxed", isSent ? "text-primary-foreground" : "text-foreground")}>{message.content}</p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Delivered • {formattedTime}</span>
      </div>
    </div>
  );
}
