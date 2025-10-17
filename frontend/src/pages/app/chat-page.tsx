/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/app/hooks";

import { useGetChatRoomsQuery } from "@/services/chatApi";
import { WebSocketService } from "@/utils/websocket";
import {
  addMessage,
  replaceMessage,
  removeMessage,
  setPresence,
  updatePresence,
  updateTypingStatus,
  setCollaborativeNote,
  setCursorState,
  updateCursor,
  setHuddleParticipants,
} from "@/features/chatSlice";
import ChatWindow from "@/components/custom/ChatWindow";
import { AppShellContext } from "@/layouts/AppShell";
import { MessageSquareMore } from "lucide-react";

export default function ChatPage() {
  const { activeChat, setActiveChat, isMobile } = useOutletContext<AppShellContext>();
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  const { data: chatRooms } = useGetChatRoomsQuery(undefined, { pollingInterval: 10000 });

  useEffect(() => {
    if (activeChat && accessToken) {
      const ws = WebSocketService.getInstance();
      ws.connect(activeChat, accessToken);

      const handleNewMessage = (event: any) => {
        dispatch(addMessage({ chatRoomId: activeChat, message: event.message }));
      };
      const handleUpdatedMessage = (event: any) => {
        dispatch(replaceMessage({ chatRoomId: activeChat, message: event.message }));
      };
      const handleDeletedMessage = (event: any) => {
        dispatch(removeMessage({ chatRoomId: activeChat, messageId: event.message_id }));
      };
      const handlePresenceState = (event: any) => {
        dispatch(setPresence({ chatRoomId: activeChat, users: event.users }));
      };
      const handlePresenceUpdate = (event: any) => {
        dispatch(updatePresence({ chatRoomId: activeChat, action: event.action, user: event.user }));
      };
      const handleTyping = (event: any) => {
        dispatch(updateTypingStatus({ chatRoomId: activeChat, userId: event.user_id, isTyping: event.is_typing }));
      };
      const handleCollabState = (event: any) => {
        dispatch(setCollaborativeNote({ chatRoomId: activeChat, content: event.content }));
      };
      const handleCollabUpdate = (event: any) => {
        dispatch(setCollaborativeNote({ chatRoomId: activeChat, content: event.content }));
      };
      const handleCursorState = (event: any) => {
        dispatch(setCursorState({ chatRoomId: activeChat, cursors: event.cursors }));
      };
      const handleCursorUpdate = (event: any) => {
        dispatch(updateCursor({ chatRoomId: activeChat, userId: event.user.id, cursor: event.cursor }));
      };
      const handleHuddleParticipants = (event: any) => {
        console.log('🎙️ Received huddle_participants event:', event);
        dispatch(setHuddleParticipants({ chatRoomId: activeChat, participants: event.participants }));
      };

      ws.on("chat_message", handleNewMessage);
      ws.on("message_updated", handleUpdatedMessage);
      ws.on("message_deleted", handleDeletedMessage);
      ws.on("presence_state", handlePresenceState);
      ws.on("presence_update", handlePresenceUpdate);
      ws.on("typing_status", handleTyping);
      ws.on("collab_state", handleCollabState);
      ws.on("collab_update", handleCollabUpdate);
      ws.on("cursor_state", handleCursorState);
      ws.on("cursor_update", handleCursorUpdate);
      ws.on("huddle_participants", handleHuddleParticipants);

      return () => {
        ws.off("chat_message", handleNewMessage);
        ws.off("message_updated", handleUpdatedMessage);
        ws.off("message_deleted", handleDeletedMessage);
        ws.off("presence_state", handlePresenceState);
        ws.off("presence_update", handlePresenceUpdate);
        ws.off("typing_status", handleTyping);
        ws.off("collab_state", handleCollabState);
        ws.off("collab_update", handleCollabUpdate);
        ws.off("cursor_state", handleCursorState);
        ws.off("cursor_update", handleCursorUpdate);
        ws.off("huddle_participants", handleHuddleParticipants);
        ws.disconnect();
      };
    }
  }, [activeChat, accessToken, dispatch]);

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 h-full">
      {activeChat ? (
        <ChatWindow user={user} activeChat={activeChat} setActiveChat={setActiveChat} isMobile={isMobile} chatRooms={chatRooms} />
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-10 text-center">
          <div className="glass-card p-12 rounded-3xl shadow-glass max-w-md">
            <span className="flex items-center justify-center w-16 h-16 mb-6 mx-auto rounded-2xl gradient-primary text-white shadow-glow animate-float">
              <MessageSquareMore className="w-8 h-8" />
            </span>
            <h2 className="text-2xl font-bold text-foreground mb-3">Pick a conversation to get started</h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Open an existing thread from the sidebar or create a new chat to see live messages stream in real time.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
