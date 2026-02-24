'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import type { ReserveTableRequest } from '@/lib/api/endpoints/tablesApi';
import { Table, useCancelTableReservationMutation, useCreateTableMutation, useDeleteTableMutation, useGetTablesQuery, useReserveTableMutation, useUpdateTableMutation, useUpdateTableStatusMutation } from '@/lib/api/endpoints/tablesApi';
import { useSocket } from '@/lib/hooks/useSocket';
import { useAppSelector } from '@/lib/store';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  TableCellsIcon,
  TrashIcon,
  UserGroupIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
export default function TablesPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  // Redirect if user doesn't have table-management feature (auto-redirects to role-specific dashboard)
  useFeatureRedirect('table-management');
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
  // WebSocket for real-time table updates
  const { socket, isConnected } = useSocket();
  // Track last refetch time to prevent excessive refetches
  const lastRefetchTimeRef = useRef<number>(0);
  const REFETCH_DEBOUNCE_MS = 1000; // Minimum 1 second between refetches
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const { data: tablesResponse, isLoading, error, refetch } = useGetTablesQuery({
    branchId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page: currentPage,
    limit: itemsPerPage,
  }, { 
    skip: !branchId,
    // Use WebSocket for real-time updates, polling as fallback
    pollingInterval: isConnected ? 300000 : 60000, // 5min when WebSocket connected, 60s fallback
    refetchOnMountOrArgChange: false, // Prevent refetch on every render
  });
  // Extract tables from API response
  const tables = useMemo(() => {
    if (!tablesResponse) {
      return [];
    }
    const response = tablesResponse as any;
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
    if (!Array.isArray(items)) {
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
  const [reserveTable, { isLoading: isReserving }] = useReserveTableMutation();
  const [cancelTableReservation, { isLoading: isCancelling }] = useCancelTableReservationMutation();

  // ─── Reservation modal state ────────────────────────────────────────────────
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [reservationTarget, setReservationTarget] = useState<Table | null>(null);
  const [resForm, setResForm] = useState<ReserveTableRequest & { date: string; startTime: string; endTime: string }>({
    tableId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '16:00',
    reservedFor: '',
    reservedUntil: '',
    name: '',
    phone: '',
    partySize: 2,
    email: '',
    notes: '',
  });

  const openReservationModal = (table: Table) => {
    setReservationTarget(table);
    setResForm(f => ({ ...f, tableId: table.id }));
    setIsReservationModalOpen(true);
  };

  const handleReserve = async () => {
    if (!resForm.name.trim()) { toast.error('Customer name is required'); return; }
    if (!resForm.phone.trim()) { toast.error('Phone number is required'); return; }
    const reservedFor   = `${resForm.date}T${resForm.startTime}:00`;
    const reservedUntil = `${resForm.date}T${resForm.endTime}:00`;
    if (reservedUntil <= reservedFor) { toast.error('End time must be after start time'); return; }
    try {
      await reserveTable({
        ...resForm,
        reservedFor,
        reservedUntil,
        email: resForm.email?.trim() || undefined,
        notes: resForm.notes?.trim() || undefined,
      }).unwrap();
      toast.success(`Table ${reservationTarget?.number} reserved for ${resForm.name}`);
      setIsReservationModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to create reservation');
    }
  };

  const handleCancelReservation = async (table: Table) => {
    if (!confirm(`Cancel reservation for Table ${table.number}?`)) return;
    try {
      await cancelTableReservation(table.id).unwrap();
      toast.success(`Reservation for Table ${table.number} cancelled`);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to cancel reservation');
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try { return format(parseISO(iso), 'h:mm a'); } catch { return iso; }
  };
  // ────────────────────────────────────────────────────────────────────────────
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
  // Debounced refetch function for WebSocket events
  const refetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleTableUpdate = useCallback(() => {
    // Throttle refetches
    const now = Date.now();
    if (now - lastRefetchTimeRef.current < REFETCH_DEBOUNCE_MS) {
      return;
    }
    lastRefetchTimeRef.current = now;
    // Clear existing timeout
    if (refetchTimeoutRef.current) {
      clearTimeout(refetchTimeoutRef.current);
    }
    // Debounce to 800ms - batch multiple rapid WebSocket events
    refetchTimeoutRef.current = setTimeout(() => {
      refetch();
    }, 800);
  }, [refetch]);
  // WebSocket listeners for real-time table status updates
  useEffect(() => {
    if (!socket || !isConnected || !branchId) return;
    socket.on('table:status-changed', handleTableUpdate);
    socket.on('table:available', handleTableUpdate);
    socket.on('table:occupied', handleTableUpdate);
    return () => {
      socket.off('table:status-changed', handleTableUpdate);
      socket.off('table:available', handleTableUpdate);
      socket.off('table:occupied', handleTableUpdate);
      if (refetchTimeoutRef.current) {
        clearTimeout(refetchTimeoutRef.current);
      }
    };
  }, [socket, isConnected, branchId, handleTableUpdate]);
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
          {(row.status === ('needs_cleaning' as any) || (row as any).status === 'needs_cleaning') && (
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Table Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your restaurant tables and seating arrangements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton
            onImport={async (data, _result) => {
              let successCount = 0;
              let errorCount = 0;
              for (const item of data) {
                try {
                  if (!branchId) {
                    toast.error('Branch ID is required. Please ensure you are logged in with a valid branch.');
                    return;
                  }
                  const payload = {
                    branchId: branchId.toString(),
                    tableNumber: (item.tableNumber || item['Table Number'] || item.number || item.Number || '').toString(),
                    capacity: parseInt(item.capacity || item.Capacity || 4),
                    location: item.location || item.Location || undefined,
                  };
                  await createTable(payload as any).unwrap();
                  successCount++;
                } catch (error: any) {
                  console.error('Failed to import table:', item, error);
                  errorCount++;
                }
              }
              if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} tables`);
                await refetch();
              }
              if (errorCount > 0) {
                toast.error(`Failed to import ${errorCount} tables`);
              }
            }}
            columns={[
              { key: 'tableNumber', label: 'Table Number', required: true, type: 'string' },
              { key: 'capacity', label: 'Capacity', required: true, type: 'number' },
              { key: 'location', label: 'Location', type: 'string' },
            ]}
            filename="tables-import-template"
            variant="secondary"
          />
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Table
          </Button>
        </div>
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
                className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                  table.status === 'available' ? 'border-green-200 bg-white dark:bg-slate-900/60 dark:border-green-800' :
                  table.status === 'occupied' ? 'border-red-200 bg-white dark:bg-slate-900/60 dark:border-red-800' :
                  table.status === 'reserved' ? 'border-yellow-200 bg-white dark:bg-slate-900/60 dark:border-yellow-800' :
                  'border-blue-200 bg-white dark:bg-slate-900/60 dark:border-blue-800'
                }`}
                onClick={() => openEditModal(table)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1">TABLE NO.</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {(table as any).tableNumber || table.number}
                      </p>
                    </div>
                    {(table as any).location && (
                      <Badge variant="secondary" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700 px-2 py-1">
                        {(table as any).location}
                      </Badge>
                    )}
                  </div>
                  <Badge className={`w-full justify-center ${
                    table.status === 'available'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700'
                      : table.status === 'occupied'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
                      : table.status === 'reserved'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                  }`}>
                    {table.status === 'available' ? 'Available' : table.status === 'reserved' ? 'Reserved' : 'Occupied'}
                  </Badge>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Capacity: <span className="font-semibold text-gray-900 dark:text-white">{table.capacity} seats</span>
                    </p>
                  </div>
                  {/* Reservation info on reserved tables */}
                  {table.status === 'reserved' && table.reservedBy && (
                    <div className="pt-1 space-y-1" onClick={e => e.stopPropagation()}>
                      <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        {formatTime(table.reservedFor)}{table.reservedUntil ? ` – ${formatTime(table.reservedUntil)}` : ''}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{table.reservedBy.name} · {table.reservedBy.partySize} guests</p>
                      <button
                        className="text-[10px] text-red-500 hover:text-red-700 underline mt-0.5"
                        onClick={e => { e.stopPropagation(); handleCancelReservation(table as Table); }}
                        disabled={isCancelling}
                      >
                        Cancel reservation
                      </button>
                    </div>
                  )}
                  {/* Reserve button on available tables */}
                  {table.status === 'available' && (
                    <button
                      onClick={e => { e.stopPropagation(); openReservationModal(table as Table); }}
                      className="w-full mt-1 text-xs px-3 py-1.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors font-medium flex items-center justify-center gap-1.5"
                    >
                      <CalendarDaysIcon className="h-3.5 w-3.5" />
                      Reserve
                    </button>
                  )}
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
        onExport={(_format, _items) => {
          // Export is handled automatically by ExportButton component
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
              {selectedTable.reservedBy && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Reservation
                  </label>
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {selectedTable.reservedBy.name} ({selectedTable.reservedBy.partySize} guests)
                  </p>
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

      {/* ─── Reservation Modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        title={`Reserve Table ${reservationTarget?.number ?? ''}`}
        className="max-w-lg"
      >
        <div className="space-y-5">
          {/* Time slot */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <CalendarDaysIcon className="h-4 w-4" /> Time Slot
            </p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date *</label>
                <input
                  type="date"
                  value={resForm.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setResForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Start Time *</label>
                  <input
                    type="time"
                    value={resForm.startTime}
                    onChange={e => setResForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">End Time *</label>
                  <input
                    type="time"
                    value={resForm.endTime}
                    onChange={e => setResForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              {resForm.startTime && resForm.endTime && resForm.endTime > resForm.startTime && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5" />
                  Duration: {Math.round((new Date(`2000-01-01T${resForm.endTime}`).getTime() - new Date(`2000-01-01T${resForm.startTime}`).getTime()) / 60000)} minutes
                </p>
              )}
            </div>
          </div>

          {/* Customer info */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <UserGroupIcon className="h-4 w-4" /> Customer Details
            </p>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Full Name *</label>
              <input
                type="text"
                placeholder="John Doe"
                value={resForm.name}
                onChange={e => setResForm(f => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Phone *</label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="+880..."
                    value={resForm.phone}
                    onChange={e => setResForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full pl-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Party Size *</label>
                <div className="relative">
                  <UserGroupIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    min={1}
                    max={reservationTarget?.capacity ?? 20}
                    value={resForm.partySize}
                    onChange={e => setResForm(f => ({ ...f, partySize: parseInt(e.target.value) || 1 }))}
                    className="w-full pl-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email (optional)</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={resForm.email ?? ''}
                onChange={e => setResForm(f => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes (optional)</label>
              <textarea
                placeholder="e.g. Window seat, allergy info, special occasion..."
                value={resForm.notes ?? ''}
                onChange={e => setResForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button variant="secondary" onClick={() => setIsReservationModalOpen(false)}>Cancel</Button>
            <Button onClick={handleReserve} disabled={isReserving}>
              {isReserving ? 'Reserving…' : `Reserve ${resForm.startTime} – ${resForm.endTime}`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}