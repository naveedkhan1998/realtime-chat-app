import { useEffect, useRef, useState, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Loader2, Hash, ArrowDown, Sparkles, MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message, ChatRoom } from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';
import MessageBubble from '../MessageBubble';
import { getAvatarUrl, cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { isSameDay, format, isToday, isYesterday } from 'date-fns';

interface MessageListProps {
  messages: Message[];
  user: UserProfile;
  activeRoom: ChatRoom | undefined;
  startEditing: (message: Message) => void;
  handleDeleteMessage: (message: Message) => void;
  handleLoadMore: () => void;
  loadingMore: boolean;
  initialLoading: boolean;
  editingMessageId: number | undefined;
  scrollToBottom?: () => void;
}

const formatDateDivider = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
};

export default function MessageList({
  messages,
  user,
  activeRoom,
  startEditing,
  handleDeleteMessage,
  handleLoadMore,
  loadingMore,
  initialLoading,
  editingMessageId,
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const prevMessagesLengthRef = useRef(messages.length);
  const isInitialLoadRef = useRef(true);

  // Scroll to bottom helper that guarantees 100% scroll to the last pixel
  const scrollToBottomToEnd = useCallback(
    (behavior: 'smooth' | 'auto' = 'smooth') => {
      if (messages.length === 0) return;

      // 1. Virtuoso virtual item scroll
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior,
      });

      // 2. Direct DOM scroller scroll to eliminate any remaining sub-pixel or measurement offset
      requestAnimationFrame(() => {
        if (scrollerRef.current) {
          scrollerRef.current.scrollTo({
            top: scrollerRef.current.scrollHeight,
            behavior,
          });
        }
      });

      // 3. Fallback tick in case item contents finished rendering or resizing
      setTimeout(() => {
        if (scrollerRef.current) {
          const maxScroll =
            scrollerRef.current.scrollHeight - scrollerRef.current.clientHeight;
          if (Math.abs(scrollerRef.current.scrollTop - maxScroll) > 1) {
            scrollerRef.current.scrollTo({
              top: maxScroll,
              behavior,
            });
          }
        }
      }, 50);
    },
    [messages.length]
  );

  // Reset initial load flag on active room change
  useEffect(() => {
    isInitialLoadRef.current = true;
  }, [activeRoom?.id]);

  // Scroll to bottom on initial load or room change
  useEffect(() => {
    if (!initialLoading && messages.length > 0 && isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      const timer = setTimeout(() => {
        scrollToBottomToEnd('auto');
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [initialLoading, messages.length, scrollToBottomToEnd]);

  // Auto-scroll when new messages arrive:
  // If the last message is sent by current user, always scroll down smoothly.
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.sender.id === user.id) {
        const timer = setTimeout(() => {
          scrollToBottomToEnd('smooth');
        }, 30);
        return () => clearTimeout(timer);
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, user.id, scrollToBottomToEnd]);

  const otherParticipant = activeRoom?.is_group_chat
    ? null
    : activeRoom?.participants.find(p => p.id !== user.id);

  return (
    <div className="relative flex-1 w-full h-full bg-background/20">
      {initialLoading ? (
        <div className="flex flex-col items-center justify-center h-full space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">
            Loading message history...
          </p>
        </div>
      ) : messages.length > 0 ? (
        <Virtuoso
          key={`virtuoso-room-${activeRoom?.id || 'default'}`}
          ref={virtuosoRef}
          scrollerRef={ref => {
            scrollerRef.current = ref as HTMLElement;
          }}
          style={{ height: '100%' }}
          data={messages}
          startReached={handleLoadMore}
          initialTopMostItemIndex={Math.max(0, messages.length - 1)}
          followOutput={isAtBottom => (isAtBottom ? 'smooth' : false)}
          computeItemKey={(index, message) =>
            message.id
              ? `msg-${message.id}`
              : message.client_id
              ? `client-${message.client_id}`
              : `idx-${index}`
          }
          atBottomStateChange={atBottom => setShowScrollButton(!atBottom)}
          components={{
            Header: () => (
              <div className="flex items-center justify-center py-4">
                {loadingMore && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card/90 border border-border text-xs text-muted-foreground shadow-xs backdrop-blur-md">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Loading earlier messages...</span>
                  </div>
                )}
              </div>
            ),
          }}
          itemContent={(index, message) => {
            const isOwnMessage = message.sender.id === user.id;
            const prevMessage = messages[index - 1];
            const nextMessage = messages[index + 1];

            // Calendar date separator logic
            const showDateDivider =
              !prevMessage ||
              !isSameDay(
                new Date(message.timestamp),
                new Date(prevMessage.timestamp)
              );

            const isConsecutive = Boolean(
              prevMessage &&
              prevMessage.sender.id === message.sender.id &&
              !showDateDivider
            );

            const isLastInSequence =
              !nextMessage ||
              nextMessage.sender.id !== message.sender.id ||
              (nextMessage &&
                !isSameDay(
                  new Date(nextMessage.timestamp),
                  new Date(message.timestamp)
                ));

            const senderProfile =
              activeRoom?.participants.find(p => p.id === message.sender.id) ||
              (message.sender.id === user.id ? user : message.sender);

            const isLastMessage = index === messages.length - 1;

            return (
              <div
                key={message.id || message.client_id || index}
                className={cn(isLastMessage && 'pb-2.5 sm:pb-3')}
              >
                {/* Date Separator Divider */}
                {showDateDivider && (
                  <div className="flex items-center my-4 px-4 sm:px-8">
                    <div className="flex-1 h-[1px] bg-border/40" />
                    <span className="mx-3 px-3 py-0.5 rounded-full bg-card/95 border border-border/60 text-[10px] sm:text-[11px] font-semibold text-muted-foreground shadow-xs backdrop-blur-md select-none">
                      {formatDateDivider(message.timestamp)}
                    </span>
                    <div className="flex-1 h-[1px] bg-border/40" />
                  </div>
                )}

                <div className="px-1.5 sm:px-4">
                  <MessageBubble
                    message={message}
                    isSent={isOwnMessage}
                    isOwnMessage={isOwnMessage}
                    onEdit={
                      isOwnMessage ? () => startEditing(message) : undefined
                    }
                    onDelete={
                      isOwnMessage
                        ? () => handleDeleteMessage(message)
                        : undefined
                    }
                    isEditing={editingMessageId === message.id}
                    showAvatar={isLastInSequence}
                    isConsecutive={isConsecutive}
                    senderAvatar={senderProfile.avatar}
                    senderName={senderProfile.name}
                  />
                </div>
              </div>
            );
          }}
        />
      ) : (
        /* Elevated Modern Channel / Conversation Welcome Hero */
        <div className="flex flex-col items-center justify-center h-full px-4 text-center pb-16">
          <div className="max-w-md w-full mx-auto p-6 sm:p-8 rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-sm">
            {activeRoom?.is_group_chat ? (
              <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-primary/25 via-primary/10 to-indigo-500/20 border border-primary/30 text-primary shadow-inner">
                <Hash className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.2]" />
              </div>
            ) : otherParticipant ? (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4">
                <Avatar className="w-full h-full rounded-3xl border-2 border-border/60 shadow-md">
                  <AvatarImage
                    src={getAvatarUrl(otherParticipant.avatar)}
                    alt={otherParticipant.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-xl sm:text-2xl font-bold bg-primary/15 text-primary rounded-3xl">
                    {otherParticipant.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-card" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-3xl bg-primary/15 text-primary">
                <Sparkles className="w-8 h-8" />
              </div>
            )}

            <h3 className="text-base sm:text-xl font-bold text-foreground tracking-tight">
              {activeRoom?.is_group_chat
                ? `Welcome to #${activeRoom.name || 'channel'}`
                : `Say hello to ${otherParticipant?.name || 'your contact'}`}
            </h3>

            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {activeRoom?.is_group_chat
                ? `This is the start of the #${activeRoom.name || 'channel'} channel. Share ideas, files, and start instant audio calls.`
                : 'This is the start of your message history. Say hi or initiate a WebRTC voice call.'}
            </p>

            <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Type below to send a message</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">
                <Phone className="w-3.5 h-3.5" />
                <span>Voice calls supported</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-30"
          >
            <Button
              size="icon"
              className="w-10 h-10 rounded-full shadow-lg bg-card/95 hover:bg-card border border-border/80 text-foreground backdrop-blur-xl active:scale-95 transition-all"
              onClick={() => scrollToBottomToEnd('smooth')}
              title="Jump to latest messages"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4 text-primary" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
