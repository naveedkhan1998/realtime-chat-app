import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/* ==========================================================================
   Console kit — small hardware-inspired building blocks shared by the
   app shell and every page. Keep these dumb and presentational.
   ========================================================================== */

export type LedTone = 'off' | 'signal' | 'live' | 'danger';

export function Led({
  tone = 'off',
  blink = false,
  breathe = false,
  className,
}: {
  tone?: LedTone;
  blink?: boolean;
  breathe?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'led',
        tone === 'signal' && 'led-signal',
        tone === 'live' && 'led-live',
        tone === 'danger' && 'led-danger',
        blink && 'animate-led-blink',
        breathe && 'animate-led-breathe',
        className
      )}
    />
  );
}

/** Recessed LCD screen. Children render in mono amber text. */
export function Lcd({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn('lcd', className)}>{children}</div>;
}

/** Ticking clock — updates every second, renders HH:MM with blinking colon. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function LcdClock({ className }: { className?: string }) {
  const now = useNow();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const blink = now.getSeconds() % 2 === 0;
  return (
    <span className={cn('lcd-dot tabular leading-none', className)}>
      {hh}
      <span className={cn(blink ? 'opacity-100' : 'opacity-20')}>:</span>
      {mm}
    </span>
  );
}

/** Silkscreened label, optionally with a count and a trailing hairline rule. */
export function SectionLabel({
  children,
  count,
  rule = true,
  tone,
  className,
  action,
}: {
  children: React.ReactNode;
  count?: number;
  rule?: boolean;
  tone?: 'live' | 'signal';
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span
        className={cn(
          'label-engraved whitespace-nowrap',
          tone === 'live' && 'text-live',
          tone === 'signal' && 'text-primary'
        )}
      >
        {children}
      </span>
      {typeof count === 'number' && (
        <span className="font-mono text-2xs tabular text-muted-foreground/70">
          {String(count).padStart(2, '0')}
        </span>
      )}
      {rule && <span className="h-px flex-1 bg-border" />}
      {action}
    </div>
  );
}

/** Two-digit channel number, e.g. 7 → "07". */
export function channelNo(id: number | undefined | null) {
  if (id === undefined || id === null) return '--';
  return String(id).padStart(2, '0');
}

/** Initials for group "preset" keys: "Design Team" → "DT", "general" → "GE". */
export function presetInitials(name?: string | null) {
  if (!name) return '··';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** Square preset key used for group channels instead of a generic hash icon. */
export function PresetKey({
  name,
  active = false,
  live = false,
  size = 'md',
  className,
}: {
  name?: string | null;
  active?: boolean;
  live?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center font-mono font-bold tracking-tight',
        size === 'sm' && 'size-7 rounded-[8px] text-[10px]',
        size === 'md' && 'size-9 rounded-[10px] text-[11px]',
        size === 'lg' && 'size-11 rounded-[12px] text-xs',
        size === 'xl' && 'size-16 rounded-[18px] text-base',
        active
          ? 'key-signal'
          : live
            ? 'bg-live text-live-foreground shadow-key'
            : 'key',
        className
      )}
    >
      {presetInitials(name)}
    </span>
  );
}

/** Keyboard hint chip. */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] bg-card px-1 font-mono text-[10px] font-semibold text-muted-foreground shadow-key',
        className
      )}
    >
      {children}
    </kbd>
  );
}

/** Animated level meter (decorative or bound to a 0..1 value). */
export function LevelMeter({
  level,
  bars = 5,
  active = true,
  className,
}: {
  level?: number;
  bars?: number;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn('inline-flex h-3 items-end gap-[2px]', className)}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const lit =
          typeof level === 'number' ? level * bars > i : active && i < bars;
        return (
          <span
            key={i}
            className={cn(
              'w-[3px] rounded-[1px]',
              lit ? 'bg-live' : 'bg-muted-foreground/25',
              typeof level !== 'number' &&
                active &&
                (i % 3 === 0
                  ? 'animate-wave-1'
                  : i % 3 === 1
                    ? 'animate-wave-2'
                    : 'animate-wave-3')
            )}
            style={
              typeof level === 'number'
                ? { height: `${30 + (i / bars) * 70}%` }
                : undefined
            }
          />
        );
      })}
    </span>
  );
}
