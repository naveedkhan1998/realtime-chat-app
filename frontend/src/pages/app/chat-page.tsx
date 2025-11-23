/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/app/hooks';

import { useGetChatRoomsQuery } from '@/services/chatApi';
import { WebSocketService } from '@/utils/websocket';
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
} from '@/features/chatSlice';
import ChatWindow from '@/components/custom/ChatWindow';
import { AppShellContext } from '@/layouts/AppShell';
import { MessageSquareMore, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function ChatPage() {
  const { activeChat, setActiveChat, isMobile } =
    useOutletContext<AppShellContext>();
  const user = useAppSelector(state => state.auth.user);
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(state => state.auth.accessToken);

  const { activeRoom } = useGetChatRoomsQuery(undefined, {
    selectFromResult: ({ data }) => ({
      activeRoom: data?.find(room => room.id === activeChat),
    }),
  });

  const pageTitle = activeRoom
    ? `${activeRoom.name || 'Chat'} | MNK Chat`
    : 'Chat | MNK Chat';

  useEffect(() => {
    if (activeChat && accessToken) {
      const ws = WebSocketService.getInstance();
      ws.connect(activeChat, accessToken);

      const handleNewMessage = (event: any) => {
        dispatch(
          addMessage({ chatRoomId: activeChat, message: event.message })
        );
      };
      const handleUpdatedMessage = (event: any) => {
        dispatch(
          replaceMessage({ chatRoomId: activeChat, message: event.message })
        );
      };
      const handleDeletedMessage = (event: any) => {
        dispatch(
          removeMessage({ chatRoomId: activeChat, messageId: event.message_id })
        );
      };
      const handlePresenceState = (event: any) => {
        const usersList = Array.isArray(event.users) ? event.users : event.users.users;
        dispatch(setPresence({ chatRoomId: activeChat, users: usersList }));
      };
      const handlePresenceUpdate = (event: any) => {
        dispatch(
          updatePresence({
            chatRoomId: activeChat,
            action: event.action,
            user: event.user,
          })
        );
      };
      const handleTyping = (event: any) => {
        dispatch(
          updateTypingStatus({
            chatRoomId: activeChat,
            userId: event.user_id,
            isTyping: event.is_typing,
          })
        );
      };
      const handleCollabState = (event: any) => {
        dispatch(
          setCollaborativeNote({
            chatRoomId: activeChat,
            content: event.content,
          })
        );
      };
      const handleCollabUpdate = (event: any) => {
        dispatch(
          setCollaborativeNote({
            chatRoomId: activeChat,
            content: event.content,
          })
        );
      };
      const handleCursorState = (event: any) => {
        dispatch(
          setCursorState({ chatRoomId: activeChat, cursors: event.cursors })
        );
      };
      const handleCursorUpdate = (event: any) => {
        dispatch(
          updateCursor({
            chatRoomId: activeChat,
            userId: event.user.id,
            cursor: event.cursor,
          })
        );
      };
      const handleHuddleParticipants = (event: any) => {
        console.log('🎙️ Received huddle_participants event:', event);
        dispatch(
          setHuddleParticipants({
            chatRoomId: activeChat,
            participants: event.participants,
          })
        );
      };

      ws.on('chat_message', handleNewMessage);
      ws.on('message_updated', handleUpdatedMessage);
      ws.on('message_deleted', handleDeletedMessage);
      ws.on('presence_state', handlePresenceState);
      ws.on('presence_update', handlePresenceUpdate);
      ws.on('typing_status', handleTyping);
      ws.on('collab_state', handleCollabState);
      ws.on('collab_update', handleCollabUpdate);
      ws.on('cursor_state', handleCursorState);
      ws.on('cursor_update', handleCursorUpdate);
      ws.on('huddle_participants', handleHuddleParticipants);

      return () => {
        ws.off('chat_message', handleNewMessage);
        ws.off('message_updated', handleUpdatedMessage);
        ws.off('message_deleted', handleDeletedMessage);
        ws.off('presence_state', handlePresenceState);
        ws.off('presence_update', handlePresenceUpdate);
        ws.off('typing_status', handleTyping);
        ws.off('collab_state', handleCollabState);
        ws.off('collab_update', handleCollabUpdate);
        ws.off('cursor_state', handleCursorState);
        ws.off('cursor_update', handleCursorUpdate);
        ws.off('huddle_participants', handleHuddleParticipants);
        ws.disconnect();
      };
    }
  }, [activeChat, accessToken, dispatch]);

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 w-full h-full">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      {activeChat ? (
        <ChatWindow
          user={user}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          isMobile={isMobile}
          activeRoom={activeRoom}
        />
      ) : (
        <div className="relative flex flex-col items-center justify-center h-full p-8 overflow-hidden text-center">
          {/* Decorative background elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 max-w-md space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 bg-primary/60 rounded-3xl rotate-6 blur-sm" />
              <div className="relative flex items-center justify-center w-full h-full border shadow-2xl bg-card/50 backdrop-blur-xl border-border rounded-3xl">
                <MessageSquareMore className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute -top-2 -right-2 bg-background/50 backdrop-blur-md rounded-full p-1.5 shadow-lg border border-border">
                <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome back, <span className="text-primary">{user.name}</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Select a conversation from the sidebar to start chatting or
                create a new one.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
