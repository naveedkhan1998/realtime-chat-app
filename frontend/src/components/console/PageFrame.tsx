import { cn } from '@/lib/utils';

/**
 * Standard frame for non-chat pages (profile, settings, notifications,
 * new chat). Provides the engraved section code, a wide display title,
 * an optional action slot, and a scrolling body sized for the mobile dock.
 *
 *   <PageFrame code="04" section="Settings" title="Preferences" ...>
 */
export function PageFrame({
  code,
  section,
  title,
  description,
  actions,
  children,
  width = 'default',
  className,
  bodyClassName,
}: {
  code: string;
  section: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: 'narrow' | 'default' | 'wide';
  className?: string;
  bodyClassName?: string;
}) {
  const max =
    width === 'narrow'
      ? 'max-w-2xl'
      : width === 'wide'
        ? 'max-w-6xl'
        : 'max-w-4xl';

  return (
    <div
      className={cn(
        'h-full w-full overflow-y-auto custom-scrollbar',
        className
      )}
    >
      <header className="relative border-b border-border">
        <div
          className={cn(
            'mx-auto w-full px-4 pb-5 pt-5 sm:px-6 md:px-8 md:pb-7 md:pt-8',
            max
          )}
        >
          <div className="flex items-center gap-3">
            <span className="label-engraved text-foreground">
              <span className="text-primary">§{code}</span>
              <span className="mx-1.5 text-muted-foreground/50">/</span>
              {section}
            </span>
            <span className="ticks h-2 flex-1 opacity-60" aria-hidden />
          </div>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="display-wide text-[28px] leading-[1.02] text-foreground sm:text-4xl md:text-[44px]">
                {title}
              </h1>
              {description && (
                <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                  {description}
                </p>
              )}
            </div>
            {actions && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </header>
      <div
        className={cn(
          'mx-auto w-full px-4 py-6 sm:px-6 md:px-8 md:py-8',
          'pb-[calc(var(--dock-h,0px)+2rem+env(safe-area-inset-bottom,0px))] md:pb-10',
          max,
          bodyClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** A labelled module (panel) inside a PageFrame. */
export function Module({
  label,
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  label?: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('panel overflow-hidden', className)}>
      {(label || title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {label && <div className="label-engraved">{label}</div>}
            {title && (
              <h2 className="mt-1 text-[15px] font-bold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}
