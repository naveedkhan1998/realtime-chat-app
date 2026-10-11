import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Console keys. Every button is a physical key: it has a top highlight,
 * a bottom lip, and it travels 1px down when pressed.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        /** Signal-orange primary key */
        default: 'key-signal hover:brightness-105',
        /** Ink key — high-contrast secondary action */
        ink: 'key-ink hover:opacity-90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-key active:translate-y-px active:shadow-key-pressed hover:brightness-105',
        /** Ceramic key — neutral */
        outline: 'key hover:bg-accent',
        secondary: 'key hover:bg-accent',
        ghost:
          'text-muted-foreground hover:bg-accent hover:text-foreground active:translate-y-px transition-colors',
        link: 'text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:decoration-[3px] rounded-none',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-8 px-3.5 text-xs',
        lg: 'h-12 px-7 text-[15px]',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8 [&_svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
