import { useEffect, useRef, useState, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Loader2, ArrowDown, Radio, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message, ChatRoom } from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';
import MessageBubble from '../MessageBubble';
import { getAvatarUrl } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { isSameDay, format, isToday, isYesterday } from 'date-fns';
import { PresetKey, channelNo } from '@/components/console';

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
  if (isToday(date)) return 'TODAY';
  if (isYesterday(date)) return 'YESTERDAY';
  return format(date, 'd MMM yyyy').toUpperCase();
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
  const prevLastMessageIdRef = useRef<number | string | undefined>(
    messages[messages.length - 1]?.client_id || messages[messages.length - 1]?.id
  );
  const isInitialLoadRef = useRef(true);
  const isAtBottomRef = useRef(true);

  // Scroll to absolute bottom via Virtuoso index and scroller DOM
  const scrollToBottomToEnd = useCallback(
    (behavior: 'smooth' | 'auto' = 'auto') => {
      if (messages.length === 0) return;
      virtuosoRef.current?.scrollToIndex({
        index: messages.length - 1,
        align: 'end',
        behavior,
      });
      if (scrollerRef.current) {
        if (behavior === 'auto') {
          scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
        } else {
          scrollerRef.current.scrollTo({
            top: scrollerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }
    },
    [messages.length]
  );

  useEffect(() => {
    isInitialLoadRef.current = true;
    isAtBottomRef.current = true;
  }, [activeRoom?.id]);

  useEffect(() => {
    if (!initialLoading && messages.length > 0 && isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      const t1 = setTimeout(() => {
        scrollToBottomToEnd('auto');
      }, 50);
      const t2 = setTimeout(() => {
        scrollToBottomToEnd('auto');
      }, 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [initialLoading, messages.length, scrollToBottomToEnd]);

  // Handle new incoming and outgoing messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const lastMessageKey = lastMessage?.client_id || lastMessage?.id;
    const isLengthIncreased = messages.length > prevMessagesLengthRef.current;
    const isLastMessageChanged =
      lastMessageKey !== undefined &&
      lastMessageKey !== prevLastMessageIdRef.current;
    const isOwnMessage = lastMessage?.sender?.id === user.id;

    if (isLengthIncreased || (isOwnMessage && isLastMessageChanged)) {
      if (isOwnMessage) {
        // Own message: scroll down immediately with zero lag
        scrollToBottomToEnd('auto');

        // Pass 1: 50ms - allows textarea height reset & React DOM render to settle
        const t1 = setTimeout(() => {
          scrollToBottomToEnd('auto');
        }, 50);

        // Pass 2: 160ms - allows Virtuoso ResizeObserver height measurement pass to settle
        const t2 = setTimeout(() => {
          scrollToBottomToEnd('auto');
        }, 160);

        prevMessagesLengthRef.current = messages.length;
        prevLastMessageIdRef.current = lastMessageKey;

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      } else if (isAtBottomRef.current) {
        // Inbound message: smoothly scroll to end if currently reading at bottom
        const timer = setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({
            index: messages.length - 1,
            align: 'end',
            behavior: 'smooth',
          });
        }, 40);

        prevMessagesLengthRef.current = messages.length;
        prevLastMessageIdRef.current = lastMessageKey;

        return () => clearTimeout(timer);
      }
    }

    prevMessagesLengthRef.current = messages.length;
    prevLastMessageIdRef.current = lastMessageKey;
  }, [messages, user.id, scrollToBottomToEnd]);

  const otherParticipant = activeRoom?.is_group_chat
    ? null
    : activeRoom?.participants.find(p => p.id !== user.id);

  return (
    <div className="relative flex-1 w-full h-full bg-card/60">
      {initialLoading ? (
        <div className="flex flex-col items-center justify-center h-full space-y-2">
          <div className="flex items-center gap-2 p-2 px-3 rounded bg-well shadow-well">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="font-mono text-xs font-bold text-foreground">
              RX: SYNCHRONIZING PACKETS...
            </span>
          </div>
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
          followOutput={isAtBottom => {
            if (messages.length === 0) return false;
            const lastMessage = messages[messages.length - 1];
            const isOwnMessage = lastMessage?.sender?.id === user.id;
            if (isOwnMessage) {
              return 'auto';
            }
            return isAtBottom ? 'smooth' : false;
          }}
          atBottomThreshold={80}
          atBottomStateChange={atBottom => {
            isAtBottomRef.current = atBottom;
            setShowScrollButton(!atBottom);
          }}
          computeItemKey={(index, message) =>
            message.client_id
              ? `client-${message.client_id}`
              : message.id
              ? `msg-${message.id}`
              : `idx-${index}`
          }
          components={{
            Header: () => (
              <div className="flex items-center justify-center py-3">
                {loadingMore && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded bg-well shadow-well font-mono text-[11px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>RETRIEVING EARLIER PACKETS...</span>
                  </div>
                )}
              </div>
            ),
            Footer: () => <div className="h-4" aria-hidden="true" />,
          }}
          itemContent={(index, message) => {
            const isOwnMessage = message.sender.id === user.id;
            const prevMessage = messages[index - 1];
            const nextMessage = messages[index + 1];

            // Calendar date separator
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

            return (
              <div
                key={message.id || message.client_id || index}
                className="pb-1"
              >
                {/* Date Separator Divider */}
                {showDateDivider && (
                  <div className="flex items-center py-3 px-4 sm:px-8 gap-3">
                    <span className="ticks h-2 flex-1 opacity-50" />
                    <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2 py-0.5 rounded bg-well shadow-well select-none">
                      {formatDateDivider(message.timestamp)}
                    </span>
                    <span className="ticks h-2 flex-1 opacity-50" />
                  </div>
                )}

                <div className="px-1.5 sm:px-3">
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
        /* Empty Channel Hardware Welcome */
        <div className="flex flex-col items-center justify-center h-full px-4 text-center pb-12">
          <div className="max-w-sm w-full mx-auto p-5 sm:p-6 rounded-xl border border-border bg-card shadow-panel text-center">
            {activeRoom?.is_group_chat ? (
              <div className="flex justify-center mb-3">
                <PresetKey name={activeRoom.name} size="xl" />
              </div>
            ) : otherParticipant ? (
              <div className="relative w-14 h-14 mx-auto mb-3">
                <Avatar className="w-full h-full rounded-xl border border-border shadow-md">
                  <AvatarImage
                    src={getAvatarUrl(otherParticipant.avatar)}
                    alt={otherParticipant.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="font-mono text-lg font-bold bg-well">
                    {otherParticipant.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            ) : null}

            <span className="font-mono text-2xs uppercase tracking-widest text-primary font-bold">
              CHANNEL OPEN · NO TRAFFIC YET
            </span>

            <h3 className="text-base font-bold text-foreground mt-1 tracking-tight">
              {activeRoom?.is_group_chat
                ? activeRoom.name
                : otherParticipant?.name}
            </h3>

            <p className="mt-1.5 font-mono text-[11px] text-muted-foreground leading-relaxed">
              FREQUENCY CH·{channelNo(activeRoom?.id)} CONFIGURED. TRANSMIT MESSAGES OR INITIATE VOICE BROADCAST BELOW.
            </p>

            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-well text-muted-foreground font-mono text-[10px]">
                <Send className="w-3 h-3 text-primary" />
                ENTER TO TRANSMIT
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-well text-muted-foreground font-mono text-[10px]">
                <Radio className="w-3 h-3 text-live" />
                VOX READY
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
            className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 z-30"
          >
            <button
              className="size-9 rounded-full key shadow-key flex items-center justify-center text-foreground hover:bg-accent active:translate-y-px transition-all"
              onClick={() => scrollToBottomToEnd('smooth')}
              title="Jump to latest transmission"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="w-4 h-4 text-primary" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
