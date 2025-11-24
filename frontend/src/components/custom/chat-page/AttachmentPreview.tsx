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

  const getIcon = () => {
    if (isImage) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (isVideo) return <Film className="w-8 h-8 text-purple-500" />;
    if (isAudio) return <Music className="w-8 h-8 text-green-500" />;
    return <FileText className="w-8 h-8 text-orange-500" />;
  };

  const previewUrl = isImage ? URL.createObjectURL(file) : null;

  return (
    <div className="relative flex items-center max-w-sm gap-3 p-3 border shadow-sm group bg-muted/50 backdrop-blur-md border-border rounded-xl animate-in fade-in slide-in-from-bottom-2">
      <div className="relative flex items-center justify-center flex-shrink-0 w-16 h-16 overflow-hidden border rounded-lg bg-background border-border">
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview"
            className="object-cover w-full h-full"
            onLoad={() => URL.revokeObjectURL(previewUrl)}
          />
        ) : (
          getIcon()
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-foreground">
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(file.size)}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute w-6 h-6 transition-opacity rounded-full shadow-md opacity-100 -top-2 -right-2 bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onClick={onRemove}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}
