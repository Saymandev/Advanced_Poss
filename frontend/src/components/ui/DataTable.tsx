import { ExportButton } from '@/components/ui/ExportButton';
import { Pagination } from '@/components/ui/Pagination';
import { SearchBar } from '@/components/ui/SearchBar';
import { cn } from '@/lib/utils';
import { ExportOptions } from '@/lib/utils/export';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import React, { useEffect, useRef, useState } from 'react';
import { Checkbox } from './Checkbox';

interface Column<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  sortable?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  selectable?: boolean;
  selectedItems?: T[];
  onSelectionChange?: (items: T[]) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (itemsPerPage: number) => void;
  };
  exportable?: boolean;
  exportFilename?: string;
  exportFormats?: ('excel' | 'csv' | 'pdf')[];
  exportOptions?: ExportOptions;
  onExport?: (format: string, items: T[]) => void;
  emptyMessage?: string;
  className?: string;
  rowClassName?: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  onSearch,
  sortable = true,
  onSort,
  selectable = false,
  selectedItems = [],
  onSelectionChange,
  pagination,
  exportable = true,
  exportFilename = 'data',
  exportFormats = ['excel', 'csv'],
  exportOptions,
  onExport,
  emptyMessage = 'No data available',
  className,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  // Ensure data is always an array
  const safeData = Array.isArray(data) ? data : [];
  
  const [sortKey, setSortKey] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Scroll detection
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (tableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tableContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1); // -1 for rounding errors
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [safeData]);

  const handleSort = (key: string) => {
    if (!sortable) return;

    const newDirection = sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(newDirection);
    onSort?.(key, newDirection);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectable || !onSelectionChange) return;
    
    if (e.target.checked) {
      onSelectionChange(data);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (row: T, checked: boolean) => {
    if (!selectable || !onSelectionChange) return;

    if (checked) {
      onSelectionChange([...selectedItems, row]);
    } else {
      onSelectionChange(selectedItems.filter(item => item !== row));
    }
  };

  const isAllSelected = selectable && selectedItems.length === safeData.length && safeData.length > 0;
  const isIndeterminate = selectable && selectedItems.length > 0 && selectedItems.length < safeData.length;

  const getValue = (row: T, key: string) => {
    return key.split('.').reduce((obj, k) => obj?.[k], row);
  };

  const renderCell = (column: Column<T>, row: T) => {
    const value = getValue(row, column.key as string);
    
    if (column.render) {
      const rendered = column.render(value, row);
      // Validate that rendered value is safe for React
      if (rendered === null || rendered === undefined) {
        return '';
      }
      // Check if it's a valid React element
      if (React.isValidElement(rendered)) {
        return rendered;
      }
      // Check if it's a primitive or string
      if (typeof rendered !== 'object' && typeof rendered !== 'function') {
        return String(rendered);
      }
      // If it's an object, stringify it
      if (typeof rendered === 'object') {
        try {
          return JSON.stringify(rendered);
        } catch {
          return '[Object]';
        }
      }
      return String(rendered);
    }

    // Fallback: avoid rendering raw objects/arrays as React children
    if (value === null || value === undefined) {
      return '';
    }

    // Check if it's a valid React element
    if (React.isValidElement(value)) {
      return value;
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }
    
    // Ensure we return a string for all primitives
    return String(value);
  };

  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex justify-between items-center">
          <div className="h-10 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mx-auto" />
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with search and export */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {searchable && (
          <div className="w-full sm:w-64 lg:w-80">
            <SearchBar
              value={searchQuery}
              onChange={(query) => {
                setSearchQuery(query);
                onSearch?.(query);
              }}
              placeholder={searchPlaceholder}
            />
          </div>
        )}
        
        {exportable && (
          <div className="w-full sm:w-auto flex justify-end">
            <ExportButton
              data={selectedItems.length > 0 ? selectedItems : safeData}
              filename={exportFilename}
              formats={exportFormats}
              exportOptions={exportOptions}
              onExport={(format) => onExport?.(format, selectedItems.length > 0 ? selectedItems : safeData)}
            />
          </div>
        )}
      </div>

      {/* Table - Scrollable Container */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Left Scroll Indicator */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-gray-800 to-transparent z-10 pointer-events-none flex items-center justify-start pl-2">
             <div className="bg-white/80 dark:bg-gray-800/80 p-1 rounded-full shadow-md border border-gray-100 dark:border-gray-700">
              <ChevronDownIcon className="w-4 h-4 rotate-90 text-gray-500" />
            </div>
          </div>
        )}

        {/* Right Scroll Indicator */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-gray-800 to-transparent z-10 pointer-events-none flex items-center justify-end pr-2">
            <div className="bg-white/80 dark:bg-gray-800/80 p-1 rounded-full shadow-md border border-gray-100 dark:border-gray-700">
              <ChevronDownIcon className="w-4 h-4 -rotate-90 text-gray-500" />
            </div>
          </div>
        )}

        <div 
          ref={tableContainerRef}
          onScroll={checkScroll}
          className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary-500/50 scrollbar-track-gray-100 dark:scrollbar-track-gray-800 hover:scrollbar-thumb-primary-600/70"
          style={{
            // Fallback for browsers that don't support tailwind-scrollbar or custom scrollbar utilities
            scrollbarWidth: 'auto',
            scrollbarColor: 'var(--primary-color, #3b82f6) transparent'
          }}
        >
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                {selectable && (
                  <th className="px-6 py-3 text-left">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key as string}
                    className={cn(
                      'px-6 py-3 text-sm font-medium text-gray-900 dark:text-white',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      sortable && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600',
                      column.width && `w-${column.width}`
                    )}
                    onClick={() => sortable && handleSort(column.key as string)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.title}</span>
                      {sortable && sortKey === column.key && (
                        sortDirection === 'asc' ? (
                          <ChevronUpIcon className="w-4 h-4" />
                        ) : (
                          <ChevronDownIcon className="w-4 h-4" />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {safeData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (selectable ? 1 : 0)}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                      <p>{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                safeData.map((row, index) => (
                  <tr
                    key={index}
                    className={cn(
                      'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                      onRowClick && 'cursor-pointer',
                      rowClassName?.(row, index)
                    )}
                    onClick={() => onRowClick?.(row, index)}
                  >
                    {selectable && (
                      <td className="px-6 py-4">
                        <Checkbox
                          checked={selectedItems.includes(row)}
                          onChange={(e) => handleSelectRow(row, e.target.checked)}
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key as string}
                        className={cn(
                          'px-6 py-4 text-sm text-gray-900 dark:text-white',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {renderCell(column, row) as React.ReactNode}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          itemsPerPage={pagination.itemsPerPage}
          totalItems={pagination.totalItems}
          onPageChange={pagination.onPageChange}
          onItemsPerPageChange={pagination.onItemsPerPageChange}
        />
      )}
    </div>
  );
}
