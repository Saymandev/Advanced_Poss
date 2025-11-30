import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200',
            'border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400',
            'focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hover:border-gray-400 dark:hover:border-gray-500',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20 dark:border-danger-400',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

