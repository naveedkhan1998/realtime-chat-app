import { useEffect, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Loader2, Hash, ArrowDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Message, ChatRoom } from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';
import MessageBubble from '../MessageBubble';
import { getAvatarUrl } from '@/lib/utils';
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
  scrollToBottom: () => void;
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
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!initialLoading && messages.length > 0) {
      setTimeout(() => {
        virtuosoRef.current?.scrollTo({
          top: 999999,
          behavior: 'auto',
        });
      }, 100);
    }
  }, [initialLoading]);

  // Auto-scroll when user sends a message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender.id === user.id) {
        setTimeout(() => {
          virtuosoRef.current?.scrollTo({
            top: 999999,
            behavior: 'smooth',
          });
        }, 50);
      }
    }
  }, [messages, user.id]);

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
          ref={virtuosoRef}
          style={{ height: '100%' }}
          data={messages}
          startReached={handleLoadMore}
          initialTopMostItemIndex={messages.length - 1}
          followOutput="smooth"
          atBottomStateChange={atBottom => setShowScrollButton(!atBottom)}
          components={{
            Header: () => (
              <div className="flex items-center justify-center py-4">
                {loadingMore && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-card border border-border text-xs text-muted-foreground shadow-sm">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>Loading older messages...</span>
                  </div>
                )}
              </div>
            ),
            Footer: () => <div className="h-6" />,
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

            return (
              <div key={message.id || message.client_id || index}>
                {/* Date Separator Divider */}
                {showDateDivider && (
                  <div className="flex items-center my-5 px-4 sm:px-8">
                    <div className="flex-1 h-[1px] bg-border/40" />
                    <span className="mx-3 px-3 py-0.5 rounded-full bg-card/90 border border-border/60 text-[10px] sm:text-[11px] font-semibold text-muted-foreground shadow-sm backdrop-blur-md select-none">
                      {formatDateDivider(message.timestamp)}
                    </span>
                    <div className="flex-1 h-[1px] bg-border/40" />
                  </div>
                )}

                <div className="px-2 sm:px-4">
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
        /* Discord / Slack Channel Welcome Hero */
        <div className="flex flex-col items-center justify-center h-full px-4 text-center pb-24">
          <div className="max-w-md mx-auto p-6 sm:p-8 rounded-3xl border border-border/50 bg-card/50 backdrop-blur-xl shadow-lg">
            {activeRoom?.is_group_chat ? (
              <div className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-3xl bg-primary/15 border border-primary/25 text-primary shadow-inner">
                <Hash className="w-8 h-8 sm:w-10 sm:h-10 stroke-[2.5]" />
              </div>
            ) : otherParticipant ? (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4">
                <Avatar className="w-full h-full rounded-3xl border-2 border-border/60 shadow-xl">
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

            <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
              {activeRoom?.is_group_chat
                ? `Welcome to #${activeRoom.name || 'channel'}!`
                : `Start talking with ${otherParticipant?.name || 'your contact'}`}
            </h3>

            <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              {activeRoom?.is_group_chat
                ? `This is the start of the #${activeRoom.name || 'channel'} conversation. Send a message, share files, or start an audio huddle.`
                : 'This is the beginning of your direct message history. Say hello or start a WebRTC voice call.'}
            </p>
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
            className="absolute bottom-6 right-6 z-30"
          >
            <Button
              size="icon"
              className="w-10 h-10 rounded-full shadow-xl bg-card/90 hover:bg-card border border-border/80 text-foreground backdrop-blur-xl active:scale-95 transition-all"
              onClick={() => {
                virtuosoRef.current?.scrollTo({
                  top: 999999,
                  behavior: 'smooth',
                });
              }}
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
