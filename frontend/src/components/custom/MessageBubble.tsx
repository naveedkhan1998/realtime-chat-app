import React from "react";
import { Message, User } from "@/services/chatApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isSent }) => {
  const sender: User = message.sender;
  const timestamp = new Date(message.timestamp);

  return (
    <div className={`flex ${isSent ? "justify-end" : "justify-start"} mb-4`}>
      {!isSent && (
        <Avatar className="w-8 h-8 mr-2">
          <AvatarImage src={sender.avatar} alt={sender.name} />
          <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      <div className={`flex flex-col ${isSent ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-lg p-3 max-w-xs break-words ${
            isSent ? "bg-blue-500 text-white rounded-br-none" : "bg-gray-300 text-black rounded-bl-none"
          }`}
        >
          {!isSent && <p className="text-sm font-semibold mb-1">{sender.name}</p>}
          <p>{message.content}</p>
        </div>
        <span className="text-xs text-gray-500 mt-1">
          {format(timestamp, "p")}
        </span>
      </div>
      {isSent && (
        <Avatar className="w-8 h-8 ml-2">
          <AvatarImage src={sender.avatar} alt={sender.name} />
          <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default MessageBubble;
