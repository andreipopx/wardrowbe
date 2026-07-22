import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Editorial button system: primary (burgundy fill), secondary (text + hover underline),
// tertiary (text-only), plus the shadcn defaults kept for compat. Border-radius is
// zeroed globally via the design token; buttons stay sharp editorial rectangles.
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 ease-editorial focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground border border-primary hover:bg-transparent hover:text-primary',
        destructive: 'bg-destructive text-destructive-foreground border border-destructive hover:bg-transparent hover:text-destructive',
        outline: 'border border-primary/70 text-primary bg-transparent hover:bg-primary hover:text-primary-foreground',
        secondary: 'relative bg-transparent text-foreground px-0 py-0 hover:text-primary after:absolute after:left-0 after:bottom-[-2px] after:h-px after:w-full after:bg-current after:origin-left after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-200 after:ease-editorial',
        ghost: 'text-foreground hover:text-primary bg-transparent',
        link: 'text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary bg-transparent px-0 py-0',
      },
      size: {
        default: 'h-11 px-6 py-2 uppercase tracking-widest text-xs',
        sm: 'h-9 px-4 uppercase tracking-widest text-[11px]',
        lg: 'h-12 px-8 uppercase tracking-widest text-xs',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
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
