import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

// Editorial input: no top/side border, single hairline underline that becomes
// a burgundy stroke on focus. Placeholder in Cormorant italic to keep the
// magazine feeling in empty forms.
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full border-0 border-b border-input bg-transparent px-1 py-2 text-base text-foreground',
          'font-body placeholder:font-editorial placeholder:italic placeholder:text-muted-foreground/70',
          'ring-0 focus:outline-none focus:ring-0 focus:border-primary',
          'transition-colors duration-200 ease-editorial',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'disabled:cursor-not-allowed disabled:opacity-50',
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
