/**
 * Import Utility Functions
 * 
 * Provides shared functions for importing data from CSV and Excel files
 * with parsing, validation, and data transformation.
 */

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email';
  transform?: (value: string, row: any) => any;
  validate?: (value: any) => string | null; // Returns error message or null
}

export interface ImportOptions {
  columns?: ImportColumn[];
  skipFirstRow?: boolean; // Skip header row
  delimiter?: string; // For CSV (default: ',')
  onRowProcessed?: (row: any, index: number) => void;
  onError?: (error: string, row: any, index: number) => void;
}

export interface ImportResult {
  success: boolean;
  data: any[];
  errors: Array<{ row: number; errors: string[]; data: any }>;
  totalRows: number;
  successCount: number;
  errorCount: number;
}

/**
 * Parse CSV content into array of objects
 */
function parseCSV(content: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of cell
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of row
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        currentCell = '';
        rows.push(currentRow);
        currentRow = [];
      }
      // Skip \r\n combination
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentCell += char;
    }
  }

  // Add last cell and row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parse Excel/TSV content (tab-separated values)
 */
function parseTSV(content: string): string[][] {
  return content.split('\n').map(row => row.split('\t').map(cell => cell.trim()));
}

/**
 * Convert string value to specified type
 */
function convertValue(value: string, type: ImportColumn['type']): any {
  if (!value || value.trim() === '') {
    return null;
  }

  const trimmed = value.trim();

  switch (type) {
    case 'number':
      const num = parseFloat(trimmed);
      return isNaN(num) ? null : num;
    
    case 'boolean':
      const lower = trimmed.toLowerCase();
      return lower === 'true' || lower === 'yes' || lower === '1';
    
    case 'date':
      const date = new Date(trimmed);
      return isNaN(date.getTime()) ? null : date;
    
    case 'email':
      return trimmed.toLowerCase();
    
    default:
      return trimmed;
  }
}

/**
 * Validate a value based on column definition
 */
function validateValue(value: any, column: ImportColumn, row: any): string | null {
  // Check required
  if (column.required && (value === null || value === undefined || value === '')) {
    return `${column.label} is required`;
  }

  // Check type-specific validation
  if (value !== null && value !== undefined && column.validate) {
    return column.validate(value);
  }

  // Type-specific validations
  if (value !== null && value !== undefined) {
    if (column.type === 'email' && typeof value === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return `${column.label} must be a valid email address`;
      }
    }

    if (column.type === 'number' && typeof value !== 'number') {
      return `${column.label} must be a number`;
    }

    if (column.type === 'date' && !(value instanceof Date)) {
      return `${column.label} must be a valid date`;
    }
  }

  return null;
}

/**
 * Import data from CSV file
 */
export async function importFromCSV(
  file: File,
  options: ImportOptions = {}
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const rows = parseCSV(content, options.delimiter);
        
        if (rows.length === 0) {
          resolve({
            success: false,
            data: [],
            errors: [{ row: 0, errors: ['File is empty'], data: {} }],
            totalRows: 0,
            successCount: 0,
            errorCount: 1,
          });
          return;
        }

        const result = processRows(rows, options);
        resolve(result);
      } catch (error: any) {
        resolve({
          success: false,
          data: [],
          errors: [{ row: 0, errors: [error.message || 'Failed to parse CSV file'], data: {} }],
          totalRows: 0,
          successCount: 0,
          errorCount: 1,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: [{ row: 0, errors: ['Failed to read file'], data: {} }],
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Import data from Excel/TSV file
 */
export async function importFromExcel(
  file: File,
  options: ImportOptions = {}
): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const rows = parseTSV(content);
        
        if (rows.length === 0) {
          resolve({
            success: false,
            data: [],
            errors: [{ row: 0, errors: ['File is empty'], data: {} }],
            totalRows: 0,
            successCount: 0,
            errorCount: 1,
          });
          return;
        }

        const result = processRows(rows, options);
        resolve(result);
      } catch (error: any) {
        resolve({
          success: false,
          data: [],
          errors: [{ row: 0, errors: [error.message || 'Failed to parse Excel file'], data: {} }],
          totalRows: 0,
          successCount: 0,
          errorCount: 1,
        });
      }
    };

    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        errors: [{ row: 0, errors: ['Failed to read file'], data: {} }],
        totalRows: 0,
        successCount: 0,
        errorCount: 1,
      });
    };

    reader.readAsText(file);
  });
}

/**
 * Process rows and convert to objects with validation
 */
function processRows(rows: string[][], options: ImportOptions): ImportResult {
  const data: any[] = [];
  const errors: Array<{ row: number; errors: string[]; data: any }> = [];
  
  let startIndex = options.skipFirstRow !== false ? 1 : 0; // Skip header by default
  
  // If columns are defined, use them; otherwise, use first row as headers
  const hasCustomColumns = options.columns && options.columns.length > 0;
  let headers: string[] = [];
  
  if (!hasCustomColumns && rows.length > 0) {
    headers = rows[0];
    startIndex = 1; // Skip header row
  } else if (hasCustomColumns) {
    headers = options.columns!.map(col => col.key);
  }

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    
    // Skip empty rows
    if (row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    const rowData: any = {};
    const rowErrors: string[] = [];

    // Process each column
    headers.forEach((header, colIndex) => {
      const cellValue = row[colIndex] || '';
      const column = hasCustomColumns ? options.columns![colIndex] : null;

      if (column) {
        // Convert value
        let value = convertValue(cellValue, column.type);
        
        // Apply transform if provided
        if (column.transform) {
          try {
            value = column.transform(value, rowData);
          } catch (error: any) {
            rowErrors.push(`Error transforming ${column.label}: ${error.message}`);
            return;
          }
        }

        // Validate value
        const validationError = validateValue(value, column, rowData);
        if (validationError) {
          rowErrors.push(validationError);
        }

        rowData[column.key] = value;
      } else {
        // No column definition, use raw value
        rowData[header] = cellValue;
      }
    });

    if (rowErrors.length > 0) {
      errors.push({
        row: i + 1, // 1-indexed for user display
        errors: rowErrors,
        data: rowData,
      });
      options.onError?.(rowErrors.join('; '), rowData, i);
    } else {
      data.push(rowData);
      options.onRowProcessed?.(rowData, i);
    }
  }

  return {
    success: errors.length === 0,
    data,
    errors,
    totalRows: rows.length - (options.skipFirstRow !== false ? 1 : 0),
    successCount: data.length,
    errorCount: errors.length,
  };
}

/**
 * Main import function that handles file type detection
 */
export async function importData(
  file: File,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const fileName = file.name.toLowerCase();
  
  if (fileName.endsWith('.csv')) {
    return importFromCSV(file, options);
  } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx') || fileName.endsWith('.tsv')) {
    return importFromExcel(file, options);
  } else {
    throw new Error('Unsupported file format. Please use CSV or Excel files.');
  }
}

/**
 * Download a template file for import
 */
export function downloadImportTemplate(
  columns: ImportColumn[],
  filename: string = 'import-template'
): void {
  const headers = columns.map(col => col.label);
  const csvContent = [
    headers.join(','),
    // Add example row
    columns.map(col => {
      switch (col.type) {
        case 'number': return '0';
        case 'boolean': return 'Yes';
        case 'date': return new Date().toLocaleDateString();
        case 'email': return 'example@email.com';
        default: return `Example ${col.label}`;
      }
    }).join(','),
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
  URL.revokeObjectURL(url);
}

