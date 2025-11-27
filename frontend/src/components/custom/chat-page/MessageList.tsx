import { useEffect, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Loader2, Smile, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message, ChatRoom } from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';
import MessageBubble from '../MessageBubble';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

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
  scrollToBottom,
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!initialLoading && messages.length > 0) {
      // Small delay to ensure rendering is done
      setTimeout(() => {
        virtuosoRef.current?.scrollTo({
          top: 999999,
          behavior: 'auto',
        });
      }, 100);
    }
  }, [initialLoading]); // Only run when loading state changes

  // Auto-scroll when user sends a message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      // If I sent the last message, force scroll to bottom
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

  return (
    <div className="relative flex-1 w-full h-full">
      {initialLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
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
              <div className="flex items-center justify-center h-24">
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            ),
            Footer: () => <div className="h-32" />, // Spacer for input
          }}
          itemContent={(index, message) => {
            const isOwnMessage = message.sender.id === user.id;
            const prevMessage = messages[index - 1];
            const nextMessage = messages[index + 1];

            const isConsecutive =
              prevMessage && prevMessage.sender.id === message.sender.id;
            const isLastInSequence =
              !nextMessage || nextMessage.sender.id !== message.sender.id;

            const senderProfile =
              activeRoom?.participants.find(p => p.id === message.sender.id) ||
              (message.sender.id === user.id ? user : message.sender);

            return (
              <div className={cn('px-4', isConsecutive ? 'mt-0.5' : 'mt-4')}>
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
            );
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full pb-32 text-center opacity-60">
          <div className="flex items-center justify-center w-24 h-24 mb-6 shadow-inner rounded-3xl bg-gradient-to-br from-primary/20 to-violet-500/20">
            <Smile className="w-12 h-12 text-primary" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-foreground">
            No messages yet
          </h3>
          <p className="max-w-xs mx-auto text-sm text-muted-foreground">
            Be the first to break the ice! Start the conversation by typing a
            message below.
          </p>
        </div>
      )}

      {/* Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-24 right-8 z-30"
          >
            <Button
              size="icon"
              className="w-10 h-10 rounded-full shadow-lg bg-background/80 backdrop-blur-md border border-border text-primary hover:bg-background"
              onClick={() => {
                virtuosoRef.current?.scrollTo({
                  top: 999999,
                  behavior: 'smooth',
                });
                scrollToBottom();
              }}
            >
              <ChevronDown className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
