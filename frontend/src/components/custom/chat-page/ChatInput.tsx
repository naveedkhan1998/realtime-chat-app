import React, { useEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Send,
  Smile,
  Image as ImageIcon,
  FileText,
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { Message } from '@/services/chatApi';
import { UserProfile } from '@/services/userApi';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import imageCompression from 'browser-image-compression';
import { useTheme } from '@/hooks/useTheme';
import { AttachmentPreview } from './AttachmentPreview';
import { Kbd, Led } from '@/components/console';

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
  isMobile = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);

  const messageValue = watch('message');
  const { ref: registerRef, ...restRegister } = register('message');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMobileAttachDrawer, setShowMobileAttachDrawer] = useState(false);
  const [showMobileEmojiDrawer, setShowMobileEmojiDrawer] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { theme } = useTheme();

  // Close desktop emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker || isMobile) return;

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
  }, [showEmojiPicker, isMobile]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 36), 160);
    textarea.style.height = `${newHeight}px`;
  }, [messageValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && editingMessage && onCancelEditing) {
      e.preventDefault();
      onCancelEditing();
      return;
    }
    if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const processFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          break;
        }
      }
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = (e?: React.BaseSyntheticEvent) => {
    if (e) e.preventDefault();
    const trimmed = messageValue?.trim() || '';
    if (!trimmed && !selectedFile) return;

    onSendMessage(trimmed, selectedFile || undefined);
    setValue('message', '');
    clearFile();
    setShowEmojiPicker(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const current = messageValue || '';
    setValue('message', current + emojiData.emoji);
    if (isMobile) {
      setShowMobileEmojiDrawer(false);
    }
  };

  const hasContent = Boolean(messageValue?.trim() || selectedFile);

  return (
    <div className="relative px-3 sm:px-4 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:pb-3 pt-1 bg-card">
      {/* Typing Indicator Status Line */}
      <div className="h-4 sm:h-5 px-1 flex items-center justify-between mb-1">
        {typingUsers.length > 0 ? (
          <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-primary font-medium animate-pulse">
            <Led tone="signal" blink />
            <span>
              {typingUsers.map(u => u.name).join(', ')}{' '}
              {typingUsers.length > 1 ? 'ARE TRANSMITTING...' : 'IS TRANSMITTING...'}
            </span>
          </div>
        ) : (
          <div />
        )}
      </div>

      <div className="relative max-w-4xl mx-auto w-full">
        {/* Desktop Emoji Picker */}
        {!isMobile && showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute right-2 bottom-[calc(100%+8px)] z-50 rounded-xl overflow-hidden shadow-lift border border-border bg-popover"
          >
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
              lazyLoadEmojis={true}
              width={320}
              height={360}
            />
          </div>
        )}

        {/* Mobile Emoji Picker Drawer */}
        {isMobile && (
          <Drawer
            open={showMobileEmojiDrawer}
            onOpenChange={setShowMobileEmojiDrawer}
          >
            <DrawerContent className="max-h-[60vh] pb-6">
              <DrawerHeader className="text-left pb-2">
                <DrawerTitle className="label-engraved">SELECT SYMBOL</DrawerTitle>
                <DrawerDescription className="sr-only">
                  Select an emoji symbol
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex justify-center px-2">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                  lazyLoadEmojis={true}
                  width="100%"
                  height={300}
                />
              </div>
            </DrawerContent>
          </Drawer>
        )}

        {/* Hidden Inputs */}
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

        {/* Recessed Transmit Deck (Input Well) */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col w-full rounded-xl bg-well shadow-well border transition-all duration-150 overflow-hidden',
            isDragging
              ? 'border-dashed border-2 border-primary bg-primary/10'
              : 'border-border/60 focus-within:border-primary/60'
          )}
        >
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-30 flex items-center justify-center gap-2 bg-well/90 pointer-events-none">
              <Paperclip className="w-4 h-4 text-primary animate-bounce" />
              <span className="font-mono text-xs font-bold text-primary">
                DROP PACKET TO ATTACH
              </span>
            </div>
          )}

          {/* Editing Mode Banner */}
          {editingMessage && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-primary/15 border-b border-primary/20 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <Led tone="signal" />
                <span className="font-mono text-2xs uppercase tracking-wider font-bold text-primary">
                  EDITING TRANSMISSION:
                </span>
                <span className="font-mono text-xs text-muted-foreground truncate max-w-[280px]">
                  {editingMessage.content}
                </span>
              </div>
              {onCancelEditing && (
                <button
                  type="button"
                  onClick={onCancelEditing}
                  className="font-mono text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Kbd>ESC</Kbd>
                  <span>CANCEL</span>
                </button>
              )}
            </div>
          )}

          {/* Staged File Tray */}
          {selectedFile && (
            <div className="p-2 border-b border-border/40 bg-card/60">
              <AttachmentPreview file={selectedFile} onRemove={clearFile} />
            </div>
          )}

          {/* Controls Bar */}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-1.5 p-1.5 sm:p-2"
          >
            {/* Attachment Key */}
            {isMobile ? (
              <button
                type="button"
                onClick={() => setShowMobileAttachDrawer(true)}
                className="size-9 shrink-0 rounded-lg key flex items-center justify-center p-0 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                aria-label="Add attachment"
              >
                <Paperclip className="size-4 shrink-0" />
              </button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-9 shrink-0 rounded-lg key flex items-center justify-center p-0 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                    aria-label="Add attachment"
                  >
                    <Paperclip className="size-4 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="top"
                  className="w-48 mb-1"
                >
                  <DropdownMenuItem
                    onClick={() => imageInputRef.current?.click()}
                    className="gap-2 font-mono text-xs cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span>PHOTO / VIDEO</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => docInputRef.current?.click()}
                    className="gap-2 font-mono text-xs cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-foreground" />
                    <span>DOCUMENT FILE</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Textarea */}
            <textarea
              {...restRegister}
              ref={e => {
                registerRef(e);
                textareaRef.current = e;
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onFocus={() => {
                if (isMobile) {
                  setTimeout(() => {
                    textareaRef.current?.scrollIntoView({
                      block: 'nearest',
                      inline: 'nearest',
                    });
                  }, 100);
                }
              }}
              placeholder={placeholder || 'Type message payload...'}
              className="flex-1 min-h-[36px] max-h-[160px] py-2 px-2.5 border-0 bg-transparent focus:outline-none placeholder:text-muted-foreground/60 resize-none text-[16px] sm:text-sm leading-normal"
              autoComplete="off"
              rows={1}
            />

            {/* Emoji & Send Keys */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                className={cn(
                  'size-9 shrink-0 rounded-lg key flex items-center justify-center p-0 text-muted-foreground hover:text-foreground transition-all',
                  (showEmojiPicker || showMobileEmojiDrawer) && 'bg-accent text-foreground'
                )}
                onClick={() => {
                  if (isMobile) {
                    setShowMobileEmojiDrawer(true);
                  } else {
                    setShowEmojiPicker(!showEmojiPicker);
                  }
                }}
                aria-label="Insert emoji symbol"
              >
                <Smile className="size-4 shrink-0" />
              </button>

              <button
                type="submit"
                className={cn(
                  'h-9 px-3.5 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all shrink-0 active:translate-y-px',
                  hasContent
                    ? 'key-signal shadow-key'
                    : 'bg-muted text-muted-foreground/40 cursor-not-allowed'
                )}
                disabled={!hasContent}
                aria-label={editingMessage ? 'Save changes' : 'Transmit payload'}
              >
                {editingMessage ? (
                  <Check className="size-3.5" />
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span className="hidden sm:inline-block">TX</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Desktop Helper hints */}
        {!isMobile && (
          <div className="flex items-center justify-between px-2 pt-1 font-mono text-[10px] text-muted-foreground/60 select-none">
            <span>
              <Kbd>Enter ↵</Kbd> transmit <span className="mx-1">·</span> <Kbd>Shift + Enter</Kbd> newline
            </span>
            {selectedFile && (
              <span className="text-primary font-bold">1 PACKET STAGED</span>
            )}
          </div>
        )}

        {/* Mobile Attachment Drawer */}
        <Drawer
          open={showMobileAttachDrawer}
          onOpenChange={setShowMobileAttachDrawer}
        >
          <DrawerContent className="pb-8">
            <DrawerHeader className="text-left pb-2">
              <DrawerTitle className="label-engraved">ATTACH MEDIA PACKET</DrawerTitle>
              <DrawerDescription className="font-mono text-xs text-muted-foreground">
                Select document or image to transmit
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 py-2 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 font-mono text-xs"
                onClick={() => {
                  setShowMobileAttachDrawer(false);
                  setTimeout(() => imageInputRef.current?.click(), 150);
                }}
              >
                <ImageIcon className="w-4 h-4 text-primary" />
                <span>PHOTOS & VIDEOS</span>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 font-mono text-xs"
                onClick={() => {
                  setShowMobileAttachDrawer(false);
                  setTimeout(() => docInputRef.current?.click(), 150);
                }}
              >
                <FileText className="w-4 h-4" />
                <span>DOCUMENTS & FILES</span>
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
