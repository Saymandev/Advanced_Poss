'use client';

import { cn } from '@/lib/utils';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
  error?: string;
  disabled?: boolean;
  allowCustom?: boolean; // Allow typing custom values not in options
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder = 'Select or type...',
  className,
  error,
  disabled,
  allowCustom = true,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastValueRef = useRef<string>(value);

  // Update input value when value prop changes (only if not actively being edited by user)
  useEffect(() => {
    // Only sync if value changed externally (not from our onChange) and user isn't actively typing
    if (value !== lastValueRef.current && !isUserTyping) {
      setInputValue(value);
      lastValueRef.current = value;
    }
  }, [value, isUserTyping]);

  // Filter options based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(inputValue.toLowerCase()) ||
          opt.value.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(options);
    }
  }, [inputValue, options]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setIsUserTyping(true);
    lastValueRef.current = newValue;
    
    if (allowCustom) {
      onChange(newValue);
    }
  };

  const handleSelectOption = (optionValue: string) => {
    setInputValue(optionValue);
    setIsUserTyping(false);
    lastValueRef.current = optionValue;
    onChange(optionValue);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Reset typing flag after a short delay to allow for option selection
    setTimeout(() => {
      setIsUserTyping(false);
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsUserTyping(false);
      if (filteredOptions.length > 0) {
        handleSelectOption(filteredOptions[0].value);
      } else if (allowCustom && inputValue.trim()) {
        const trimmedValue = inputValue.trim();
        setInputValue(trimmedValue);
        lastValueRef.current = trimmedValue;
        onChange(trimmedValue);
        setIsOpen(false);
      } else if (allowCustom && !inputValue.trim()) {
        // Allow empty value if custom is allowed
        setInputValue('');
        lastValueRef.current = '';
        onChange('');
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsUserTyping(false);
      // Restore original value on escape
      setInputValue(value);
      lastValueRef.current = value;
      inputRef.current?.blur();
    }
  };

  // Check if current value exists in options
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-2 pr-10 rounded-lg border bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200',
            'border-gray-300 dark:border-gray-600 focus:border-primary-500 dark:focus:border-primary-400',
            'focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'hover:border-gray-400 dark:hover:border-gray-500',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20 dark:border-danger-400'
          )}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDownIcon
            className={cn(
              'h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform',
              isOpen && 'transform rotate-180'
            )}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option) => (
                <li
                  key={option.value}
                  onClick={() => handleSelectOption(option.value)}
                  className={cn(
                    'px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors',
                    value === option.value && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  )}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          ) : allowCustom && inputValue.trim() ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              Press Enter to use &quot;{inputValue}&quot;
            </div>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              No suggestions found
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">{error}</p>
      )}
      
      {allowCustom && !selectedOption && value && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Using custom type: &quot;{value}&quot;
        </p>
      )}
    </div>
  );
}

