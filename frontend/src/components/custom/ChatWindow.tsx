import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Users,
  Settings,
  ArrowLeft,
  Send,
  Loader2,
  Paperclip,
  Smile,
} from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import {
  Message,
  ChatRoom,
  User,
  useLazyGetMessagesPageQuery,
} from '@/services/chatApi';
import { WebSocketService } from '@/utils/websocket';
import { UserProfile } from '@/services/userApi';
import { prependMessages, setMessagePagination, setMessages } from '@/features/chatSlice';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import MessageBubble from './MessageBubble';

interface ChatWindowProps {
  user: UserProfile;
  activeChat: number;
  setActiveChat: (chatId: number | undefined) => void;
  isMobile: boolean;
  chatRooms: ChatRoom[] | undefined;
}

const emptyMessages: Message[] = [];

export default function ChatWindow({
  user,
  activeChat,
  setActiveChat,
  isMobile,
  chatRooms,
}: ChatWindowProps) {
  const dispatch = useAppDispatch();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const messages = useAppSelector(
    state => state.chat.messages[activeChat] || emptyMessages
  );
  const existingMessagesRef = useRef(messages);
  const nextCursor = useAppSelector(
    state => state.chat.pagination[activeChat]?.nextCursor ?? null
  );
  const { register, handleSubmit, reset } = useForm<{ message: string }>();
  const [fetchMessagesPage] = useLazyGetMessagesPageQuery();
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const initialScrollDoneRef = useRef(false);

  const scrollToBottom = useCallback(
    (behavior: "auto" | "instant" | "smooth" = "smooth") => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
      }
    },
    []
  );

  const activeRoom = chatRooms?.find(chat => chat.id === activeChat);
  const otherParticipant =
    activeRoom?.participants.find(participant => participant.id !== user.id) ||
    user;

  const extractCursor = useCallback((url: string | null) => {
    if (!url) {
      return null;
    }
    try {
      const parsed = new URL(url);
      return parsed.searchParams.get('cursor');
    } catch {
      return null;
    }
  }, []);

  const fetchInitialMessages = useCallback(async () => {
    if (!activeChat) {
      return;
    }
    setInitialLoading(true);
    setInitialError(null);
    setLoadMoreError(null);
    try {
      const response = await fetchMessagesPage({
        chat_room_id: activeChat,
        limit: 30,
      }).unwrap();
      const ordered = [...response.results].reverse();
      const merged = mergeMessages(existingMessagesRef.current, ordered);
      dispatch(setMessages({ chatRoomId: activeChat, messages: merged }));
      dispatch(
        setMessagePagination({
          chatRoomId: activeChat,
          nextCursor: extractCursor(response.next),
        }),
      );
      shouldAutoScrollRef.current = true;
      requestAnimationFrame(() => scrollToBottom("auto"));
      initialScrollDoneRef.current = true;
    } catch (error) {
      console.error('Failed to load messages', error);
      setInitialError('Unable to load messages. Try again.');
      dispatch(setMessages({ chatRoomId: activeChat, messages: [] }));
      dispatch(
        setMessagePagination({ chatRoomId: activeChat, nextCursor: null }),
      );
    } finally {
      setInitialLoading(false);
    }
  }, [activeChat, dispatch, extractCursor, fetchMessagesPage, scrollToBottom]);

  const handleLoadMore = useCallback(async () => {
    if (!activeChat || !nextCursor) {
      return;
    }
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const response = await fetchMessagesPage({
        chat_room_id: activeChat,
        cursor: nextCursor,
        limit: 30,
      }).unwrap();
      const ordered = [...response.results].reverse();
      shouldAutoScrollRef.current = false;
      dispatch(prependMessages({ chatRoomId: activeChat, messages: ordered }));
      dispatch(
        setMessagePagination({
          chatRoomId: activeChat,
          nextCursor: extractCursor(response.next),
        }),
      );
    } catch (error) {
      console.error('Failed to load older messages', error);
      setLoadMoreError("Couldn't load older messages. Try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [activeChat, dispatch, extractCursor, fetchMessagesPage, nextCursor]);

  const handleRetry = useCallback(() => {
    fetchInitialMessages();
  }, [fetchInitialMessages]);

  useEffect(() => {
    fetchInitialMessages();
  }, [fetchInitialMessages]);

  useEffect(() => {
    initialScrollDoneRef.current = false;
    shouldAutoScrollRef.current = true;
  }, [activeChat]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    const behavior = initialScrollDoneRef.current ? "smooth" : "auto";
    if (!shouldAutoScrollRef.current) {
      shouldAutoScrollRef.current = true;
      return;
    }
    scrollToBottom(behavior);
    initialScrollDoneRef.current = true;
  }, [messages, scrollToBottom]);

  useEffect(() => {
    existingMessagesRef.current = messages;
  }, [messages]);

  const onSubmit = handleSubmit(({ message }) => {
    if (message.trim()) {
      const ws = WebSocketService.getInstance();
      ws.send({ type: 'send_message', content: message });
      shouldAutoScrollRef.current = true;
      reset();
    }
  });

  return (
    <div className="flex max-h-[calc(100dvh)] flex-1 flex-col overflow-hidden   bg-background">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border/60 sm:px-6">
        <div className="flex items-center flex-1 gap-3">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveChat(undefined)}
              aria-label="Back to conversations"
              className="border rounded-full border-border"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Avatar className="border h-11 w-11 border-border bg-muted/60">
            <AvatarImage
              src={activeRoom?.is_group_chat ? '' : otherParticipant.avatar}
              alt={activeRoom?.name || otherParticipant.name}
            />
            <AvatarFallback className="text-sm font-semibold text-primary">
              {(activeRoom?.is_group_chat
                ? activeRoom.name
                : otherParticipant.name
              )?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate text-foreground sm:text-base">
              {activeRoom?.name || otherParticipant.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeRoom?.participants.length ?? 0} participant
              {activeRoom && activeRoom.participants.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            label="View participants"
            onClick={() => setIsParticipantsModalOpen(true)}
          >
            <Users className="w-4 h-4" />
          </IconButton>
          <IconButton label="Channel settings">
            <Settings className="w-4 h-4" />
          </IconButton>
        </div>
      </header>

  <ScrollArea className="flex-1 px-4 py-4 sm:px-6">
    <div className="space-y-4">
      {!initialLoading && nextCursor && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            className="text-xs font-medium rounded-full border-border"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : 'Load previous messages'}
          </Button>
        </div>
      )}

      {loadMoreError && (
        <div className="text-xs text-center text-destructive">
          {loadMoreError}{' '}
          <button
            type="button"
            className="font-semibold underline hover:no-underline"
            onClick={handleLoadMore}
          >
            Retry
          </button>
        </div>
      )}

      {initialLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : initialError ? (
        <Card className="text-red-700 border border-red-200 bg-red-100/80 dark:border-red-400/40 dark:bg-red-900/40 dark:text-red-100">
          <CardContent className="p-6 space-y-3 text-sm font-medium text-center">
            <p>{initialError}</p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : messages.length > 0 ? (
        messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            isSent={message.sender.id === user.id}
          />
        ))
      ) : (
        <Card className="border border-dashed border-border bg-muted/40">
          <CardContent className="p-8 space-y-2 text-center">
            <p className="text-base font-semibold text-foreground">
              Say hello
            </p>
            <p className="text-sm text-muted-foreground">
              No messages yet. Drop the first update to kick off the
              conversation.
            </p>
          </CardContent>
        </Card>
      )}
      <div ref={messagesEndRef} />
    </div>
  </ScrollArea>

      <form
        onSubmit={onSubmit}
        className="px-3 py-3 border-t border-border/60 bg-background sm:px-6"
      >
        <div className="flex flex-col gap-2 px-3 py-2 border rounded-2xl border-border/80 bg-muted/40 sm:flex-row sm:items-center sm:gap-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <ComposerIcon
              type="button"
              icon={<Paperclip className="w-4 h-4" />}
              label="Attach file"
            />
            <ComposerIcon
              type="button"
              icon={<Smile className="w-4 h-4" />}
              label="Insert emoji"
            />
          </div>
          <div className="flex items-center flex-1 gap-2 sm:gap-3">
            <Input
              {...register('message')}
              placeholder="Write a message..."
              autoComplete="off"
              className="flex-1 h-10 px-0 text-sm bg-transparent border-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full h-9 w-9 sm:h-10 sm:w-10"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </form>

      <ParticipantsModal
        isOpen={isParticipantsModalOpen}
        onClose={() => setIsParticipantsModalOpen(false)}
        participants={activeRoom?.participants || []}
      />
    </div>
  );
}

