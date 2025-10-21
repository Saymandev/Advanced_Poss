'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { QRCodeMenu, useDeleteQRCodeMutation, useGenerateQRCodeMutation, useGetQRCodesQuery, useUpdateQRCodeMutation } from '@/lib/api/endpoints/aiApi';
import { useGetTablesQuery } from '@/lib/api/endpoints/tablesApi';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
    ChartBarIcon,
    EyeIcon,
    LinkIcon,
    PlusIcon,
    QrCodeIcon,
    TableCellsIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

const MENU_TYPES = [
  { value: 'full', label: 'Full Menu' },
  { value: 'food', label: 'Food Menu' },
  { value: 'drinks', label: 'Drinks Menu' },
  { value: 'desserts', label: 'Desserts Menu' },
];

export default function QRCodesPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCodeMenu | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');

  const { data: qrCodesData, isLoading, refetch } = useGetQRCodesQuery({
    branchId: user?.branchId || undefined,
    tableNumber: tableFilter === 'all' ? undefined : parseInt(tableFilter),
  });

  const { data: tables } = useGetTablesQuery({ branchId: user?.branchId || undefined });
  const [generateQR] = useGenerateQRCodeMutation();
  const [updateQR] = useUpdateQRCodeMutation();
  const [deleteQR] = useDeleteQRCodeMutation();

  const [formData, setFormData] = useState({
    tableNumber: '',
    menuType: 'full' as QRCodeMenu['menuType'],
  });

  const resetForm = () => {
    setFormData({
      tableNumber: '',
      menuType: 'full',
    });
    setSelectedQR(null);
  };

  const handleCreate = async () => {
    try {
      await generateQR({
        branchId: user?.branchId || '',
        tableNumber: formData.tableNumber ? parseInt(formData.tableNumber) : undefined,
        menuType: formData.menuType,
      }).unwrap();

      toast.success('QR code generated successfully');
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to generate QR code');
    }
  };

  const handleToggleActive = async (qr: QRCodeMenu) => {
    try {
      await updateQR({
        id: qr.id,
        data: { isActive: !qr.isActive },
      }).unwrap();

      toast.success(`QR code ${qr.isActive ? 'deactivated' : 'activated'} successfully`);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update QR code status');
    }
  };

  const handleDelete = async (qr: QRCodeMenu) => {
    if (!confirm(`Are you sure you want to delete this QR code?`)) return;

    try {
      await deleteQR(qr.id).unwrap();
      toast.success('QR code deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete QR code');
    }
  };

  const openViewModal = (qr: QRCodeMenu) => {
    setSelectedQR(qr);
    setIsViewModalOpen(true);
  };

  const getMenuTypeBadge = (type: QRCodeMenu['menuType']) => {
    const configs = {
      full: { variant: 'info' as const, label: 'Full Menu' },
      food: { variant: 'success' as const, label: 'Food Menu' },
      drinks: { variant: 'info' as const, label: 'Drinks Menu' },
      desserts: { variant: 'warning' as const, label: 'Desserts Menu' },
    };

    const config = configs[type];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = [
    {
      key: 'tableNumber',
      title: 'Table',
      sortable: true,
      render: (value: number) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <TableCellsIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {value ? `Table ${value}` : 'General Menu'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'menuType',
      title: 'Menu Type',
      render: (value: QRCodeMenu['menuType']) => getMenuTypeBadge(value),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'danger'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'scanCount',
      title: 'Scans',
      align: 'center' as const,
      render: (value: number) => (
        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
      ),
    },
    {
      key: 'lastScanned',
      title: 'Last Scanned',
      render: (value: string) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {value ? formatDateTime(value) : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: QRCodeMenu) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row)}
            className={row.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
          >
            {row.isActive ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    total: qrCodesData?.length || 0,
    active: qrCodesData?.filter(qr => qr.isActive).length || 0,
    totalScans: qrCodesData?.reduce((sum, qr) => sum + qr.scanCount, 0) || 0,
    avgScans: qrCodesData?.length ? (qrCodesData.reduce((sum, qr) => sum + qr.scanCount, 0) / qrCodesData.length).toFixed(1) : '0',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">QR Code Menus</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Contactless menu access for customers
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Generate QR Code
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total QR Codes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <QrCodeIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <QrCodeIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Scans</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalScans}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Scans</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.avgScans}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search QR codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Menu Types' },
                  ...MENU_TYPES,
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
                placeholder="Filter by menu type"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Tables' },
                  ...(tables?.tables?.map(t => ({ value: t.number.toString(), label: `Table ${t.number}` })) || []),
                ]}
                value={tableFilter}
                onChange={setTableFilter}
                placeholder="Filter by table"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>QR Code Menus</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={qrCodesData || []}
            columns={columns}
            loading={isLoading}
            searchable={false}
            selectable={true}
            exportable={true}
            exportFilename="qr-codes"
            onExport={(format, items) => {
              console.log(`Exporting ${items.length} QR codes as ${format}`);
            }}
            emptyMessage="No QR codes generated yet. Create your first QR code to enable contactless menu access."
          />
        </CardContent>
      </Card>

      {/* Create QR Code Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Generate QR Code"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Table (Optional)
            </label>
            <Select
              options={[
                { value: '', label: 'General Menu (No specific table)' },
                ...(tables?.tables?.map(t => ({ value: t.number.toString(), label: `Table ${t.number}` })) || []),
              ]}
              value={formData.tableNumber}
              onChange={(value) => setFormData({ ...formData, tableNumber: value })}
              placeholder="Select table or leave empty for general menu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Menu Type
            </label>
            <Select
              options={MENU_TYPES}
              value={formData.menuType}
              onChange={(value) => setFormData({ ...formData, menuType: value as QRCodeMenu['menuType'] })}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">How it works</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Customers scan the QR code with their phone camera</li>
              <li>• Opens the digital menu in their browser</li>
              <li>• No app download required</li>
              <li>• Real-time menu updates</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Generate QR Code
            </Button>
          </div>
        </div>
      </Modal>

      {/* QR Code Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedQR(null);
        }}
        title="QR Code Details"
        className="max-w-2xl"
      >
        {selectedQR && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <QrCodeIcon className="w-10 h-10 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedQR.tableNumber ? `Table ${selectedQR.tableNumber}` : 'General Menu'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      {getMenuTypeBadge(selectedQR.menuType)}
                      <Badge variant={selectedQR.isActive ? 'success' : 'danger'}>
                        {selectedQR.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{selectedQR.scanCount}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Scans</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QR Code Display */}
            <div className="text-center">
              <div className="inline-block p-4 bg-white border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                  <QrCodeIcon className="w-16 h-16 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">QR Code Preview</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">QR Code Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Menu Type:</span>
                    {getMenuTypeBadge(selectedQR.menuType)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <Badge variant={selectedQR.isActive ? 'success' : 'danger'}>
                      {selectedQR.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(selectedQR.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Last Scanned:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedQR.lastScanned ? formatDateTime(selectedQR.lastScanned) : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Usage Statistics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Scans:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedQR.scanCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Unique Users:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {Math.floor(selectedQR.scanCount * 0.7)} {/* Estimate */}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Avg Daily:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedQR.scanCount > 0 ? (selectedQR.scanCount / Math.max(1, Math.floor((new Date().getTime() - new Date(selectedQR.createdAt).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1) : '0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Copy URL to clipboard
                    navigator.clipboard.writeText(selectedQR.url);
                    toast.success('Menu URL copied to clipboard');
                  }}
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Copy URL
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Download QR code
                    const link = document.createElement('a');
                    link.href = selectedQR.qrCodeImage;
                    link.download = `qr-code-table-${selectedQR.tableNumber || 'general'}.png`;
                    link.click();
                  }}
                >
                  Download QR
                </Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setSelectedQR(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleToggleActive(selectedQR)}
                  variant={selectedQR.isActive ? 'danger' : 'secondary'}
                >
                  {selectedQR.isActive ? 'Disable' : 'Enable'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
