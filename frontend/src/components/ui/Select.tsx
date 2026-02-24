import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  options?: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    options, 
    value, 
    onChange, 
    placeholder, 
    label, 
    error, 
    disabled,
    className,
    helperText
  }, ref) => {
    const safeOptions = options || [];
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            value={value !== undefined ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full px-4 py-2 pr-10 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none transition-all duration-200 cursor-pointer',
              'border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400',
              'focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 focus:outline-none',
              'hover:border-gray-400 dark:hover:border-gray-500',
              error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
              disabled && 'opacity-50 cursor-not-allowed',
              className
            )}
          >
            {placeholder && !value && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {safeOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
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

Select.displayName = 'Select';

interface MultiSelectProps {
  options?: SelectOption[];
  values?: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  values,
  onChange,
  placeholder,
  label,
  error,
  disabled,
  className
}: MultiSelectProps) {
  const safeOptions = options || [];
  const safeValues = values || [];
  const handleToggle = (value: string) => {
    if (safeValues.includes(value)) {
      onChange(safeValues.filter(v => v !== value));
    } else {
      onChange([...safeValues, value]);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className={cn(
        'min-h-[42px] p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800',
        error && 'border-danger-500',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}>
        {safeValues.length === 0 && placeholder && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">{placeholder}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {safeValues.map((value) => {
            const option = safeOptions.find(opt => opt.value === value);
            return (
              <span
                key={value}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400 text-sm rounded-md"
              >
                {option?.label}
                <button
                  onClick={() => handleToggle(value)}
                  disabled={disabled}
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
        <div className="mt-2 space-y-1">
          {safeOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center space-x-2 text-sm"
            >
              <input
                type="checkbox"
                checked={safeValues.includes(option.value)}
                onChange={() => handleToggle(option.value)}
                disabled={disabled || option.disabled}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700 dark:text-gray-300">{option.label}</span>
            </label>
          ))}
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}
    </div>
  );
}
