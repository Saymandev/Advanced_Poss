'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { QRCodeMenu, useDeleteQRCodeMutation, useGenerateQRCodeMutation, useGetQRCodesQuery, useUpdateQRCodeMutation } from '@/lib/api/endpoints/aiApi';
import { useGetCategoryTypesQuery } from '@/lib/api/endpoints/categoriesApi';
import { useGetTablesQuery } from '@/lib/api/endpoints/tablesApi';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
    ChartBarIcon,
    EyeIcon,
    LinkIcon,
    PencilIcon,
    PlusIcon,
    QrCodeIcon,
    TableCellsIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
export default function QRCodesPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCodeMenu | null>(null);
  const [qrToDelete, setQrToDelete] = useState<QRCodeMenu | null>(null);
  const [editFormData, setEditFormData] = useState({
    menuType: 'full' as QRCodeMenu['menuType'],
    isActive: true,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  // Extract branchId
  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;
  // Form error states
  const [formErrors, setFormErrors] = useState<{
    tableNumber?: string;
    menuType?: string;
  }>({});
  // Query parameters
  const queryParams = useMemo(() => {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    if (tableFilter && tableFilter !== 'all') {
      const tableNum = parseInt(tableFilter, 10);
      if (!isNaN(tableNum) && tableNum > 0) {
        params.tableNumber = tableNum;
      }
    }
    return params;
  }, [branchId, tableFilter]);
  const { data: qrCodesData, isLoading, error, refetch } = useGetQRCodesQuery(queryParams, {
    skip: !branchId,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  // Filter QR codes by type and search
  const filteredQRCodes = useMemo(() => {
    if (!qrCodesData) return [];
    return (qrCodesData || []).filter((qr) => {
      if (typeFilter !== 'all' && qr.menuType !== typeFilter) return false;
      if (searchQuery && !qr.tableNumber?.toString().includes(searchQuery)) return false;
      return true;
    });
  }, [qrCodesData, typeFilter, searchQuery]);
  const { data: tables, isLoading: isLoadingTables } = useGetTablesQuery({ 
    branchId: branchId || undefined 
  }, {
    skip: !branchId,
    refetchOnMountOrArgChange: true,
  });
  // Fetch category types dynamically from API
  const { data: categoryTypesData, isLoading: isLoadingCategoryTypes } = useGetCategoryTypesQuery();
  // Build menu types from category types, including "full" option
  const menuTypes = useMemo(() => {
    const types = [{ value: 'full', label: 'Full Menu' }];
    if (categoryTypesData?.types) {
      // Map category types to menu types
      categoryTypesData.types.forEach((type) => {
        // Map common category types to menu type values
        const menuTypeValue = type.value === 'beverage' ? 'drinks' : 
                             type.value === 'dessert' ? 'desserts' : 
                             type.value.toLowerCase();
        const menuTypeLabel = type.value === 'beverage' ? 'Drinks Menu' :
                             type.value === 'dessert' ? 'Desserts Menu' :
                             `${type.label} Menu`;
        // Only add if not already in the list
        if (!types.find(t => t.value === menuTypeValue)) {
          types.push({ value: menuTypeValue, label: menuTypeLabel });
        }
      });
    }
    // Fallback to default types if API fails
    if (types.length === 1) {
      return [
        { value: 'full', label: 'Full Menu' },
        { value: 'food', label: 'Food Menu' },
        { value: 'drinks', label: 'Drinks Menu' },
        { value: 'desserts', label: 'Desserts Menu' },
      ];
    }
    return types;
  }, [categoryTypesData]);
  const [generateQR, { isLoading: isGenerating }] = useGenerateQRCodeMutation();
  const [updateQR, { isLoading: isUpdating }] = useUpdateQRCodeMutation();
  const [deleteQR, { isLoading: isDeleting }] = useDeleteQRCodeMutation();
  const [formData, setFormData] = useState({
    tableNumber: '',
    menuType: 'full' as QRCodeMenu['menuType'],
  });
  const resetForm = () => {
    setFormData({
      tableNumber: '',
      menuType: 'full',
    });
    setFormErrors({});
    setSelectedQR(null);
  };
  // Validation function
  const validateForm = (): boolean => {
    const errors: { tableNumber?: string; menuType?: string } = {};
    // Menu type is always required and has a default, so no validation needed
    // Table number is optional, so no validation needed
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleCreate = async () => {
    if (!validateForm()) {
      const firstError = Object.values(formErrors)[0];
      if (firstError) {
        toast.error(firstError);
      }
      return;
    }
    if (!branchId) {
      toast.error('Branch ID is required');
      return;
    }
    try {
      // Parse tableNumber safely - only include if it's a valid positive number
      let tableNumber: number | undefined = undefined;
      if (formData.tableNumber && formData.tableNumber.trim()) {
        const parsed = parseInt(formData.tableNumber.trim(), 10);
        if (!isNaN(parsed) && parsed > 0) {
          tableNumber = parsed;
        }
      }
      await generateQR({
        branchId: branchId,
        tableNumber: tableNumber,
        menuType: formData.menuType,
      }).unwrap();
      toast.success('QR code generated successfully');
      setIsCreateModalOpen(false);
      resetForm();
      setTimeout(() => {
        refetch();
      }, 500);
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to generate QR code';
      toast.error(errorMessage);
      // Set field-specific errors if available
      if (error?.data?.errors) {
        setFormErrors(error.data.errors);
      }
    }
  };
  const handleToggleActive = async (qr: QRCodeMenu) => {
    try {
      await updateQR({
        id: qr.id,
        data: { isActive: !qr.isActive },
      }).unwrap();
      toast.success(`QR code ${qr.isActive ? 'deactivated' : 'activated'} successfully`);
      setTimeout(() => {
        refetch();
      }, 500);
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to update QR code status';
      toast.error(errorMessage);
    }
  };
  const handleDeleteClick = (qr: QRCodeMenu) => {
    setQrToDelete(qr);
    setIsDeleteModalOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (!qrToDelete) return;
    try {
      await deleteQR(qrToDelete.id).unwrap();
      toast.success('QR code deleted successfully');
      setIsDeleteModalOpen(false);
      setQrToDelete(null);
      setTimeout(() => {
        refetch();
      }, 500);
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to delete QR code';
      toast.error(errorMessage);
    }
  };
  const openViewModal = (qr: QRCodeMenu) => {
    setSelectedQR(qr);
    setIsViewModalOpen(true);
  };
  const openEditModal = (qr: QRCodeMenu) => {
    setSelectedQR(qr);
    setEditFormData({
      menuType: qr.menuType,
      isActive: qr.isActive,
    });
    setIsEditModalOpen(true);
  };
  const handleEdit = async () => {
    if (!selectedQR) return;
    try {
      await updateQR({
        id: selectedQR.id,
        data: {
          menuType: editFormData.menuType,
          isActive: editFormData.isActive,
        },
      }).unwrap();
      toast.success('QR code updated successfully');
      setIsEditModalOpen(false);
      setSelectedQR(null);
      setTimeout(() => {
        refetch();
      }, 500);
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to update QR code';
      toast.error(errorMessage);
    }
  };
  const getMenuTypeBadge = (type: QRCodeMenu['menuType']) => {
    const configs: Record<string, { variant: 'info' | 'success' | 'warning' | 'danger'; label: string }> = {
      full: { variant: 'info' as const, label: 'Full Menu' },
      food: { variant: 'success' as const, label: 'Food Menu' },
      drinks: { variant: 'info' as const, label: 'Drinks Menu' },
      desserts: { variant: 'warning' as const, label: 'Desserts Menu' },
    };
    const config = configs[type] || { variant: 'info' as const, label: 'Menu' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };
  const columns = [
    {
      key: 'qrCodeImage',
      title: 'QR Code',
      render: (value: string) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white border border-gray-200 dark:border-gray-700 rounded flex items-center justify-center">
            {value ? (
              <Image 
                src={value} 
                alt="QR Code" 
                width={48}
                height={48}
                className="w-full h-full object-contain"
                unoptimized
              />
            ) : (
              <QrCodeIcon className="w-6 h-6 text-gray-400" />
            )}
          </div>
        </div>
      ),
    },
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
            title="View QR Code"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            title="Edit QR Code"
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(row)}
            className={row.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
            disabled={isUpdating}
            title={row.isActive ? 'Disable QR Code' : 'Enable QR Code'}
          >
            {row.isActive ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(row)}
            className="text-red-600 hover:text-red-700"
            disabled={isDeleting}
            title="Delete QR Code"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];
  const qrCodes = useMemo(() => {
    if (!qrCodesData) return [];
    return Array.isArray(qrCodesData) ? qrCodesData : [];
  }, [qrCodesData]);
  const stats = useMemo(() => {
    return {
      total: qrCodes.length,
      active: qrCodes.filter(qr => qr.isActive).length,
      totalScans: qrCodes.reduce((sum, qr) => sum + (qr.scanCount || 0), 0),
      avgScans: qrCodes.length ? (qrCodes.reduce((sum, qr) => sum + (qr.scanCount || 0), 0) / qrCodes.length).toFixed(1) : '0',
    };
  }, [qrCodes]);
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">QR Code Menus</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Contactless menu access for customers
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto text-sm sm:text-base">
          <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Generate QR Code
        </Button>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total QR Codes</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate" title={stats.total.toString()}>
                  {stats.total.toLocaleString()}
                </p>
              </div>
              <QrCodeIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Active</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600 truncate" title={stats.active.toString()}>
                  {stats.active.toLocaleString()}
                </p>
              </div>
              <QrCodeIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Scans</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-purple-600 truncate" title={stats.totalScans.toString()}>
                  {stats.totalScans.toLocaleString()}
                </p>
              </div>
              <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Avg Scans</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-yellow-600 truncate" title={stats.avgScans}>
                  {stats.avgScans}
                </p>
              </div>
              <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-yellow-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by table number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Menu Types' },
                  ...menuTypes,
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
                placeholder="Filter by menu type"
                className="text-xs sm:text-sm"
                disabled={isLoadingCategoryTypes}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={
                  isLoadingTables
                    ? [{ value: 'all', label: 'Loading tables...' }]
                    : [
                        { value: 'all', label: 'All Tables' },
                        ...(tables?.tables?.map(t => ({ 
                          value: t.number.toString(), 
                          label: `Table ${t.number}` 
                        })) || []),
                      ]
                }
                value={tableFilter}
                onChange={setTableFilter}
                placeholder="Filter by table"
                disabled={isLoadingTables}
                className="text-xs sm:text-sm"
              />
            </div>
            {(typeFilter !== 'all' || tableFilter !== 'all' || searchQuery) && (
              <Button
                variant="secondary"
                onClick={() => {
                  setTypeFilter('all');
                  setTableFilter('all');
                  setSearchQuery('');
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Clear Filters
              </Button>
            )}
          </div>
          {!!error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                Error loading QR codes: {(error as any)?.data?.message || 'Unknown error occurred'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {/* QR Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>QR Code Menus</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredQRCodes}
            columns={columns}
            loading={isLoading}
            searchable={false}
            selectable={true}
            pagination={{
              currentPage,
              totalPages: Math.ceil(filteredQRCodes.length / itemsPerPage),
              itemsPerPage,
              totalItems: filteredQRCodes.length,
              onPageChange: setCurrentPage,
              onItemsPerPageChange: setItemsPerPage,
            }}
            exportable={true}
            exportFilename="qr-codes"
            onExport={(_format, _items) => {
              }}
            emptyMessage="No QR codes found. Create your first QR code to enable contactless menu access."
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
              options={
                isLoadingTables
                  ? [{ value: '', label: 'Loading tables...' }]
                  : [
                      { value: '', label: 'General Menu (No specific table)' },
                      ...(tables?.tables?.map(t => ({ 
                        value: t.number.toString(), 
                        label: `Table ${t.number}` 
                      })) || []),
                    ]
              }
              value={formData.tableNumber}
              onChange={(value) => {
                setFormData({ ...formData, tableNumber: value });
                if (formErrors.tableNumber) {
                  setFormErrors(prev => ({ ...prev, tableNumber: undefined }));
                }
              }}
              placeholder="Select table or leave empty for general menu"
              disabled={isLoadingTables}
              error={formErrors.tableNumber}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Menu Type *
            </label>
            <Select
              options={menuTypes}
              value={formData.menuType}
              onChange={(value) => {
                setFormData({ ...formData, menuType: value as QRCodeMenu['menuType'] });
                if (formErrors.menuType) {
                  setFormErrors(prev => ({ ...prev, menuType: undefined }));
                }
              }}
              error={formErrors.menuType}
              disabled={isLoadingCategoryTypes}
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
          {isLoadingTables && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Loading available tables...
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              disabled={isGenerating}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isGenerating || isLoadingTables || !branchId} className="w-full sm:w-auto text-sm sm:text-base">
              {isGenerating ? 'Generating...' : 'Generate QR Code'}
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
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                <QrCodeIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
                      {selectedQR.tableNumber ? `Table ${selectedQR.tableNumber}` : 'General Menu'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getMenuTypeBadge(selectedQR.menuType)}
                      <Badge variant={selectedQR.isActive ? 'success' : 'danger'}>
                        {selectedQR.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xl sm:text-2xl font-bold text-blue-600 truncate" title={selectedQR.scanCount.toString()}>
                      {selectedQR.scanCount.toLocaleString()}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Scans</p>
                  </div>
                </div>
              </div>
            </div>
            {/* QR Code Display */}
            <div className="text-center">
              <div className="inline-block p-4 bg-white border-2 border-gray-200 dark:border-gray-700 rounded-lg">
                {selectedQR.qrCodeImage ? (
                  <div className="w-48 h-48 mx-auto relative">
                    <Image 
                      src={selectedQR.qrCodeImage} 
                      alt="QR Code" 
                      width={192}
                      height={192}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                    <QrCodeIcon className="w-24 h-24 text-gray-400" />
                  </div>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">QR Code Preview</p>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Menu URL:</p>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                  <LinkIcon className="w-4 h-4 text-gray-400" />
                  <code className="text-xs text-gray-700 dark:text-gray-300 break-all flex-1 text-left">
                    {selectedQR.url}
                  </code>
                </div>
              </div>
            </div>
            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Copy URL to clipboard
                    navigator.clipboard.writeText(selectedQR.url);
                    toast.success('Menu URL copied to clipboard');
                  }}
                  className="w-full sm:w-auto text-sm sm:text-base"
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
                  className="w-full sm:w-auto text-sm sm:text-base"
                >
                  Download QR
                </Button>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setSelectedQR(null);
                  }}
                  className="w-full sm:w-auto text-sm sm:text-base"
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleToggleActive(selectedQR)}
                  variant={selectedQR.isActive ? 'danger' : 'secondary'}
                  disabled={isUpdating}
                  className="w-full sm:w-auto text-sm sm:text-base"
                >
                  {isUpdating ? 'Updating...' : (selectedQR.isActive ? 'Disable' : 'Enable')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setQrToDelete(null);
        }}
        title="Delete QR Code"
        className="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this QR code? This action cannot be undone.
          </p>
          {qrToDelete && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Table:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {qrToDelete.tableNumber ? `Table ${qrToDelete.tableNumber}` : 'General Menu'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Menu Type:</span>
                  {getMenuTypeBadge(qrToDelete.menuType)}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Scans:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {qrToDelete.scanCount || 0}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setQrToDelete(null);
              }}
              disabled={isDeleting}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              variant="danger"
              disabled={isDeleting}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {isDeleting ? 'Deleting...' : 'Delete QR Code'}
            </Button>
          </div>
        </div>
      </Modal>
      {/* Edit QR Code Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedQR(null);
        }}
        title="Edit QR Code"
        className="max-w-md"
      >
        <div className="space-y-4">
          {selectedQR && (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">QR Code Information</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Table:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedQR.tableNumber ? `Table ${selectedQR.tableNumber}` : 'General Menu'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Scans:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedQR.scanCount || 0}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Menu Type *
                </label>
                <Select
                  options={menuTypes}
                  value={editFormData.menuType}
                  onChange={(value) => setEditFormData({ ...editFormData, menuType: value as QRCodeMenu['menuType'] })}
                  disabled={isLoadingCategoryTypes}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <Select
                  options={[
                    { value: 'true', label: 'Active' },
                    { value: 'false', label: 'Inactive' },
                  ]}
                  value={editFormData.isActive.toString()}
                  onChange={(value) => setEditFormData({ ...editFormData, isActive: value === 'true' })}
                />
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 dark:text-yellow-400 mb-2">Note</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Changing the menu type will update the QR code URL. Customers will need to scan the updated QR code to see the new menu type.
                </p>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedQR(null);
                  }}
                  disabled={isUpdating}
                  className="w-full sm:w-auto text-sm sm:text-base"
                >
                  Cancel
                </Button>
                <Button onClick={handleEdit} disabled={isUpdating} className="w-full sm:w-auto text-sm sm:text-base">
                  {isUpdating ? 'Updating...' : 'Update QR Code'}
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
