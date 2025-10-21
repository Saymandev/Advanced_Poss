import { cn } from '@/lib/utils';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  className?: string;
  showClearButton?: boolean;
  autoFocus?: boolean;
}

export function SearchBar({
  placeholder = 'Search...',
  value,
  onChange,
  onClear,
  debounceMs = 500,
  className,
  showClearButton = true,
  autoFocus = false,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounce the search
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, onChange, debounceMs]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    onClear?.();
  };

  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
      </div>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="input w-full pl-10 pr-10"
      />
      {showClearButton && localValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

interface SearchFiltersProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: Array<{
    key: string;
    label: string;
    type: 'select' | 'date' | 'daterange';
    options?: Array<{ value: string; label: string }>;
    value: any;
    onChange: (value: any) => void;
  }>;
  onClearAll?: () => void;
  className?: string;
}

export function SearchFilters({
  searchValue,
  onSearchChange,
  filters,
  onClearAll,
  className,
}: SearchFiltersProps) {
  const hasActiveFilters = filters.some(filter => 
    filter.value !== '' && filter.value !== null && filter.value !== undefined
  ) || searchValue;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search bar */}
      <SearchBar
        value={searchValue}
        onChange={onSearchChange}
        placeholder="Search..."
        className="w-full"
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        {filters.map((filter) => (
          <div key={filter.key} className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {filter.label}
            </label>
            {filter.type === 'select' ? (
              <select
                value={filter.value || ''}
                onChange={(e) => filter.onChange(e.target.value)}
                className="input w-full"
              >
                <option value="">All {filter.label}</option>
                {filter.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'date' ? (
              <input
                type="date"
                value={filter.value || ''}
                onChange={(e) => filter.onChange(e.target.value)}
                className="input w-full"
              />
            ) : filter.type === 'daterange' ? (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filter.value?.from || ''}
                  onChange={(e) => filter.onChange({ ...filter.value, from: e.target.value })}
                  className="input flex-1"
                  placeholder="From"
                />
                <input
                  type="date"
                  value={filter.value?.to || ''}
                  onChange={(e) => filter.onChange({ ...filter.value, to: e.target.value })}
                  className="input flex-1"
                  placeholder="To"
                />
              </div>
            ) : null}
          </div>
        ))}

        {/* Clear all button */}
        {hasActiveFilters && onClearAll && (
          <button
            onClick={onClearAll}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
