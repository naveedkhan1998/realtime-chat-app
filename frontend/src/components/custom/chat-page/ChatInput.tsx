import { Paperclip, Send, Smile } from 'lucide-react';
import { UseFormRegister, UseFormWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Message } from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';

interface ChatInputProps {
  register: UseFormRegister<{ message: string }>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  watch: UseFormWatch<{ message: string }>;
  editingMessage: Message | null;
  typingUsers: UserProfile[];
}

export default function ChatInput({
  register,
  onSubmit,
  watch,
  editingMessage,
  typingUsers,
}: ChatInputProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Typing Indicator */}
        <div className="absolute left-0 flex items-center h-6 gap-2 -top-8">
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-md border border-white/5 text-[10px] font-medium text-muted-foreground shadow-sm animate-in fade-in slide-in-from-bottom-2">
              <div className="flex gap-0.5">
                <span
                  className="w-1 h-1 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-1 h-1 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-1 h-1 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : 'Several people are typing...'}
            </div>
          )}
        </div>

        <form
          onSubmit={onSubmit}
          className="relative flex items-end gap-2 p-2 rounded-[28px] border border-white/10 bg-background/80 backdrop-blur-2xl shadow-2xl transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/20"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0 w-10 h-10 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary"
          >
            <Paperclip className="w-5 h-5" />
          </Button>

          <Input
            {...register('message')}
            placeholder="Type a message..."
            className="flex-1 min-h-[44px] max-h-[120px] py-3 px-2 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50 resize-none text-base"
            autoComplete="off"
          />

          <div className="flex items-center gap-1 pr-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9 hover:bg-primary/10 text-muted-foreground hover:text-primary"
            >
              <Smile className="w-5 h-5" />
            </Button>
            <Button
              type="submit"
              size="icon"
              className={cn(
                'h-10 w-10 rounded-full shadow-md transition-all duration-300',
                watch('message')?.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 hover:shadow-lg'
                  : 'bg-muted text-muted-foreground'
              )}
              disabled={!watch('message')?.trim()}
            >
              {editingMessage ? (
                <div className="text-[10px] font-bold uppercase">Save</div>
              ) : (
                <Send className="h-5 w-5 ml-0.5" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
