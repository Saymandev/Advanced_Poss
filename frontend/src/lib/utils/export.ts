/**
 * Export Utility Functions
 * 
 * Provides shared functions for exporting data to CSV, Excel, and PDF formats
 * with proper formatting, column mapping, and data transformation.
 */

export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any, row: any) => string | number;
}

export interface ExportOptions {
  filename?: string;
  columns?: ExportColumn[];
  excludeColumns?: string[];
  includeHeaders?: boolean;
}

/**
 * Format a value for export (handles dates, currency, objects, etc.)
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle dates
  if (value instanceof Date) {
    return value.toLocaleDateString() + ' ' + value.toLocaleTimeString();
  }

  // Handle date strings
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      }
    } catch {
      // Not a valid date, continue
    }
  }

  // Handle objects (like customerInfo, category, etc.)
  if (typeof value === 'object' && !Array.isArray(value)) {
    // Try to extract meaningful string representation
    if (value.name) return value.name;
    if (value.email) return value.email;
    if (value.label) return value.label;
    if (value.id) return value.id.toString();
    return JSON.stringify(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(v => formatValue(v)).join(', ');
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle numbers (preserve decimals)
  if (typeof value === 'number') {
    return value.toString();
  }

  return String(value);
}

/**
 * Get column headers from data or custom columns
 */
function getHeaders(data: any[], options: ExportOptions): string[] {
  if (options.columns && options.columns.length > 0) {
    return options.columns.map(col => col.label);
  }

  if (data.length === 0) {
    return [];
  }

  const headers = Object.keys(data[0]);

  // Filter out excluded columns
  if (options.excludeColumns) {
    return headers.filter(h => !options.excludeColumns!.includes(h));
  }

  return headers;
}

/**
 * Get row values for export
 */
function getRowValues(row: any, headers: string[], options: ExportOptions): any[] {
  if (options.columns && options.columns.length > 0) {
    return options.columns.map(col => {
      const value = row[col.key];
      if (col.format) {
        return col.format(value, row);
      }
      return formatValue(value);
    });
  }

  return headers.map(header => formatValue(row[header]));
}

/**
 * Escape CSV value (handles commas, quotes, newlines)
 */
function escapeCSV(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], options: ExportOptions = {}): void {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = getHeaders(data, options);
  const filename = `${options.filename || 'export'}.csv`;

  // Build CSV content
  const csvRows: string[] = [];

  // Add headers if requested
  if (options.includeHeaders !== false) {
    csvRows.push(headers.map(escapeCSV).join(','));
  }

  // Add data rows
  data.forEach(row => {
    const values = getRowValues(row, headers, options);
    csvRows.push(values.map(escapeCSV).join(','));
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to Excel format (TSV format that Excel can open)
 */
export function exportToExcel(data: any[], options: ExportOptions = {}): void {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = getHeaders(data, options);
  const filename = `${options.filename || 'export'}.xls`;

  // Build TSV content (tab-separated values)
  const tsvRows: string[] = [];

  // Add headers if requested
  if (options.includeHeaders !== false) {
    tsvRows.push(headers.join('\t'));
  }

  // Add data rows
  data.forEach(row => {
    const values = getRowValues(row, headers, options);
    tsvRows.push(values.join('\t'));
  });

  const tsvContent = tsvRows.join('\n');
  const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data to PDF format (opens print dialog)
 */
export function exportToPDF(data: any[], options: ExportOptions = {}): void {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = getHeaders(data, options);
  const filename = options.filename || 'export';

  // Build HTML table
  const tableRows = data.map(row => {
    const values = getRowValues(row, headers, options);
    return `<tr>${values.map(v => `<td>${String(v).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`;
  }).join('');

  const tableHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page {
              margin: 1cm;
              size: A4 landscape;
            }
          }
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 12px;
          }
          h1 {
            margin-bottom: 20px;
            color: #333;
            font-size: 18px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            word-wrap: break-word;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
            color: #333;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          tr:hover {
            background-color: #f5f5f5;
          }
          .footer {
            margin-top: 20px;
            font-size: 10px;
            color: #666;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>${filename}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <p>Total Records: ${data.length}</p>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="footer">
          <p>Generated by RESTOGO Management System</p>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(tableHtml);
    printWindow.document.close();

    // Wait for content to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };
  } else {
    throw new Error('Popup blocked. Please allow popups for this site.');
  }
}

/**
 * Main export function that handles all formats
 */
export function exportData(
  data: any[],
  format: 'csv' | 'excel' | 'pdf',
  options: ExportOptions = {}
): void {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  switch (format) {
    case 'csv':
      exportToCSV(data, options);
      break;
    case 'excel':
      exportToExcel(data, options);
      break;
    case 'pdf':
      exportToPDF(data, options);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

