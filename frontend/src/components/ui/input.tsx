import * as React from 'react';

import { cn } from '@/lib/utils';

/** Inputs are recessed "wells" machined into the panel. */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-lg bg-well px-3.5 py-2 text-base text-foreground shadow-well transition-shadow file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:shadow-[inset_0_1px_3px_hsl(0_0%_0%/0.15),inset_0_0_0_1.5px_hsl(var(--ring))] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
