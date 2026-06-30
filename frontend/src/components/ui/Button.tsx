import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'custom-btn',
      secondary: 'custom-btn opacity-80',
      danger: 'custom-btn danger-btn',
    };

    const sizes = {
      sm: 'text-sm h-10',
      md: 'text-base h-12',
      lg: 'text-lg font-medium h-14',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
        <span className="flex items-center justify-center relative z-10 w-full h-full">
          {isLoading && <Spinner className="mr-2 h-4 w-4" />}
          {children}
        </span>
      </button>
    );
  }
);
Button.displayName = 'Button';
