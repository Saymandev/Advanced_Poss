'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Table, useCreateTableMutation, useDeleteTableMutation, useGetTablesQuery, useUpdateTableMutation, useUpdateTableStatusMutation } from '@/lib/api/endpoints/tablesApi';
import { useAppSelector } from '@/lib/store';
import {
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  TableCellsIcon,
  TrashIcon,
  UserGroupIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function TablesPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Get branchId from multiple sources
  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  console.log('🔍 Tables Page - branchId:', branchId, 'user:', user);

  const { data: tablesResponse, isLoading, error, refetch } = useGetTablesQuery({
    branchId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page: currentPage,
    limit: itemsPerPage,
  }, { skip: !branchId });

  console.log('🔍 Tables Query State:', { isLoading, error, tablesResponse });

  // Extract tables from API response
  const tables = useMemo(() => {
    if (!tablesResponse) {
      console.log('🔍 Tables Response: No data received');
      return [];
    }
    
    const response = tablesResponse as any;
    console.log('🔍 Tables API Response:', response);
    
    let items = [];
    
    // Handle different response structures
    if (Array.isArray(response)) {
      items = response;
    } else if (response.data) {
      if (Array.isArray(response.data)) {
        items = response.data;
      } else {
        items = response.data.tables || response.data.items || [];
      }
    } else {
      items = response.tables || response.items || [];
    }
    
    console.log('🔍 Extracted items:', items);
    
    if (!Array.isArray(items)) {
      console.log('⚠️ Items is not an array:', items);
      return [];
    }
    
    const transformed = items.map((table: any) => ({
      id: table._id || table.id,
      number: table.tableNumber || table.number?.toString() || table.number || '',
      capacity: table.capacity || 4,
      status: table.status || 'available',
      location: table.location,
      qrCode: table.qrCode,
      currentOrderId: table.currentOrderId || table.currentOrder?._id,
      reservationId: table.reservationId || table.reservation?._id,
      createdAt: table.createdAt || new Date().toISOString(),
      updatedAt: table.updatedAt || new Date().toISOString(),
    }));
    
    console.log('🔍 Transformed tables:', transformed);
    return transformed;
  }, [tablesResponse]);

  const totalTables = useMemo(() => {
    const response = tablesResponse as any;
    if (response?.data?.total) return response.data.total;
    if (response?.total) return response.total;
    return tables.length;
  }, [tablesResponse, tables.length]);

  const [createTable, { isLoading: isCreating }] = useCreateTableMutation();
  const [updateTable, { isLoading: isUpdating }] = useUpdateTableMutation();
  const [deleteTable] = useDeleteTableMutation();
  const [updateTableStatus] = useUpdateTableStatusMutation();

  const [formData, setFormData] = useState<any>({
    number: '1',
    capacity: 4,
    location: '',
    status: 'available' as const,
  });

  const resetForm = () => {
    setFormData({
      number: '1',
      capacity: 4,
      location: '',
      status: 'available' as const,
    });
    setSelectedTable(null);
  };

  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen && !isViewModalOpen) {
      resetForm();
    }
  }, [isCreateModalOpen, isEditModalOpen, isViewModalOpen]);

  const handleCreate = async () => {
    if (!formData.number || !formData.capacity) {
      toast.error('Table number and capacity are required');
      return;
    }

    if (!branchId) {
      toast.error('Branch ID is required. Please ensure you are logged in with a valid branch.');
      return;
    }

    try {
      const payload = {
        branchId: branchId.toString(),
        tableNumber: formData.number.toString(),
        capacity: parseInt(formData.capacity) || 4,
        location: formData.location || undefined,
      };
      
      await createTable(payload as any).unwrap();
      toast.success('Table created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      // Refetch tables to show the new one
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to create table');
    }
  };

  const handleEdit = async () => {
    if (!selectedTable) return;
    if (!formData.number || !formData.capacity) {
      toast.error('Table number and capacity are required');
      return;
    }

    try {
      // Update table details (excluding status)
      await updateTable({
        id: selectedTable.id,
        tableNumber: formData.number.toString(),
        capacity: parseInt(formData.capacity) || 4,
        location: formData.location || undefined,
      } as any).unwrap();
      
      // Update status separately if it changed
      if (formData.status && formData.status !== selectedTable.status) {
        await updateTableStatus({
          id: selectedTable.id,
          status: formData.status,
        }).unwrap();
      }
      
      toast.success('Table updated successfully');
      refetch();
      setIsEditModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update table');
    }
  };

  const handleDelete = async (table: Table) => {
    if (!confirm(`Are you sure you want to delete Table ${table.number}?`)) return;

    try {
      await deleteTable(table.id).unwrap();
      toast.success('Table deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete table');
    }
  };

  const handleStatusChange = async (table: Table, status: Table['status']) => {
    try {
      await updateTableStatus({
        id: table.id,
        status,
      }).unwrap();
      toast.success(`Table ${table.number} is now ${status}`);
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update table status');
    }
  };

  const openEditModal = (table: Table) => {
    setSelectedTable(table);
    setFormData({
      number: table.number?.toString() || '1',
      capacity: table.capacity || 4,
      location: table.location || '',
      status: table.status || 'available',
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (table: Table) => {
    setSelectedTable(table);
    setIsViewModalOpen(true);
  };

  const getStatusBadge = (status: Table['status']) => {
    const variants: any = {
      available: 'success',
      occupied: 'danger',
      reserved: 'warning',
      needs_cleaning: 'info',
      maintenance: 'secondary',
    };

    return <Badge variant={variants[status] || 'secondary'}>{status.replace('_', ' ')}</Badge>;
  };

  const getStatusIcon = (status: Table['status']) => {
    const icons: any = {
      available: CheckCircleIcon,
      occupied: XCircleIcon,
      reserved: ClockIcon,
      needs_cleaning: ClockIcon,
      maintenance: ClockIcon,
    };

    const Icon = icons[status] || CheckCircleIcon;
    return <Icon className="w-4 h-4" />;
  };

  const columns = [
    {
      key: 'number',
      title: 'Table',
      sortable: true,
      render: (value: number, row: Table) => (
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            row.status === 'available' ? 'bg-green-100 dark:bg-green-900/30' :
            row.status === 'occupied' ? 'bg-red-100 dark:bg-red-900/30' :
            row.status === 'reserved' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
            'bg-blue-100 dark:bg-blue-900/30'
          }`}>
            <TableCellsIcon className={`w-5 h-5 ${
              row.status === 'available' ? 'text-green-600 dark:text-green-400' :
              row.status === 'occupied' ? 'text-red-600 dark:text-red-400' :
              row.status === 'reserved' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-blue-600 dark:text-blue-400'
            }`} />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Table {value}</p>
            <div className="flex items-center gap-1">
              {getStatusIcon(row.status)}
              <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {row.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'capacity',
      title: 'Capacity',
      align: 'center' as const,
      render: (value: number) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <UserGroupIcon className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">people</p>
        </div>
      ),
    },
    {
      key: 'currentOrderId',
      title: 'Current Order',
      render: (value: string) => (
        <div className="text-center">
          {value ? (
            <Badge variant="info">Order #{value.slice(-6)}</Badge>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">None</span>
          )}
        </div>
      ),
    },
    {
      key: 'reservationId',
      title: 'Reservation',
      render: (value: string) => (
        <div className="text-center">
          {value ? (
            <Badge variant="info">Reserved</Badge>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">None</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: Table['status']) => getStatusBadge(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: Table) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
            title="View Details"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          {row.status === 'occupied' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(row, 'available')}
              className="text-green-600 hover:text-green-700"
              title="Mark as Available"
            >
              <CheckCircleIcon className="w-4 h-4" />
            </Button>
          )}
          {row.status === 'available' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(row, 'needs_cleaning' as any)}
              className="text-blue-600 hover:text-blue-700"
              title="Mark as Needs Cleaning"
            >
              <ClockIcon className="w-4 h-4" />
            </Button>
          )}
          {(row.status === 'needs_cleaning' || (row as any).status === 'needs_cleaning') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(row, 'available')}
              className="text-green-600 hover:text-green-700"
              title="Mark as Available"
            >
              <CheckCircleIcon className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Filter tables based on search and status
  const filteredTables = useMemo(() => {
    return tables.filter((table: any) => {
      const tableNum = (table.number || '').toString();
      const location = (table.location || '').toLowerCase();
      const searchLower = searchQuery.toLowerCase();
      
      const matchesSearch = !searchQuery || 
        tableNum.includes(searchLower) ||
        location.includes(searchLower);
      
      const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [tables, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: totalTables,
      available: tables.filter(t => t.status === 'available').length,
      occupied: tables.filter(t => t.status === 'occupied').length,
      reserved: tables.filter(t => t.status === 'reserved').length,
      cleaning: tables.filter(t => t.status === 'needs_cleaning').length,
    };
  }, [tables, totalTables]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Table Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your restaurant tables and seating arrangements
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Table
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Tables</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <TableCellsIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
                <p className="text-3xl font-bold text-green-600">{stats.available}</p>
              </div>
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Occupied</p>
                <p className="text-3xl font-bold text-red-600">{stats.occupied}</p>
              </div>
              <XCircleIcon className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Reserved</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.reserved}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Need Cleaning</p>
                <p className="text-3xl font-bold text-blue-600">{stats.cleaning}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Layout Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Table Layout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {filteredTables.map((table: any) => (
              <div
                key={table.id}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  table.status === 'available' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' :
                  table.status === 'occupied' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' :
                  table.status === 'reserved' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' :
                  'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                }`}
                onClick={() => openEditModal(table)}
              >
                <div className="text-center">
                  <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    table.status === 'available' ? 'bg-green-100 dark:bg-green-900/30' :
                    table.status === 'occupied' ? 'bg-red-100 dark:bg-red-900/30' :
                    table.status === 'reserved' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                    'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    <span className={`text-sm font-bold ${
                      table.status === 'available' ? 'text-green-600 dark:text-green-400' :
                      table.status === 'occupied' ? 'text-red-600 dark:text-red-400' :
                      table.status === 'reserved' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`}>
                      {(table as any).tableNumber || table.number}
                    </span>
                  </div>
                  <p className={`text-xs font-medium ${
                    table.status === 'available' ? 'text-green-700 dark:text-green-300' :
                    table.status === 'occupied' ? 'text-red-700 dark:text-red-300' :
                    table.status === 'reserved' ? 'text-yellow-700 dark:text-yellow-300' :
                    'text-blue-700 dark:text-blue-300'
                  }`}>
                    {table.status.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {table.capacity} seats
                  </p>
                </div>

                {table.currentOrderId && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-bold">!</span>
                  </div>
                )}
              </div>
            ))}

            {filteredTables.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-8">
                <TableCellsIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No tables configured. Add your first table to get started.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search tables..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'available', label: 'Available' },
                  { value: 'occupied', label: 'Occupied' },
                  { value: 'reserved', label: 'Reserved' },
                  { value: 'needs_cleaning', label: 'Needs Cleaning' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tables Table */}
      <DataTable
        data={filteredTables}
        columns={columns}
        loading={isLoading}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil(totalTables / itemsPerPage),
          itemsPerPage,
          totalItems: totalTables,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="tables"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} tables as ${format}`);
        }}
        emptyMessage="No tables found. Add your first table to get started."
      />

      {/* Create Table Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Add New Table"
        className="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="Table Number *"
            type="text"
            value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            placeholder="e.g., 1, 2, A1, VIP-1"
            required
          />

          <Input
            label="Seating Capacity *"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
            min={1}
            max={50}
            required
          />

          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Indoor, Outdoor, Patio, VIP Section"
          />

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
            <Button onClick={handleCreate} disabled={isCreating || !formData.number || !formData.capacity}>
              {isCreating ? 'Creating...' : 'Add Table'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Table Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedTable(null);
        }}
        title="Table Details"
      >
        {selectedTable && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                selectedTable.status === 'available' ? 'bg-green-100 dark:bg-green-900/30' :
                selectedTable.status === 'occupied' ? 'bg-red-100 dark:bg-red-900/30' :
                selectedTable.status === 'reserved' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <TableCellsIcon className={`w-8 h-8 ${
                  selectedTable.status === 'available' ? 'text-green-600 dark:text-green-400' :
                  selectedTable.status === 'occupied' ? 'text-red-600 dark:text-red-400' :
                  selectedTable.status === 'reserved' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-blue-600 dark:text-blue-400'
                }`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Table {selectedTable.number}
                </h3>
                {getStatusBadge(selectedTable.status)}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Capacity
                  </label>
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white font-semibold">
                      {selectedTable.capacity} people
                    </span>
                  </div>
                </div>

                {selectedTable.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Location
                    </label>
                    <p className="text-gray-900 dark:text-white">{selectedTable.location}</p>
                  </div>
                )}
              </div>

              {selectedTable.currentOrderId && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Current Order
                  </label>
                  <Badge variant="info">
                    Order #{selectedTable.currentOrderId.slice(-6)}
                  </Badge>
                </div>
              )}

              {selectedTable.reservationId && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Reservation
                  </label>
                  <Badge variant="warning">Reserved</Badge>
                </div>
              )}

              {selectedTable.qrCode && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    QR Code
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {selectedTable.qrCode}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Created At
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedTable.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Updated At
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedTable.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedTable(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(selectedTable);
                }}
              >
                Edit Table
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Table Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Table"
        className="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="Table Number *"
            type="text"
            value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            placeholder="e.g., 1, 2, A1, VIP-1"
            required
          />

          <Input
            label="Seating Capacity *"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
            min={1}
            max={50}
            required
          />

          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="e.g., Indoor, Outdoor, Patio, VIP Section"
          />

          {selectedTable && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Status
              </label>
              <Select
                options={[
                  { value: 'available', label: 'Available' },
                  { value: 'occupied', label: 'Occupied' },
                  { value: 'reserved', label: 'Reserved' },
                  { value: 'needs_cleaning', label: 'Needs Cleaning' },
                  { value: 'maintenance', label: 'Maintenance' },
                ]}
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value })}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isUpdating || !formData.number || !formData.capacity}>
              {isUpdating ? 'Updating...' : 'Update Table'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}