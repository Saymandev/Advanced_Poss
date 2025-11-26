import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface ExportButtonProps {
  data: any[];
  filename?: string;
  formats?: ('excel' | 'csv' | 'pdf')[];
  onExport?: (format: string) => void;
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
  className,
  disabled = false,
  variant = 'secondary',
  size = 'md',
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    // For Excel export, we'll use a simple CSV approach
    // In a real app, you'd use a library like xlsx
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join('\t'),
      ...data.map(row => 
        headers.map(header => row[header]).join('\t')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    // For PDF export, we'll create a simple HTML table and print it
    if (data.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const tableHtml = `
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>${filename}</h1>
          <table>
            <thead>
              <tr>
                ${headers.map(header => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => 
                `<tr>${headers.map(header => `<td>${row[header]}</td>`).join('')}</tr>`
              ).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(tableHtml);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExport = async (format: string) => {
    if (disabled || data.length === 0) return;

    setIsExporting(true);
    try {
      onExport?.(format);

      switch (format) {
        case 'csv':
          exportToCSV();
          toast.success('CSV exported successfully');
          break;
        case 'excel':
          exportToExcel();
          toast.success('Excel file exported successfully');
          break;
        case 'pdf':
          exportToPDF();
          toast.success('PDF exported successfully');
          break;
      }
    } catch (error) {
      console.error(error);
      toast.error('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
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
