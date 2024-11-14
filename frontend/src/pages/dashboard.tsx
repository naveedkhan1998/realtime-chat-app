import { useState, useEffect } from "react";
import { useAppSelector } from "@/app/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { MessageSquare, Phone, Video, Users, Settings, Search, PlusCircle, ArrowLeft, Send } from "lucide-react";

interface ChatPreview {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
}

export default function Dashboard() {
  const user = useAppSelector((state) => state.auth.user);
  const [activeChat, setActiveChat] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!user) return null;

  const recentChats: ChatPreview[] = [
    { id: 1, name: "Alice Smith", avatar: "/placeholder.svg?height=40&width=40", lastMessage: "Hey, how's it going?", time: "5m", unread: 2 },
    { id: 2, name: "Bob Johnson", avatar: "/placeholder.svg?height=40&width=40", lastMessage: "Can we meet tomorrow?", time: "1h", unread: 0 },
    { id: 3, name: "Carol Williams", avatar: "/placeholder.svg?height=40&width=40", lastMessage: "Thanks for your help!", time: "2h", unread: 1 },
    { id: 4, name: "David Brown", avatar: "/placeholder.svg?height=40&width=40", lastMessage: "See you later!", time: "1d", unread: 0 },
  ];

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log(`Sending message to chat ${activeChat}: ${message}`);
      setMessage("");
    }
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      <div className="p-4">
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
        <div className="relative mb-4">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input placeholder="Search chats" className="pl-8" />
        </div>
        <Button className="w-full mb-4">
          <PlusCircle className="w-4 h-4 mr-2" /> New Chat
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {recentChats.map((chat) => (
            <Button key={chat.id} variant={activeChat === chat.id ? "secondary" : "ghost"} className="justify-start w-full px-2 py-6" onClick={() => setActiveChat(chat.id)}>
              <Avatar className="w-10 h-10 mr-3">
                <AvatarImage src={chat.avatar} alt={chat.name} />
                <AvatarFallback>{chat.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="flex justify-between">
                  <span className="font-medium">{chat.name}</span>
                  <span className="text-xs text-gray-500">{chat.time}</span>
                </div>
                <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && <div className="flex items-center justify-center w-5 h-5 ml-2 text-xs rounded-full bg-primary text-primary-foreground">{chat.unread}</div>}
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const ChatArea = () => (
    <div className="flex flex-col h-full">
      <header className={` ${activeChat ? "flex" : "hidden"} items-center justify-between p-4 bg-white border-b dark:bg-gray-800 dark:border-gray-700`}>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        {activeChat && (
          <div className="flex items-center">
            <Avatar className="w-8 h-8 mr-2">
              <AvatarImage src={recentChats.find((chat) => chat.id === activeChat)?.avatar} alt={recentChats.find((chat) => chat.id === activeChat)?.name} />
              <AvatarFallback>{recentChats.find((chat) => chat.id === activeChat)?.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h2 className="text-lg font-semibold">{recentChats.find((chat) => chat.id === activeChat)?.name}</h2>
          </div>
        )}
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

      <div className="flex-1 p-4 overflow-auto">
        {activeChat ? (
          <Card className="h-full">
            <CardContent className="p-4">
              <p className="text-center text-gray-500">Chat messages will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center h-full">
            <CardContent>
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-center text-gray-500">Select a chat to start messaging</p>
            </CardContent>
          </Card>
        )}
      </div>

      {activeChat && (
        <div className="p-4 bg-white border-t dark:bg-gray-800 dark:border-gray-700">
          <div className="flex space-x-2">
            <Input placeholder="Type a message..." value={message} onChange={(e) => setMessage(e.target.value)} />
            <Button onClick={handleSendMessage}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

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