interface ParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: User[];
}

function ParticipantsModal({
  isOpen,
  onClose,
  participants,
}: ParticipantsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border shadow-lg border-border bg-background/95">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Participants
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          {participants.map(participant => (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-3 text-sm border rounded-xl border-border/80 bg-muted/30"
            >
              <Avatar className="w-10 h-10 border border-border bg-background">
                <AvatarImage src={participant.avatar} alt={participant.name} />
                <AvatarFallback className="text-sm font-semibold text-primary">
                  {participant.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">{participant.name}</p>
                <p className="text-xs text-muted-foreground">
                  {participant.email}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="text-xs font-medium border rounded-full border-border bg-background text-muted-foreground"
              >
                Member
              </Badge>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      className="border rounded-full h-9 w-9 border-border text-muted-foreground hover:text-primary"
      title={label}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

function ComposerIcon({
  type,
  icon,
  label,
}: {
  type: 'button' | 'submit';
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      className="flex items-center justify-center border rounded-full h-9 w-9 border-border bg-background text-muted-foreground hover:text-primary"
    >
      {icon}
    </button>
  );
}

function mergeMessages(existing: Message[], incoming: Message[]): Message[] {
  if (!incoming.length) {
    return existing;
  }
  const byId = new Map<number, Message>();
  for (const message of existing) {
    byId.set(message.id, message);
  }
  for (const message of incoming) {
    byId.set(message.id, message);
  }
  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}
