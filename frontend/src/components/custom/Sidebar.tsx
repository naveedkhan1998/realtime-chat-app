import React from "react";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { logOut } from "@/features/authSlice";
import { setThemeRedux } from "@/features/themeSlice";
import { useGetChatRoomsQuery } from "@/services/chatApi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Moon, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";
import { ChatRoom } from "@/services/chatApi";

import { ArrowLeft } from "lucide-react";

interface SidebarProps {
  activeChat: number | undefined;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
}

import { LogOut } from "lucide-react";

const Sidebar: React.FC<SidebarProps> = ({ activeChat, setActiveChat, isMobile }) => {
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { data: chatRooms, isLoading: chatRoomsLoading, error: chatRoomsError } = useGetChatRoomsQuery(undefined, { pollingInterval: 10000 });
  const theme = useAppSelector((state) => state.theme.theme);

  const handleLogout = () => {
    dispatch(logOut());
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    dispatch(setThemeRedux(newTheme));
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
  };

  if (!user) return null;

  return (
    <aside className="flex flex-col flex-shrink-0 text-white bg-gray-800 w-80 h-full">
      <div className="p-4 border-b border-gray-700">
        {isMobile && activeChat && (
          <Button variant="ghost" size="icon" onClick={() => setActiveChat(undefined)} className="mb-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12 border-2 border-blue-400">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold">{user.name}</h2>
            <p className="text-sm text-gray-400">Online</p>
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <Search className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
          <Input placeholder="Search chats..." className="py-2 pl-10 pr-4 text-white placeholder-gray-400 bg-gray-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <nav className="flex flex-col p-4 space-y-2 border-b border-gray-700">
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `flex items-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 ${isActive ? "bg-gray-700 text-white" : ""}`
          }
          onClick={() => setActiveChat(undefined)}
        >
          Chats
        </NavLink>
        <NavLink to="/friends" className={({ isActive }) => `flex items-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 ${isActive ? "bg-gray-700 text-white" : ""}`}>
          Friends
        </NavLink>
        <NavLink to="/new-chat" className={({ isActive }) => `flex items-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 ${isActive ? "bg-gray-700 text-white" : ""}`}>
          New Chat
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `flex items-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 ${isActive ? "bg-gray-700 text-white" : ""}`}>
          Settings
        </NavLink>
      </nav>

      <div className="flex-grow p-4 space-y-2 overflow-y-auto">
        <h3 className="mb-2 text-sm font-semibold text-gray-400 uppercase">Conversations</h3>
        {chatRoomsLoading ? (
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : chatRoomsError ? (
          <p className="text-sm text-red-400">Error loading chats.</p>
        ) : chatRooms && chatRooms.length > 0 ? (
          chatRooms.map((room: ChatRoom) => (
            <div key={room.id} className={`flex items-center p-3 rounded-lg cursor-pointer ${activeChat === room.id ? "bg-blue-600" : "hover:bg-gray-700"}`} onClick={() => setActiveChat(room.id)}>
              <Avatar className="w-10 h-10 mr-3">
                <AvatarImage src={room.is_group_chat ? "" : room.participants.find((p) => p.id !== user.id)?.avatar || ""} alt={room.name} />
                <AvatarFallback>{(room.is_group_chat ? room.name : room.participants.find((p) => p.id !== user.id)?.name)?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{room.is_group_chat ? room.name : room.participants.find((p) => p.id !== user.id)?.name}</p>
                <p className="text-sm text-gray-400">Last message...</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-400">No chats found.</p>
        )}
      </div>

      <div className="mt-auto p-4 border-t border-gray-700">
        <Button variant="ghost" className="flex items-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 w-full justify-start" onClick={toggleTheme}>
          {theme === "light" ? <Moon className="w-5 h-5 mr-2" /> : <Sun className="w-5 h-5 mr-2" />}
          Toggle Theme
        </Button>
        <Button variant="ghost" className="flex items-center p-2 rounded-lg text-gray-300 hover:bg-gray-700 w-full justify-start mt-2" onClick={handleLogout}>
          <LogOut className="w-5 h-5 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
