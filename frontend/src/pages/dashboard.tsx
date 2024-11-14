import { useState, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Phone, Video, Users, Settings, Search, PlusCircle, ArrowLeft, Send } from "lucide-react";

// Import RTK Query hooks
import { useGetChatRoomsQuery, useGetMessagesQuery } from "@/services/chatApi";

// Import WebSocketService
import { WebSocketService } from "@/utils/websocket";

// Import Redux actions
import { addMessage } from "@/features/chatSlice";

export default function Dashboard() {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [message, setMessage] = useState("");

  const accessToken = useAppSelector((state) => state.auth.accessToken);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch chat rooms
  const { data: chatRooms, isLoading: chatRoomsLoading, error: chatRoomsError } = useGetChatRoomsQuery();

  // Fetch messages for the active chat room
  const { data: messagesData, isLoading: messagesLoading, error: messagesError } = useGetMessagesQuery({ chat_room_id: activeChat! }, { skip: !activeChat });

  // WebSocket for real-time updates
  useEffect(() => {
    if (activeChat && accessToken) {
      const ws = WebSocketService.getInstance();
      ws.connect(activeChat, accessToken);

      ws.on("chat_message", (data) => {
        dispatch(addMessage({ chatRoomId: activeChat, message: data }));
      });

      // Handle other events like typing status, read receipts, etc.

      return () => {
        ws.disconnect();
        ws.off("chat_message");
        // Clean up other events
      };
    }
  }, [activeChat, accessToken, dispatch]);

  if (!user) return null;

  const handleSendMessage = () => {
    if (message.trim() && activeChat) {
      const ws = WebSocketService.getInstance();
      ws.send({
        type: "send_message",
        content: message,
      });
      setMessage("");
    }
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="p-4">
        {/* User Info */}
        <div className="flex items-center mb-6 space-x-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{user.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
        </div>
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input placeholder="Search chats" className="pl-8" />
        </div>
        <Button className="w-full mb-4">
          <PlusCircle className="w-4 h-4 mr-2" /> New Chat
        </Button>
      </div>
      {/* Chat Rooms List */}
      <ScrollArea className="flex-1">
        {chatRoomsLoading ? (
          <p>Loading chats...</p>
        ) : chatRoomsError ? (
          <p>Error loading chats</p>
        ) : (
          <div className="p-2 space-y-2">
            {chatRooms?.map((chat) => {
              // Get the other participant (for private chats)
              const otherParticipant = chat.participants.find((p) => p.id !== user.id) || user;

              return (
                <Button key={chat.id} variant={activeChat === chat.id ? "secondary" : "ghost"} className="justify-start w-full px-2 py-6" onClick={() => setActiveChat(chat.id)}>
                  <Avatar className="w-10 h-10 mr-3">
                    <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} />
                    <AvatarFallback>{otherParticipant.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <div className="flex justify-between">
                      <span className="font-medium">{chat.name || otherParticipant.name}</span>
                      {/* Display last message time if available */}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{/* Display last message if available */}</p>
                  </div>
                  {/* Display unread count if available */}
                </Button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  const ChatArea = () => {
    // Get messages from Redux or directly from the query
    const messages = useAppSelector((state) => state.chat.messages[activeChat!] || messagesData || []);

    return (
      <div className="flex flex-col h-full">
        {/* Chat Header */}
        {activeChat && (
          <header className="flex items-center justify-between p-4 bg-white border-b dark:bg-gray-800 dark:border-gray-700">
            {isMobile && (
              <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="flex items-center">
              <Avatar className="w-8 h-8 mr-2">
                <AvatarImage src={chatRooms?.find((chat) => chat.id === activeChat)?.participants[0].avatar} alt="" />
                <AvatarFallback>{chatRooms?.find((chat) => chat.id === activeChat)?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-semibold">{chatRooms?.find((chat) => chat.id === activeChat)?.name || "Chat"}</h2>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon">
                <Phone className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Video className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Users className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </header>
        )}

        {/* Messages Display */}
        <div className="flex-1 p-4 overflow-auto">
          {messagesLoading ? (
            <p>Loading messages...</p>
          ) : messagesError ? (
            <p>Error loading messages</p>
          ) : messages.length > 0 ? (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender.id === user.id ? "justify-end" : "justify-start"}`}>
                  <div className={`p-2 rounded ${msg.sender.id === user.id ? "bg-blue-500 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>
                    <p>{msg.content}</p>
                    <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="h-full">
              <CardContent className="p-4">
                <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Message Input */}
        {activeChat && (
          <div className="p-4 bg-white border-t dark:bg-gray-800 dark:border-gray-700">
            <div className="flex space-x-2">
              <Input
                placeholder="Type a message..."
                value={message}
                // In the message input onChange handler
                onChange={(e) => {
                  setMessage(e.target.value);
                  const ws = WebSocketService.getInstance();
                  ws.send({
                    type: "typing",
                    is_typing: e.target.value.length > 0,
                  });
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSendMessage();
                  }
                }}
              />
              <Button onClick={handleSendMessage}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-100 dark:bg-gray-900">
      {isMobile ? (
        activeChat ? (
          <ChatArea />
        ) : (
          <Sidebar />
        )
      ) : (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
            <Sidebar />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel>
            <ChatArea />
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  );
}
