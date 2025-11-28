import { useState, useRef } from 'react';
import {
  FileText,
  Download,
  Maximize2,
  Music,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MessageAttachmentProps {
  url: string;
  type?: 'image' | 'video' | 'audio' | 'file';
  name?: string; // Filename if available
  size?: string; // Formatted size if available
  compact?: boolean; // Compact mode for grid display
}

function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 4));
  const handleZoomOut = () => {
    setScale(s => {
      const newScale = Math.max(s - 0.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  };
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && scale > 1 && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };

  return (
    <div
      className="relative flex items-center justify-center w-full h-full overflow-hidden bg-black/95 backdrop-blur-sm"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      {/* Controls */}
      <div className="absolute z-50 flex items-center gap-2 p-2 -translate-x-1/2 border rounded-full shadow-xl top-4 left-1/2 bg-black/50 backdrop-blur-md border-white/10">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          className="w-8 h-8 text-white rounded-full hover:bg-white/20"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="w-12 text-xs font-medium text-center text-white select-none">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          className="w-8 h-8 text-white rounded-full hover:bg-white/20"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <div className="w-px h-4 mx-1 bg-white/20" />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="w-8 h-8 text-white rounded-full hover:bg-white/20"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="absolute z-50 text-white transition-colors rounded-full top-4 right-4 bg-black/50 hover:bg-red-500/80"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </Button>

      <div
        ref={containerRef}
        className={cn(
          'transition-transform duration-200 ease-out will-change-transform',
          isDragging
            ? 'cursor-grabbing'
            : scale > 1
              ? 'cursor-grab'
              : 'cursor-default'
        )}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onWheel={handleWheel}
      >
        <img
          src={src}
          alt="Full preview"
          className="max-w-[95vw] max-h-[95vh] object-contain select-none pointer-events-none"
          draggable={false}
        />
      </div>
    </div>
  );
}

export function MessageAttachment({
  url,
  type,
  name,
  size,
  compact = false,
}: MessageAttachmentProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Infer type if not provided
  const attachmentType =
    type ||
    (url.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)
      ? 'image'
      : url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)
        ? 'video'
        : url.match(/\.(mp3|wav)(\?.*)?$/i)
          ? 'audio'
          : 'file');

  const fileName = name || url.split('/').pop() || 'Attachment';

  if (attachmentType === 'image') {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div className={cn(
            "relative overflow-hidden border rounded-lg cursor-pointer group border-border/50 bg-background/50",
            compact && "w-full h-full"
          )}>
            <img
              src={url}
              alt="Attachment"
              className={cn(
                "object-cover transition-transform duration-300 group-hover:scale-105",
                compact ? "w-full h-full" : "max-w-full max-h-[300px]"
              )}
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center transition-colors opacity-0 bg-black/0 group-hover:bg-black/10 group-hover:opacity-100">
              <Maximize2 className="w-8 h-8 text-white drop-shadow-md" />
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-none w-screen h-[100dvh] p-0 bg-transparent border-none shadow-none [&>button]:hidden top-0 left-0 translate-x-0 translate-y-0">
          <DialogTitle className="hidden">Image Preview</DialogTitle>
          <ImageViewer src={url} onClose={() => setIsOpen(false)} />
        </DialogContent>
      </Dialog>
    );
  }

  if (attachmentType === 'video') {
    return (
      <div className="max-w-sm overflow-hidden border rounded-lg border-border bg-black/5">
        <video
          src={url}
          controls
          className="w-full max-h-[300px]"
          preload="metadata"
        />
      </div>
    );
  }

  if (attachmentType === 'audio') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/50 min-w-[250px]">
        <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-full bg-primary/10">
          <Music className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <audio src={url} controls className="w-full h-8" />
        </div>
      </div>
    );
  }

  // Default file attachment
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "grid items-center gap-2 p-2.5 transition-colors border rounded-xl border-border bg-background/50 hover:bg-background/80 group",
        compact ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_1fr_auto] max-w-sm"
      )}
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-500/10">
        <FileText className="w-4 h-4 text-orange-600" />
      </div>
      <div className="overflow-hidden">
        <p className="text-sm font-medium transition-colors truncate text-foreground group-hover:text-primary">
          {fileName}
        </p>
        {size && <p className="text-xs text-muted-foreground">{size}</p>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="w-7 h-7 text-muted-foreground group-hover:text-primary"
      >
        <Download className="w-3.5 h-3.5" />
      </Button>
    </a>
  );
}
