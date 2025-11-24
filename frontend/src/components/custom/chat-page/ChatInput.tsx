import { Paperclip, Send, Smile, X, Image as ImageIcon, FileText } from 'lucide-react';
import { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { Message } from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';
import { useEffect, useRef, useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import imageCompression from 'browser-image-compression';
import { useTheme } from '@/hooks/useTheme';

interface ChatInputProps {
  register: UseFormRegister<{ message: string }>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  watch: UseFormWatch<{ message: string }>;
  setValue: UseFormSetValue<{ message: string }>;
  editingMessage: Message | null;
  typingUsers: UserProfile[];
  onSendMessage: (message: string, file?: File) => void;
}

export default function ChatInput({
  register,
  watch,
  setValue,
  editingMessage,
  typingUsers,
  onSendMessage,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const messageValue = watch('message');
  const { ref: registerRef, ...restRegister } = register('message');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { theme } = useTheme();

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [messageValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    let processedFile = file;

    // Compress image if it is an image
    if (file.type.startsWith('image/')) {
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        // Ensure we keep the original filename and type
        processedFile = new File([compressedFile], file.name, { type: file.type });
      } catch (error) {
        console.error('Error compressing image:', error);
      }
    }

    setSelectedFile(processedFile);
    const url = URL.createObjectURL(processedFile);
    setPreviewUrl(url);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const currentMessage = watch('message') || '';
    setValue('message', currentMessage + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSendMessage(watch('message'), selectedFile || undefined);
    clearFile();
    setShowEmojiPicker(false);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-background via-background/95 to-transparent">
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Typing Indicator */}
        <div className="absolute left-0 flex items-center h-6 gap-2 -top-8">
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/60 backdrop-blur-md border border-border text-[10px] font-medium text-muted-foreground shadow-sm animate-in fade-in slide-in-from-bottom-2">
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

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-full left-0 mb-2 z-50">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
              lazyLoadEmojis={true}
            />
          </div>
        )}

        {/* File Preview */}
        {previewUrl && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-background/80 backdrop-blur-md rounded-lg border border-border shadow-lg">
            <div className="relative">
              {selectedFile?.type.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-20 w-auto rounded-md object-cover"
                />
              ) : (
                <div className="flex items-center gap-2 p-2">
                  <Paperclip className="w-4 h-4" />
                  <span className="text-xs max-w-[150px] truncate">
                    {selectedFile?.name}
                  </span>
                </div>
              )}
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full"
                onClick={clearFile}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 p-2 rounded-[24px] border border-border bg-background/80 backdrop-blur-2xl shadow-2xl transition-all focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/20"
        >
          <input
            type="file"
            ref={imageInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept="image/*,video/*"
          />
          <input
            type="file"
            ref={docInputRef}
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.txt"
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="flex-shrink-0 w-10 h-10 mb-0.5 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="mr-2 h-4 w-4" />
                <span>Image or Video</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => docInputRef.current?.click()}>
                <FileText className="mr-2 h-4 w-4" />
                <span>Document</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <textarea
            {...restRegister}
            ref={(e) => {
              registerRef(e);
              textareaRef.current = e;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 min-h-[44px] max-h-[200px] py-3 px-2 border-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50 resize-none text-base leading-relaxed scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            autoComplete="off"
            rows={1}
          />

          <div className="flex items-center gap-1 pr-1 mb-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "transition-colors rounded-full h-9 w-9 hover:bg-primary/10 text-muted-foreground hover:text-primary",
                showEmojiPicker && "text-primary bg-primary/10"
              )}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-5 h-5" />
            </Button>
            <Button
              type="submit"
              size="icon"
              className={cn(
                'h-10 w-10 rounded-full shadow-md transition-all duration-300',
                watch('message')?.trim() || selectedFile
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 hover:shadow-lg'
                  : 'bg-muted text-muted-foreground'
              )}
              disabled={!watch('message')?.trim() && !selectedFile}
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
