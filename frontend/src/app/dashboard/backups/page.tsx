'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
    Backup,
    CreateBackupRequest,
    useCreateBackupMutation,
    useDeleteBackupMutation,
    useDownloadBackupMutation,
    useExportDataMutation,
    useGetBackupsQuery,
    useGetBackupStatsQuery,
    useImportDataMutation,
    useRestoreBackupMutation
} from '@/lib/api/endpoints/backupsApi';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
    ArrowPathIcon,
    CloudArrowDownIcon,
    CloudArrowUpIcon,
    DocumentArrowDownIcon,
    DocumentArrowUpIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    ShieldCheckIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function BackupsPage() {
  const { user: _user } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [formData, setFormData] = useState<CreateBackupRequest>({
    name: '',
    type: 'full',
    description: '',
    includes: {
      data: true,
      files: true,
      settings: true,
      users: true,
      orders: true,
      inventory: true,
    },
  });
  const [importFile, setImportFile] = useState<File | null>(null);

  // API calls
  const { data: backupsData, isLoading, error } = useGetBackupsQuery({
    page: 1,
    limit: 50,
  });
  const { data: backupStats, isLoading: _statsLoading } = useGetBackupStatsQuery();

  // Mutations
  const [createBackup, { isLoading: isCreating }] = useCreateBackupMutation();
  const [restoreBackup, { isLoading: isRestoring }] = useRestoreBackupMutation();
  const [downloadBackup, { isLoading: isDownloading }] = useDownloadBackupMutation();
  const [deleteBackup, { isLoading: isDeleting }] = useDeleteBackupMutation();
  const [exportData, { isLoading: isExporting }] = useExportDataMutation();
  const [importData, { isLoading: isImporting }] = useImportDataMutation();

  const backups = backupsData?.backups || [];

  const handleCreateBackup = async () => {
    try {
      await createBackup(formData).unwrap();
      toast.success('Backup created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create backup');
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    
    if (!confirm(`Are you sure you want to restore backup "${selectedBackup.name}"? This will overwrite all current data.`)) return;
    
    try {
      await restoreBackup(selectedBackup.id).unwrap();
      toast.success('Backup restored successfully');
      setIsRestoreModalOpen(false);
      setSelectedBackup(null);
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to restore backup');
    }
  };

  const handleDownloadBackup = async (id: string) => {
    try {
      const blob = await downloadBackup(id).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Backup downloaded successfully');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to download backup');
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;
    
    try {
      await deleteBackup(id).unwrap();
      toast.success('Backup deleted successfully');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete backup');
    }
  };

  const handleExportData = async (format: 'json' | 'csv' | 'excel') => {
    try {
      const blob = await exportData({
        format,
        tables: ['users', 'orders', 'menuItems', 'customers', 'inventory'],
      }).unwrap();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-${format}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Data exported successfully');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to export data');
    }
  };

  const handleImportData = async () => {
    if (!importFile) return;
    
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      await importData(formData).unwrap();
      toast.success('Data imported successfully');
      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to import data');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'full',
      description: '',
      includes: {
        data: true,
        files: true,
        settings: true,
        users: true,
        orders: true,
        inventory: true,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'warning',
      in_progress: 'info',
      completed: 'success',
      failed: 'danger',
      cancelled: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const variants: any = {
      full: 'info',
      incremental: 'secondary',
      differential: 'warning',
    };

    return (
      <Badge variant={variants[type] || 'secondary'}>
        {type.toUpperCase()}
      </Badge>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const columns = [
    {
      key: 'name',
      title: 'Name',
      header: 'Name',
      render: (backup: Backup) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {backup.name}
          </p>
          {backup.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {backup.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      header: 'Type',
      render: (backup: Backup) => getTypeBadge(backup.type),
    },
    {
      key: 'status',
      title: 'Status',
      header: 'Status',
      render: (backup: Backup) => getStatusBadge(backup.status),
    },
    {
      key: 'size',
      title: 'Size',
      header: 'Size',
      render: (backup: Backup) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatFileSize(backup.size)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      header: 'Created',
      render: (backup: Backup) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTime(backup.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      header: 'Actions',
      render: (backup: Backup) => (
        <div className="flex items-center gap-2">
          {backup.status === 'completed' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownloadBackup(backup.id)}
                disabled={isDownloading}
              >
                <CloudArrowDownIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedBackup(backup);
                  setIsRestoreModalOpen(true);
                }}
                disabled={isRestoring}
              >
                <ArrowPathIcon className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteBackup(backup.id)}
            className="text-red-600 hover:text-red-700"
            disabled={isDeleting}
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load backups</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Backups & Data Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage system backups and data import/export
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setIsImportModalOpen(true)}
          >
            <DocumentArrowUpIcon className="w-5 h-5 mr-2" />
            Import Data
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleExportData('json')}
            disabled={isExporting}
          >
            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
            Export Data
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Create Backup
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Backups</p>
                <p className="text-3xl font-bold text-blue-600">
                  {isLoading ? '...' : backupStats?.totalBackups || 0}
                </p>
              </div>
              <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Storage Used</p>
                <p className="text-3xl font-bold text-purple-600">
                  {isLoading ? '...' : formatFileSize(backupStats?.storageUsed || 0)}
                </p>
              </div>
              <CloudArrowUpIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Backup</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isLoading ? '...' : backupStats?.lastBackup ? formatDateTime(backupStats.lastBackup) : 'Never'}
                </p>
              </div>
              <CloudArrowDownIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                <p className="text-3xl font-bold text-green-600">
                  {isLoading ? '...' : `${backupStats?.successRate || 0}%`}
                </p>
              </div>
              <ShieldCheckIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backups Table */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
        </CardHeader>
        <CardContent>
           <DataTable
             data={backups}
             columns={columns}
             loading={isLoading}
             searchable={true}
             searchPlaceholder="Search backups..."
           />
        </CardContent>
      </Card>

      {/* Create Backup Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create New Backup"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Backup Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter backup name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter backup description"
            />
          </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
               Backup Type
             </label>
             <select
               value={formData.type}
               onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
               className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
             >
               <option value="full">Full Backup</option>
               <option value="incremental">Incremental</option>
               <option value="differential">Differential</option>
             </select>
           </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Include in Backup
            </label>
            <div className="space-y-2">
              {Object.entries(formData.includes).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setFormData({
                      ...formData,
                      includes: { ...formData.includes, [key]: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBackup}
              disabled={isCreating || !formData.name}
            >
              {isCreating ? 'Creating...' : 'Create Backup'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Restore Backup Modal */}
      <Modal
        isOpen={isRestoreModalOpen}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setSelectedBackup(null);
        }}
        title="Restore Backup"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> This action will overwrite all current data with the backup data. 
                This cannot be undone.
              </p>
            </div>
          </div>

          {selectedBackup && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Backup Details
              </h3>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p><strong>Name:</strong> {selectedBackup.name}</p>
                <p><strong>Type:</strong> {selectedBackup.type}</p>
                <p><strong>Size:</strong> {formatFileSize(selectedBackup.size)}</p>
                <p><strong>Created:</strong> {formatDateTime(selectedBackup.createdAt)}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsRestoreModalOpen(false);
                setSelectedBackup(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRestoreBackup}
              disabled={isRestoring || !selectedBackup}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRestoring ? 'Restoring...' : 'Restore Backup'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Data Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportFile(null);
        }}
        title="Import Data"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select File
            </label>
            <input
              type="file"
              accept=".json,.csv,.xlsx"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Supported formats:</strong> JSON, CSV, Excel (.xlsx)
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportData}
              disabled={isImporting || !importFile}
            >
              {isImporting ? 'Importing...' : 'Import Data'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
