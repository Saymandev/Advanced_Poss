import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { exportData, ExportOptions } from '@/lib/utils/export';
import { ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface ExportButtonProps {
  data: any[];
  filename?: string;
  formats?: ('excel' | 'csv' | 'pdf')[];
  onExport?: (format: string) => void;
  exportOptions?: ExportOptions;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function ExportButton({
  data,
  filename = 'export',
  formats = ['excel', 'csv'],
  onExport,
  exportOptions,
  className,
  disabled = false,
  variant = 'secondary',
  size = 'md',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (disabled || data.length === 0) {
      toast.error('No data to export');
      return;
    }

    setIsExporting(true);
    try {
      // Call the callback if provided
      onExport?.(format);

      // Use the shared export utility
      const options: ExportOptions = {
        filename,
        ...exportOptions,
      };

      exportData(data, format, options);
      
      toast.success(`${format.toUpperCase()} exported successfully`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error?.message || 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setIsDropdownOpen(false);
    }
  };

  if (formats.length === 1) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => handleExport(formats[0])}
        disabled={disabled || isExporting}
        isLoading={isExporting}
        className={cn('flex items-center gap-2', className)}
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
        Export {formats[0].toUpperCase()}
      </Button>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        variant={variant}
        size={size}
        disabled={disabled || isExporting}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2"
      >
        <DocumentArrowDownIcon className="w-4 h-4" />
        Export
        <ArrowDownTrayIcon className={cn("w-3 h-3 transition-transform", isDropdownOpen && "rotate-180")} />
      </Button>

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-20 sm:right-0 sm:left-auto">
            <div className="py-1">
              {formats.map((format) => (
                <button
                  key={format}
                  onClick={() => {
                    handleExport(format);
                    setIsDropdownOpen(false);
                  }}
                  disabled={disabled || isExporting}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  Export as {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface BulkExportButtonProps {
  selectedItems: any[];
  allItems: any[];
  filename?: string;
  formats?: ('excel' | 'csv' | 'pdf')[];
  onExport?: (format: string, items: any[]) => void;
  className?: string;
}

export function BulkExportButton({
  selectedItems,
  allItems,
  filename = 'export',
  formats = ['excel', 'csv'],
  onExport,
  className,
}: BulkExportButtonProps) {
  const hasSelection = selectedItems.length > 0;
  const itemsToExport = hasSelection ? selectedItems : allItems;

  return (
    <ExportButton
      data={itemsToExport}
      filename={`${filename}_${hasSelection ? 'selected' : 'all'}`}
      formats={formats}
      onExport={(format) => onExport?.(format, itemsToExport)}
      className={className}
      disabled={allItems.length === 0}
    />
  );
}
