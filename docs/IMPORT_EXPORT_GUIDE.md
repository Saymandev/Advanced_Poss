# Import/Export Functionality Guide

This guide explains how to use the import and export functionality across all dashboard pages.

## Overview

The application now has comprehensive import/export functionality:
- **Export**: Download data as CSV, Excel, or PDF
- **Import**: Upload CSV/Excel files to bulk create/update data
- **Template Download**: Download template files with correct format

## Export Functionality

### How It Works

1. **DataTable Component** - Automatically includes export button when `exportable={true}`
2. **ExportButton Component** - Handles the actual export logic
3. **Export Utility** - Formats data properly (dates, currency, objects, etc.)

### Usage in Pages

```typescript
<DataTable
  data={items}
  columns={columns}
  exportable={true}
  exportFilename="menu-items"
  exportOptions={{
    columns: [
      { key: 'name', label: 'Menu Item' },
      { key: 'price', label: 'Price', format: (value) => formatCurrency(value || 0) },
      { key: 'category', label: 'Category', format: (value, row) => {
        if (typeof value === 'object' && value?.name) return value.name;
        return value || 'N/A';
      }},
      { key: 'isAvailable', label: 'Status', format: (value) => value ? 'Available' : 'Unavailable' },
    ],
    excludeColumns: ['actions', 'imageUrl'],
  }}
  onExport={(format, items) => {
    // Optional: Additional logic when export happens
  }}
/>
```

### Export Options

- **columns**: Define which columns to export and their labels/formatters
- **excludeColumns**: Columns to exclude from export
- **includeHeaders**: Whether to include header row (default: true)

## Import Functionality

### How It Works

1. **ImportButton Component** - Opens modal for file selection
2. **Import Utility** - Parses CSV/Excel files
3. **Validation** - Validates data before import
4. **Preview** - Shows preview of data before importing
5. **Bulk Create** - Creates multiple records at once

### Usage in Pages

```typescript
import { ImportButton } from '@/components/ui/ImportButton';
import { ImportColumn } from '@/lib/utils/import';

<ImportButton
  onImport={async (data, result) => {
    // Handle imported data
    let successCount = 0;
    for (const item of data) {
      try {
        await createItem(item).unwrap();
        successCount++;
      } catch (error) {
        console.error('Failed to import:', item, error);
      }
    }
    toast.success(`Imported ${successCount} items`);
    await refetch();
  }}
  columns={[
    { key: 'name', label: 'Name', required: true, type: 'string' },
    { key: 'price', label: 'Price', required: true, type: 'number' },
    { key: 'category', label: 'Category', required: true, type: 'string' },
    { key: 'isAvailable', label: 'Available', type: 'boolean' },
  ]}
  filename="menu-items-import-template"
  variant="secondary"
/>
```

### Import Column Options

- **key**: Field name in the imported data
- **label**: Column header in CSV/Excel file
- **required**: Whether field is required
- **type**: Data type ('string', 'number', 'boolean', 'date', 'email')
- **transform**: Custom transformation function
- **validate**: Custom validation function

### Supported File Formats

- CSV (.csv)
- Excel (.xlsx, .xls)
- TSV (.tsv)

## Example: Menu Items Page

The menu-items page has been updated with both export and import functionality:

### Export
- Exports menu items with proper formatting
- Includes: name, price, category, prep time, status, rating, description, created date
- Excludes: actions, images

### Import
- Imports menu items from CSV/Excel
- Validates required fields
- Maps category names to category IDs
- Creates items in bulk

## Adding Import to Other Pages

1. Import the component:
```typescript
import { ImportButton } from '@/components/ui/ImportButton';
import { ImportColumn } from '@/lib/utils/import';
```

2. Add ImportButton to header:
```typescript
<ImportButton
  onImport={async (data, result) => {
    // Your import logic here
  }}
  columns={[
    // Define your columns
  ]}
  filename="your-page-import-template"
/>
```

3. Implement the import handler:
```typescript
onImport={async (data, result) => {
  for (const item of data) {
    try {
      await createItem({
        // Map imported data to your API format
        name: item.name,
        price: item.price,
        // ... other fields
      }).unwrap();
    } catch (error) {
      // Handle errors
    }
  }
  await refetch(); // Refresh the list
}}
```

## Template Download

Users can download a template file with:
- Correct column headers
- Example data
- Proper format

This helps ensure imports are successful.

## Error Handling

The import system:
- Shows preview of data before import
- Highlights rows with errors
- Shows detailed error messages
- Allows partial imports (imports valid rows, skips invalid ones)

## Best Practices

1. **Always validate** - Use column validations to catch errors early
2. **Map data properly** - Transform imported data to match your API format
3. **Handle errors gracefully** - Show which rows failed and why
4. **Provide templates** - Help users format their data correctly
5. **Test imports** - Test with various file formats and edge cases

