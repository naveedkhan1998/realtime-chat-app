import React, { useEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Send,
  Smile,
  Image as ImageIcon,
  FileText,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import {
  UseFormRegister,
  UseFormWatch,
  UseFormSetValue,
} from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Message } from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import imageCompression from 'browser-image-compression';
import { useTheme } from '@/hooks/useTheme';
import { AttachmentPreview } from './AttachmentPreview';

interface ChatInputProps {
  register: UseFormRegister<{ message: string }>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  watch: UseFormWatch<{ message: string }>;
  setValue: UseFormSetValue<{ message: string }>;
  editingMessage: Message | null;
  typingUsers: UserProfile[];
  onSendMessage: (message: string, file?: File) => void;
  onCancelEditing?: () => void;
  placeholder?: string;
  isMobile?: boolean;
}

export default function ChatInput({
  register,
  watch,
  setValue,
  editingMessage,
  typingUsers,
  onSendMessage,
  onCancelEditing,
  placeholder,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  const messageValue = watch('message');
  const { ref: registerRef, ...restRegister } = register('message');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { theme } = useTheme();

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    return () =>
      document.removeEventListener('pointerdown', handleClickOutside);
  }, [showEmojiPicker]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [messageValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && editingMessage && onCancelEditing) {
      e.preventDefault();
      onCancelEditing();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const processFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    let processedFile = file;

    if (file.type.startsWith('image/')) {
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        processedFile = new File([compressedFile], file.name, {
          type: file.type,
        });
      } catch (error) {
        console.error('Error compressing image:', error);
      }
    }

    setSelectedFile(processedFile);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await processFile(file);
          return;
        }
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
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
    const content = watch('message');
    if (!content?.trim() && !selectedFile) return;

    onSendMessage(content, selectedFile || undefined);
    clearFile();
    setShowEmojiPicker(false);
  };

  const hasContent = Boolean(watch('message')?.trim() || selectedFile);

  return (
    <div className="relative z-20 flex-shrink-0 w-full px-2.5 py-2 sm:px-4 sm:py-3 bg-background/85 backdrop-blur-xl border-t border-border/50 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] sm:pb-3.5">
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="absolute -top-7 left-2 flex items-center gap-1.5 px-2.5 py-0.8 rounded-full bg-card/90 backdrop-blur-md border border-border/60 text-[11px] font-medium text-muted-foreground shadow-sm animate-in fade-in slide-in-from-bottom-1 z-10">
            <div className="flex gap-0.5 items-center">
              <span
                className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1 h-1 rounded-full bg-emerald-500 animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : 'Several people are typing...'}
            </span>
          </div>
        )}

        {/* Emoji Picker Popover */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute left-0 sm:left-2 bottom-[calc(100%+8px)] z-50 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
              lazyLoadEmojis={true}
              width={
                window.innerWidth < 640
                  ? Math.min(window.innerWidth - 32, 340)
                  : 360
              }
              height={380}
            />
          </div>
        )}

        {/* File Preview */}
        {selectedFile && (
          <div className="mb-2">
            <AttachmentPreview file={selectedFile} onRemove={clearFile} />
          </div>
        )}

        {/* Editing Message Banner */}
        {editingMessage && (
          <div className="flex items-center justify-between px-3 py-1.5 mb-2 rounded-xl bg-primary/10 border border-primary/20 text-xs animate-in fade-in slide-in-from-bottom-1">
            <div className="flex items-center gap-2 min-w-0">
              <Pencil className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <span className="font-semibold text-primary">
                  Editing message:
                </span>{' '}
                <span className="text-muted-foreground truncate inline-block max-w-[180px] sm:max-w-[400px] align-bottom">
                  {editingMessage.content}
                </span>
              </div>
            </div>
            {onCancelEditing && (
              <button
                type="button"
                onClick={onCancelEditing}
                className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground ml-2 px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
              >
                <X className="w-3 h-3" />
                <span className="hidden sm:inline">Cancel (Esc)</span>
              </button>
            )}
          </div>
        )}

        {/* Main Chat Input Form */}
        <form
          onSubmit={handleSubmit}
          className={cn(
            'relative flex items-end gap-1 sm:gap-2 p-1.5 sm:p-2 rounded-2xl sm:rounded-3xl border transition-all duration-200',
            'bg-card/90 dark:bg-card/95 backdrop-blur-2xl shadow-md',
            'border-border/80 dark:border-white/10',
            'focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary/40'
          )}
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

          {/* Attachment Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              >
                <Paperclip className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-48 mb-1">
              <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                <ImageIcon className="w-4 h-4 mr-2 text-primary" />
                <span>Photo or Video</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => docInputRef.current?.click()}>
                <FileText className="w-4 h-4 mr-2 text-primary" />
                <span>Document</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Textarea */}
          <textarea
            {...restRegister}
            ref={e => {
              registerRef(e);
              textareaRef.current = e;
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              placeholder ||
              'Type a message... (Enter to send, Shift+Enter for newline)'
            }
            className="flex-1 min-h-[38px] sm:min-h-[40px] max-h-[160px] py-2 px-1.5 sm:px-2 border-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50 resize-none text-[16px] sm:text-sm leading-relaxed scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            autoComplete="off"
            rows={1}
          />

          {/* Action Buttons: Emoji & Submit */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 pb-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                'rounded-xl h-8 w-8 sm:h-9 sm:w-9 transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10',
                showEmojiPicker && 'text-primary bg-primary/10'
              )}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>

            <Button
              type="submit"
              size="icon"
              className={cn(
                'h-8 w-8 sm:h-9 sm:w-9 rounded-xl transition-all duration-200 flex-shrink-0',
                hasContent
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/25 hover:scale-105 active:scale-95'
                  : 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed'
              )}
              disabled={!hasContent}
            >
              {editingMessage ? (
                <Check className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
