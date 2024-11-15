// MessageItem.tsx
import React from "react";
import { Message } from "@/services/chatApi";

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isOwnMessage }) => {
  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div className={`p-2 rounded-lg max-w-[70%] ${isOwnMessage ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
        <p className="break-words">{message.content}</p>
        <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default MessageItem;
