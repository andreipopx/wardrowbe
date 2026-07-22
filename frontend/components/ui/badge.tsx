import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Editorial chip: hairline border, uppercase small tracking, minimal fill.
// Hover on outline chip fills with primary (used for tag pills).
const badgeVariants = cva(
  'inline-flex items-center px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] transition-colors focus:outline-none focus:ring-1 focus:ring-ring',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-transparent text-primary border border-primary',
        outline: 'text-foreground border border-border-solid/60 hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-default',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
