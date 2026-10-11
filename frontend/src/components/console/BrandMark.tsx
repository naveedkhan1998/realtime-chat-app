import { cn } from '@/lib/utils';

/**
 * MNK brand mark — a rotary tuning knob with a signal-orange indicator.
 * `wordmark` adds the "MNK/CHAT" logotype and the device model number.
 */
export function BrandMark({
  size = 40,
  wordmark = false,
  spin = false,
  className,
}: {
  size?: number;
  wordmark?: boolean;
  spin?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className="relative inline-flex shrink-0 items-center justify-center rounded-full key"
        style={{ width: size, height: size }}
      >
        {/* Tick ring */}
        <svg
          viewBox="0 0 40 40"
          className="absolute inset-0 h-full w-full text-foreground/35"
          aria-hidden
        >
          {Array.from({ length: 24 }).map((_, i) => {
            const a = (i / 24) * Math.PI * 2;
            const r1 = 17.5;
            const r2 = i % 6 === 0 ? 14.5 : 16;
            return (
              <line
                key={i}
                x1={20 + Math.cos(a) * r1}
                y1={20 + Math.sin(a) * r1}
                x2={20 + Math.cos(a) * r2}
                y2={20 + Math.sin(a) * r2}
                stroke="currentColor"
                strokeWidth={i % 6 === 0 ? 1.4 : 0.8}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
        {/* Knob cap */}
        <span
          className={cn(
            'absolute rounded-full bg-foreground transition-transform duration-500 ease-out group-hover:rotate-[60deg]',
            spin && 'animate-needle-sweep'
          )}
          style={{ inset: size * 0.24 }}
        >
          <span
            className="absolute left-1/2 top-[12%] h-[38%] w-[2.5px] -translate-x-1/2 rounded-full bg-primary"
            style={{ boxShadow: '0 0 6px hsl(var(--primary) / 0.8)' }}
          />
        </span>
      </span>
      {wordmark && (
        <span className="flex flex-col leading-none">
          <span className="display-wide text-[15px] tracking-[-0.03em] text-foreground">
            MNK<span className="text-primary">/</span>CHAT
          </span>
          <span className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Model RT-2 · Realtime
          </span>
        </span>
      )}
    </span>
  );
}
