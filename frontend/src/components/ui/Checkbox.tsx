import { cn } from '@/lib/utils';
import React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
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
              'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded',
              error && 'border-red-500 focus:ring-red-500',
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