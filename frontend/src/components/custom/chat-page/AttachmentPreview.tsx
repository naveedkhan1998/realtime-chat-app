import { useState, useEffect } from 'react';
import { X, FileText, Image as ImageIcon, Film, Music } from 'lucide-react';
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
    if (isImage) return <ImageIcon className="w-5 h-5 text-primary" />;
    if (isVideo) return <Film className="w-5 h-5 text-foreground" />;
    if (isAudio) return <Music className="w-5 h-5 text-live" />;
    return <FileText className="w-5 h-5 text-foreground" />;
  };

  return (
    <div className="relative inline-flex items-center max-w-sm gap-2.5 p-2 border border-border shadow-panel bg-card rounded-lg animate-in fade-in zoom-in-95 duration-150">
      <div className="relative flex items-center justify-center flex-shrink-0 w-11 h-11 overflow-hidden rounded bg-well shadow-well">
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

      <div className="flex-1 min-w-0 pr-6">
        <p className="font-mono text-xs font-semibold truncate text-foreground">
          {file.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 font-mono text-[10px] text-muted-foreground">
          <span>{formatBytes(file.size)}</span>
          <span>·</span>
          <span className="uppercase text-primary font-bold">
            {file.type.split('/')[1] || 'FILE'}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="absolute top-1.5 right-1.5 size-5 rounded-full key flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={onRemove}
        aria-label="Remove staged attachment"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
