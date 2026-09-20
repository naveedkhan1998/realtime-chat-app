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
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 160);
    textarea.style.height = `${newHeight}px`;
  }, [messageValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && editingMessage && onCancelEditing) {
      e.preventDefault();
      onCancelEditing();
      return;
    }
    // Desktop: Enter sends, Shift+Enter new line. Mobile: user taps Send button.
    if (!isMobile && e.key === 'Enter' && !e.shiftKey) {
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
    setShowMobileAttachDrawer(false);
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processFile(file);
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
    setShowMobileEmojiDrawer(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = watch('message');
    if (!content?.trim() && !selectedFile) return;

    onSendMessage(content, selectedFile || undefined);
    clearFile();
    setShowEmojiPicker(false);
    setShowMobileEmojiDrawer(false);

    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }
  };

  const hasContent = Boolean(watch('message')?.trim() || selectedFile);

  return (
    <div className="relative z-20 flex-shrink-0 w-full px-2.5 sm:px-6 py-2 sm:py-3 border-t border-border/40 bg-background/80 dark:bg-background/90 backdrop-blur-xl pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-3.5 transition-all">
      <div className="relative w-full max-w-4xl mx-auto">
        {/* Animated Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="absolute -top-7 left-2 flex items-center gap-2 px-3 py-1 rounded-full bg-card/95 backdrop-blur-md border border-border/80 text-[11px] font-medium text-muted-foreground shadow-sm animate-in fade-in slide-in-from-bottom-2 z-10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-foreground/90 font-medium truncate max-w-[240px]">
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : `${typingUsers.map(u => u.name).slice(0, 2).join(', ')} and others are typing...`}
            </span>
          </div>
        )}

        {/* Desktop Emoji Picker Popover */}
        {!isMobile && showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="absolute right-4 bottom-[calc(100%+10px)] z-50 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-border/80 bg-popover"
          >
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
              lazyLoadEmojis={true}
              width={340}
              height={380}
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
                <DrawerTitle className="text-sm font-bold">Pick an Emoji</DrawerTitle>
                <DrawerDescription className="sr-only">
                  Select an emoji to insert into your message
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex justify-center px-2">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                  lazyLoadEmojis={true}
                  width="100%"
                  height={320}
                />
              </div>
            </DrawerContent>
          </Drawer>
        )}

        {/* Hidden File Inputs */}
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

        {/* Elevated Floating Input Island */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col w-full rounded-2xl sm:rounded-3xl border transition-all duration-200 overflow-hidden',
            'bg-card/90 dark:bg-card/95 shadow-md hover:shadow-lg backdrop-blur-2xl',
            isDragging
              ? 'border-dashed border-2 border-primary bg-primary/5 ring-4 ring-primary/10'
              : 'border-border/80 dark:border-border/70 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20'
          )}
        >
          {/* Drag Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-30 flex items-center justify-center gap-2 bg-card/90 backdrop-blur-sm pointer-events-none">
              <Paperclip className="w-5 h-5 text-primary animate-bounce" />
              <span className="text-sm font-semibold text-primary">Drop file here to upload</span>
            </div>
          )}

          {/* Editing Message Banner */}
          {editingMessage && (
            <div className="flex items-center justify-between px-3.5 sm:px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Pencil className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-primary mr-1.5">Editing message</span>
                  <span className="text-muted-foreground truncate inline-block max-w-[150px] sm:max-w-[420px] align-bottom">
                    {editingMessage.content}
                  </span>
                </div>
              </div>
              {onCancelEditing && (
                <button
                  type="button"
                  onClick={onCancelEditing}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted/80 transition-colors shrink-0"
                >
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-background/80 text-[10px] font-mono border border-border/80">
                    ESC
                  </span>
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          )}

          {/* Staged File Preview Tray */}
          {selectedFile && (
            <div className="p-2 sm:p-2.5 border-b border-border/40 bg-muted/20">
              <AttachmentPreview file={selectedFile} onRemove={clearFile} />
            </div>
          )}

          {/* Main Input Controls Row */}
          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-1 sm:gap-2 p-1.5 sm:p-2.5"
          >
            {/* Attachment Button */}
            {isMobile ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileAttachDrawer(true)}
                className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors active:scale-95"
                aria-label="Add attachment"
              >
                <Paperclip className="w-4.5 h-4.5" />
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors active:scale-95"
                    aria-label="Add attachment"
                  >
                    <Paperclip className="w-4.5 h-4.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  side="top"
                  className="w-52 mb-1.5 rounded-2xl p-1.5 shadow-xl border-border/80"
                >
                  <DropdownMenuItem
                    onClick={() => imageInputRef.current?.click()}
                    className="gap-2.5 p-2.5 rounded-xl cursor-pointer text-xs font-medium"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Photos & Videos</p>
                      <p className="text-[10px] text-muted-foreground">Images or video clips</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => docInputRef.current?.click()}
                    className="gap-2.5 p-2.5 rounded-xl cursor-pointer text-xs font-medium"
                  >
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Documents & Files</p>
                      <p className="text-[10px] text-muted-foreground">PDF, Word, or plain text</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Multiline Auto-resizing Textarea */}
            <textarea
              {...restRegister}
              ref={e => {
                registerRef(e);
                textareaRef.current = e;
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={placeholder || 'Type a message...'}
              className="flex-1 min-h-[38px] sm:min-h-[40px] max-h-[160px] py-2 px-1.5 sm:px-3 border-0 bg-transparent focus:ring-0 focus:outline-none placeholder:text-muted-foreground/60 resize-none text-[16px] sm:text-sm leading-relaxed scrollbar-thin"
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
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl transition-colors text-muted-foreground hover:text-primary hover:bg-primary/10 active:scale-95',
                  (showEmojiPicker || showMobileEmojiDrawer) && 'text-primary bg-primary/10'
                )}
                onClick={() => {
                  if (isMobile) {
                    setShowMobileEmojiDrawer(true);
                  } else {
                    setShowEmojiPicker(!showEmojiPicker);
                  }
                }}
                aria-label="Insert emoji"
              >
                <Smile className="w-5 h-5" />
              </Button>

              <Button
                type="submit"
                size="icon"
                className={cn(
                  'h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl transition-all duration-200 flex-shrink-0 active:scale-90',
                  hasContent
                    ? 'bg-gradient-to-tr from-primary to-indigo-600 text-white shadow-md shadow-primary/30 hover:opacity-95'
                    : 'bg-muted/50 text-muted-foreground/35 cursor-not-allowed'
                )}
                disabled={!hasContent}
                aria-label={editingMessage ? 'Save changes' : 'Send message'}
              >
                {editingMessage ? (
                  <Check className="w-4.5 h-4.5 stroke-[2.5]" />
                ) : (
                  <Send className="w-4.5 h-4.5 ml-0.5" />
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Desktop Helper Shortcuts */}
        {!isMobile && (
          <div className="flex items-center justify-between px-3 pt-1.5 text-[10px] text-muted-foreground/60 select-none">
            <span>
              <kbd className="font-mono bg-muted/60 px-1 py-0.5 rounded text-[9px] border border-border/40">Enter ↵</kbd> to send
              <span className="mx-1.5">•</span>
              <kbd className="font-mono bg-muted/60 px-1 py-0.5 rounded text-[9px] border border-border/40">Shift + Enter</kbd> for new line
            </span>
            {selectedFile && (
              <span className="text-primary font-medium">1 file attached</span>
            )}
          </div>
        )}

        {/* Mobile Attachment Action Drawer */}
        <Drawer
          open={showMobileAttachDrawer}
          onOpenChange={setShowMobileAttachDrawer}
        >
          <DrawerContent className="pb-8">
            <DrawerHeader className="text-left pb-2">
              <DrawerTitle className="text-sm font-bold">Add Attachment</DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                Share photos, videos or documents with your conversation
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 py-2 space-y-2.5">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14 rounded-2xl text-sm font-medium border-border/80 hover:bg-muted/60"
                onClick={() => {
                  setShowMobileAttachDrawer(false);
                  setTimeout(() => imageInputRef.current?.click(), 150);
                }}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Photos & Videos</p>
                  <p className="text-[11px] text-muted-foreground">JPG, PNG, GIF, MP4, WebM</p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14 rounded-2xl text-sm font-medium border-border/80 hover:bg-muted/60"
                onClick={() => {
                  setShowMobileAttachDrawer(false);
                  setTimeout(() => docInputRef.current?.click(), 150);
                }}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">Documents & Files</p>
                  <p className="text-[11px] text-muted-foreground">PDF, Word, Excel, plain text</p>
                </div>
              </Button>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
