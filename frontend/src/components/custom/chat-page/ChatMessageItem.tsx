import { Message } from "@/services/chatApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

export default function ChatMessageItem({ message, isOwnMessage }: MessageItemProps) {
  const messageDate = new Date(message.timestamp);

  const formatMessageDate = (date: Date) => {
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "MMM d");
    }
  };

  const formattedDate = formatMessageDate(messageDate);

  return (
    <div className={cn("flex items-end gap-2 mb-4", isOwnMessage ? "flex-row-reverse" : "flex-row")}>
      {!isOwnMessage && (
        <Avatar className="w-8 h-8 border-2 border-primary">
          <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
          <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex flex-col max-w-[75%]", isOwnMessage ? "items-end" : "items-start")}>
        <div className={cn("px-4 py-2 rounded-2xl shadow-md", isOwnMessage ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
          <p className="text-sm leading-relaxed break-words">{message.content}</p>
        </div>
        <div className={cn("flex items-center mt-1 text-xs", isOwnMessage ? "flex-row-reverse" : "flex-row")}>
          {!isOwnMessage && <span className="mr-2 font-semibold text-muted-foreground">{message.sender.name}</span>}
          <time className="text-muted-foreground" dateTime={message.timestamp}>
            {formattedDate}
          </time>
        </div>
      </div>
    </div>
  );
}
