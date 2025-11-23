import { cn } from '@/lib/utils';

export function BackgroundBlobs({ className }: { className?: string }) {
  return (
    <div className={cn('fixed inset-0 -z-10 overflow-hidden', className)}>
      {/* Top Left - Purple/Primary */}
      <div className="blob top-0 -left-4 w-96 h-96 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob dark:bg-primary/60 dark:mix-blend-screen" />

      {/* Top Right - Cyan/Secondary */}
      <div className="blob top-0 -right-4 w-96 h-96 bg-secondary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 dark:bg-secondary/20 dark:mix-blend-screen" />

      {/* Bottom Left - Pink/Accent */}
      <div className="blob -bottom-8 left-20 w-96 h-96 bg-accent/30 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000 dark:bg-accent/20 dark:mix-blend-screen" />

      {/* Center - Subtle Glow */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
    </div>
  );
}
