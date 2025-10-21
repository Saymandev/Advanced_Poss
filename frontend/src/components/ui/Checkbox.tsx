import { cn } from '@/lib/utils';
import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string | React.ReactNode;
  description?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, indeterminate, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    React.useEffect(() => {
      if (inputRef.current) {
        inputRef.current.indeterminate = !!indeterminate;
      }
    }, [indeterminate]);

    return (
      <div className="flex items-start space-x-3">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            className={cn(
              'h-5 w-5 text-primary-600 dark:text-primary-500 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600 rounded-md transition-all duration-200 cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:ring-red-400',
              className
            )}
            ref={(node) => {
              if (inputRef.current !== node) {
                (inputRef as any).current = node;
              }
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                (ref as any).current = node;
              }
            }}
            {...props}
          />
        </div>
        {(label || description) && (
          <div className="text-sm">
            {label && (
              <label className="font-medium text-gray-700 dark:text-gray-300">
                {label}
              </label>
            )}
            {description && (
              <p className="text-gray-500 dark:text-gray-400">{description}</p>
            )}
            {error && (
              <p className="text-red-600 dark:text-red-400 text-xs mt-1">{error}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';