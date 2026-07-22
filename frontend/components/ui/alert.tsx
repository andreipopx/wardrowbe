import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// Editorial alert: warm cream card with a burgundy hairline on the left,
// Playfair title. Reads like a magazine sidebar, not a system error.
const alertVariants = cva(
  'relative w-full p-5 sm:p-6 bg-card [&>svg~*]:pl-8 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-5',
  {
    variants: {
      variant: {
        default:
          'border-l-2 border-l-primary/60 border-y-0 border-r-0 [&>svg]:text-primary',
        destructive:
          'border-l-2 border-l-primary border-y-0 border-r-0 [&>svg]:text-primary text-foreground',
        gold:
          'border-l-2 border-l-gold border-y-0 border-r-0 [&>svg]:text-gold text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn('font-display text-lg font-normal leading-tight mb-1.5', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm text-muted-foreground [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
