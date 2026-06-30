import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'glass rounded-2xl overflow-hidden',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
