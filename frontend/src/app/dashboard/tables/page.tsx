'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Table, useCreateTableMutation, useDeleteTableMutation, useGetTablesQuery, useUpdateTableMutation } from '@/lib/api/endpoints/tablesApi';
import { useAppSelector } from '@/lib/store';
import {
  CheckCircleIcon,
  ClockIcon,
  PencilIcon,
  PlusIcon,
  TableCellsIcon,
  TrashIcon,
  UserGroupIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
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

  console.log('🔍 Tables Debug:', { branchId, user, companyContext });

  const { data, isLoading, error, refetch } = useGetTablesQuery({
    branchId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page: currentPage,
    limit: itemsPerPage,
  }, { skip: !branchId });

  console.log('📊 Tables API Response:', { data, isLoading, error, tablesCount: (data as any)?.tables?.length || (data as any)?.length || 0 });

  // Extract tables from response - handle different response structures
  const tables = (() => {
    if (!data) return [];
    // Handle nested response structures (backend wraps in { success, data })
    if (Array.isArray(data)) return data;
    
    // Check for { success: true, data: [...] } structure
    const responseData = (data as any)?.data;
    if (Array.isArray(responseData)) {
      console.log('✅ Extracted tables from data.data:', responseData.length);
      return responseData;
    }
    
    // Check for { tables: [...] } structure
    if (Array.isArray((data as any)?.tables)) {
      console.log('✅ Extracted tables from data.tables:', (data as any).tables.length);
      return (data as any).tables;
    }
    
    console.warn('⚠️ Could not extract tables array. Data structure:', data);
    return [];
  })();
  
  console.log('🔍 Tables extracted:', { count: tables.length, firstTable: tables[0] });

  const [createTable] = useCreateTableMutation();
  const [updateTable] = useUpdateTableMutation();
  const [deleteTable] = useDeleteTableMutation();

  const [formData, setFormData] = useState<any>({
    branchId: user?.branchId || '',
    tableNumber: '1',
    capacity: 4,
  });

  const resetForm = () => {
    setFormData({
      branchId: user?.branchId || '',
      tableNumber: '1',
      capacity: 4,
    });
    setSelectedTable(null);
  };

  const handleCreate = async () => {
    try {
      await createTable(formData).unwrap();
      toast.success('Table created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create table');
    }
  };

  const handleEdit = async () => {
    if (!selectedTable) return;

    try {
      await updateTable({
        id: selectedTable.id,
        tableNumber: formData.tableNumber,
        capacity: formData.capacity,
        status: selectedTable.status,
      } as any).unwrap();
      toast.success('Table updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update table');
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
      await updateTable({
        id: table.id,
        status,
      } as any).unwrap();
      toast.success(`Table ${table.number} is now ${status}`);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update table status');
    }
  };

  const openEditModal = (table: Table) => {
    setSelectedTable(table);
    setFormData({
      branchId: user?.branchId || '',
      tableNumber: (table as any).tableNumber || table.number?.toString() || '1',
      capacity: table.capacity,
    });
    setIsEditModalOpen(true);
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
          {row.status === 'occupied' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(row, 'available')}
              className="text-green-600 hover:text-green-700"
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
            >
              <ClockIcon className="w-4 h-4" />
            </Button>
          )}
          {(row as any).status === 'needs_cleaning' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusChange(row, 'available')}
              className="text-green-600 hover:text-green-700"
            >
              <CheckCircleIcon className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
          >
            <PencilIcon className="w-4 h-4" />
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

  // Filter tables based on search and status
  const filteredTables = tables.filter((table: any) => {
    const tableNum = (table.tableNumber || table.number || '').toString();
    const matchesSearch = !searchQuery || tableNum.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || table.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: filteredTables.length || tables.length || (data as any)?.total || 0,
    available: filteredTables.filter((t: any) => t.status === 'available').length || 0,
    occupied: filteredTables.filter((t: any) => t.status === 'occupied').length || 0,
    reserved: filteredTables.filter((t: any) => t.status === 'reserved').length || 0,
    cleaning: filteredTables.filter((t: any) => t.status === 'needs_cleaning').length || 0,
  };

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
          totalPages: Math.ceil((filteredTables.length || (data as any)?.total || 0) / itemsPerPage),
          itemsPerPage,
          totalItems: filteredTables.length || (data as any)?.total || 0,
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
            label="Table Number"
            type="number"
            value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 0 })}
            required
          />

          <Input
            label="Seating Capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
            required
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
            <Button onClick={handleCreate}>
              Add Table
            </Button>
          </div>
        </div>
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
            label="Table Number"
            type="number"
            value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: parseInt(e.target.value) || 0 })}
            required
          />

          <Input
            label="Seating Capacity"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
            required
          />

          {selectedTable && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Current Status
              </label>
              <Select
                options={[
                  { value: 'available', label: 'Available' },
                  { value: 'occupied', label: 'Occupied' },
                  { value: 'reserved', label: 'Reserved' },
                  { value: 'needs_cleaning', label: 'Needs Cleaning' },
                ]}
                value={selectedTable.status}
                onChange={(value) => setSelectedTable({ ...selectedTable, status: value as Table['status'] })}
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
            <Button onClick={handleEdit}>
              Update Table
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}