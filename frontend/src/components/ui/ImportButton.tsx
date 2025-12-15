'use client';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { ImportColumn, ImportOptions, ImportResult, downloadImportTemplate, importData } from '@/lib/utils/import';
import { ArrowUpTrayIcon, DocumentArrowUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface ImportButtonProps {
  onImport: (data: any[], result: ImportResult) => Promise<void> | void;
  importOptions?: ImportOptions;
  columns?: ImportColumn[];
  filename?: string;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showTemplateDownload?: boolean;
  acceptedFormats?: string; // e.g., ".csv,.xlsx,.xls"
}

export function ImportButton({
  onImport,
  importOptions,
  columns,
  filename = 'import',
  className,
  disabled = false,
  variant = 'secondary',
  size = 'md',
  showTemplateDownload = true,
  acceptedFormats = '.csv,.xlsx,.xls,.tsv',
}: ImportButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setImportResult(null);
    setPreviewData([]);

    try {
      // Preview the import
      const result = await importData(file, {
        ...importOptions,
        columns: columns || importOptions?.columns,
      });

      setImportResult(result);
      setPreviewData(result.data.slice(0, 5)); // Show first 5 rows as preview
    } catch (error: any) {
      toast.error(error.message || 'Failed to preview file');
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    setIsImporting(true);
    try {
      const result = await importData(selectedFile, {
        ...importOptions,
        columns: columns || importOptions?.columns,
      });

      if (result.errors.length > 0 && result.data.length === 0) {
        // All rows have errors
        toast.error(`Import failed: ${result.errors.length} rows have errors`);
        setImportResult(result);
        return;
      }

      // Call the onImport callback
      await onImport(result.data, result);

      if (result.errors.length > 0) {
        toast.success(
          `Imported ${result.successCount} items successfully. ${result.errorCount} rows had errors.`,
          { duration: 5000 }
        );
      } else {
        toast.success(`Successfully imported ${result.successCount} items`);
      }

      // Reset and close
      setSelectedFile(null);
      setImportResult(null);
      setPreviewData([]);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error(error.message || 'Failed to import data');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    if (!columns || columns.length === 0) {
      toast.error('No columns defined for template');
      return;
    }

    downloadImportTemplate(columns, filename);
    toast.success('Template downloaded');
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
        className={cn('flex items-center gap-2', className)}
      >
        <ArrowUpTrayIcon className="w-4 h-4" />
        Import
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFile(null);
          setImportResult(null);
          setPreviewData([]);
        }}
        title="Import Data"
        size="lg"
      >
        <div className="space-y-4">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select File
            </label>
            <input
              type="file"
              accept={acceptedFormats}
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100
                dark:file:bg-primary-900/30 dark:file:text-primary-400
                dark:hover:file:bg-primary-900/50
                cursor-pointer"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Supported formats: CSV, Excel (.xlsx, .xls), TSV
            </p>
          </div>

          {/* Template Download */}
          {showTemplateDownload && columns && columns.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  Need a template?
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Download a template file with the correct format
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadTemplate}
                className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
              >
                <DocumentArrowUpIcon className="w-4 h-4 mr-1" />
                Download Template
              </Button>
            </div>
          )}

          {/* Preview Data */}
          {previewData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preview ({previewData.length} of {importResult?.totalRows || 0} rows)
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {Object.keys(previewData[0] || {}).map((key) => (
                          <th
                            key={key}
                            className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase"
                          >
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {previewData.map((row, idx) => (
                        <tr key={idx} className="bg-white dark:bg-gray-900">
                          {Object.values(row).map((value: any, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-3 py-2 text-gray-900 dark:text-gray-100"
                            >
                              {value === null || value === undefined ? (
                                <span className="text-gray-400">—</span>
                              ) : typeof value === 'object' ? (
                                JSON.stringify(value)
                              ) : (
                                String(value)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Import Result Summary */}
          {importResult && (
            <div
              className={cn(
                'p-4 rounded-lg border',
                importResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              )}
            >
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon
                  className={cn(
                    'w-5 h-5 mt-0.5',
                    importResult.success
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  )}
                />
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      importResult.success
                        ? 'text-green-900 dark:text-green-200'
                        : 'text-yellow-900 dark:text-yellow-200'
                    )}
                  >
                    {importResult.success
                      ? `Ready to import ${importResult.successCount} items`
                      : `Found ${importResult.successCount} valid rows, ${importResult.errorCount} rows with errors`}
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 max-h-32 overflow-y-auto">
                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                        Errors:
                      </p>
                      <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
                        {importResult.errors.slice(0, 5).map((error, idx) => (
                          <li key={idx}>
                            Row {error.row}: {error.errors.join(', ')}
                          </li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li className="text-yellow-600 dark:text-yellow-500">
                            ... and {importResult.errors.length - 5} more errors
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedFile(null);
                setImportResult(null);
                setPreviewData([]);
              }}
              disabled={isImporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !selectedFile || (importResult?.successCount || 0) === 0}
              isLoading={isImporting}
            >
              {isImporting ? 'Importing...' : `Import ${importResult?.successCount || 0} Items`}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

