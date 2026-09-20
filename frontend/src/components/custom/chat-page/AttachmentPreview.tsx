import { useState, useEffect } from 'react';
import { X, FileText, Image as ImageIcon, Film, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBytes } from '@/lib/utils';

interface AttachmentPreviewProps {
  file: File;
  onRemove: () => void;
}

export function AttachmentPreview({ file, onRemove }: AttachmentPreviewProps) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  const isAudio = file.type.startsWith('audio/');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, isImage]);

  const getIcon = () => {
    if (isImage) return <ImageIcon className="w-6 h-6 text-primary" />;
    if (isVideo) return <Film className="w-6 h-6 text-purple-500" />;
    if (isAudio) return <Music className="w-6 h-6 text-emerald-500" />;
    return <FileText className="w-6 h-6 text-amber-500" />;
  };

  return (
    <div className="relative inline-flex items-center max-w-sm gap-3 p-2 sm:p-2.5 border shadow-md group bg-card/95 dark:bg-card/90 backdrop-blur-xl border-border/80 rounded-2xl animate-in fade-in zoom-in-95 duration-150">
      <div className="relative flex items-center justify-center flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 overflow-hidden border rounded-xl bg-muted/50 border-border/60">
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="object-cover w-full h-full"
          />
        ) : (
          getIcon()
        )}
      </div>

      <div className="flex-1 min-w-0 pr-7">
        <p className="text-xs sm:text-sm font-semibold truncate text-foreground">
          {file.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">
            {formatBytes(file.size)}
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
          <span className="text-[10px] sm:text-[11px] text-primary font-medium capitalize">
            {file.type.split('/')[0] || 'file'}
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute w-6 h-6 rounded-full shadow-xs top-1.5 right-1.5 bg-background/80 hover:bg-destructive hover:text-destructive-foreground text-muted-foreground transition-colors"
        onClick={onRemove}
        aria-label="Remove attachment"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
