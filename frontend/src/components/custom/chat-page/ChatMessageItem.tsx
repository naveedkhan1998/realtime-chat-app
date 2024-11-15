import { Message } from "@/services/chatApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

export default function ChatMessageItem({ message, isOwnMessage }: MessageItemProps) {
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("flex items-end space-x-2 mb-4", isOwnMessage ? "flex-row-reverse space-x-reverse" : "flex-row")}>
      {!isOwnMessage && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={message.sender.avatar} alt={message.sender.name} />
          <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex flex-col max-w-[70%]", isOwnMessage ? "items-end" : "items-start")}>
        <div className={cn("px-4 py-2 rounded-2xl shadow-sm", isOwnMessage ? "bg-[#3E54AC] text-white" : "bg-white border border-gray-200")}>
          <p className="text-sm break-words">{message.content}</p>
        </div>
        <div className="flex items-center mt-1 space-x-2">
          {!isOwnMessage && <span className="text-xs font-medium text-gray-600">{message.sender.name}</span>}
          <time className="text-xs text-gray-400" dateTime={message.timestamp}>
            {formattedTime}
          </time>
        </div>
      </div>
    </div>
  );
}
