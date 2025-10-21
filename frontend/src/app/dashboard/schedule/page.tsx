'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
    CreateScheduleRequest,
    ScheduleShift,
    UpdateScheduleRequest,
    useCreateShiftMutation,
    useDeleteShiftMutation,
    useGetScheduleStatsQuery,
    useGetShiftsQuery,
    useUpdateShiftMutation,
    useUpdateShiftStatusMutation
} from '@/lib/api/endpoints/scheduleApi';
import { useAppSelector } from '@/lib/store';
// import { formatDateTime } from '@/lib/utils';
import {
    CalendarIcon,
    CheckIcon,
    ClockIcon,
    EyeIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
    UserIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Employee {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  isActive: boolean;
}

// Mock employees data - in real app, this would come from users API
const mockEmployees: Employee[] = [
  { id: '1', name: 'John Doe', role: 'Manager', email: 'john@example.com', phone: '+1234567890', isActive: true },
  { id: '2', name: 'Jane Smith', role: 'Chef', email: 'jane@example.com', phone: '+1234567891', isActive: true },
  { id: '3', name: 'Mike Johnson', role: 'Waiter', email: 'mike@example.com', phone: '+1234567892', isActive: true },
  { id: '4', name: 'Sarah Wilson', role: 'Cashier', email: 'sarah@example.com', phone: '+1234567893', isActive: true },
  { id: '5', name: 'Tom Brown', role: 'Waiter', email: 'tom@example.com', phone: '+1234567894', isActive: false },
];

export default function SchedulePage() {
  const { user } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ScheduleShift | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  const [formData, setFormData] = useState<CreateScheduleRequest>({
    employeeId: '',
    date: '',
    startTime: '',
    endTime: '',
    notes: '',
  });

  // API calls
  const { data: shiftsData, isLoading } = useGetShiftsQuery({
    branchId: user?.branchId || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    startDate: dateFilter || undefined,
    endDate: dateFilter || undefined,
    search: searchQuery || undefined,
    page: currentPage,
    limit: itemsPerPage,
  });

  const { data: statsData } = useGetScheduleStatsQuery({
    branchId: user?.branchId || undefined,
  });

  const [createShift] = useCreateShiftMutation();
  const [updateShift] = useUpdateShiftMutation();
  const [deleteShift] = useDeleteShiftMutation();
  const [updateShiftStatus] = useUpdateShiftStatusMutation();

  const shifts = shiftsData?.shifts || [];
  const scheduleStats = statsData || {
    totalShifts: 0,
    confirmedShifts: 0,
    scheduledShifts: 0,
    completedShifts: 0,
    cancelledShifts: 0,
    upcomingShifts: 0,
  };

  const handleCreate = async () => {
    if (!formData.employeeId || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createShift(formData).unwrap();
      toast.success('Shift scheduled successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create shift');
    }
  };

  const handleEdit = async () => {
    if (!selectedShift || !formData.employeeId || !formData.date || !formData.startTime || !formData.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const updateData: UpdateScheduleRequest = {
        employeeId: formData.employeeId,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        notes: formData.notes,
      };

      await updateShift({ id: selectedShift.id, data: updateData }).unwrap();
      toast.success('Shift updated successfully');
      setIsEditModalOpen(false);
      setSelectedShift(null);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update shift');
    }
  };

  const handleDelete = async (shift: ScheduleShift) => {
    if (window.confirm('Are you sure you want to delete this shift?')) {
      try {
        await deleteShift(shift.id).unwrap();
        toast.success('Shift deleted successfully');
      } catch (error: any) {
        toast.error(error?.data?.message || 'Failed to delete shift');
      }
    }
  };

  const _handleStatusChange = async (shift: ScheduleShift, newStatus: ScheduleShift['status']) => {
    try {
      await updateShiftStatus({ id: shift.id, status: newStatus }).unwrap();
      toast.success('Shift status updated successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update shift status');
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      date: '',
      startTime: '',
      endTime: '',
      notes: '',
    });
  };

  const openEditModal = (shift: ScheduleShift) => {
    setSelectedShift(shift);
    setFormData({
      employeeId: shift.employeeId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      notes: shift.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (shift: ScheduleShift) => {
    setSelectedShift(shift);
    setIsViewModalOpen(true);
  };

  const getStatusBadge = (status: ScheduleShift['status']) => {
    const statusConfig = {
      scheduled: { color: 'bg-blue-100 text-blue-800', icon: ClockIcon },
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckIcon },
      completed: { color: 'bg-gray-100 text-gray-800', icon: CheckIcon },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XMarkIcon },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const columns = [
    {
      key: 'employeeName',
      title: 'Employee',
      render: (shift: ScheduleShift) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
            <UserIcon className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <div className="font-medium">{shift.employeeName}</div>
            <div className="text-sm text-gray-500">{shift.role}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'date',
      title: 'Date',
      render: (shift: ScheduleShift) => (
        <div>
          <div className="font-medium">{new Date(shift.date).toLocaleDateString()}</div>
          <div className="text-sm text-gray-500">
            {shift.startTime} - {shift.endTime}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (shift: ScheduleShift) => getStatusBadge(shift.status),
    },
    {
      key: 'notes',
      title: 'Notes',
      render: (shift: ScheduleShift) => (
        <div className="max-w-xs truncate">{shift.notes || '-'}</div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (shift: ScheduleShift) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(shift)}
            className="h-8 w-8 p-0"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(shift)}
            className="h-8 w-8 p-0"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(shift)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const statsCards = [
    {
      title: 'Total Shifts',
      value: scheduleStats.totalShifts,
      icon: CalendarIcon,
      color: 'text-blue-600',
    },
    {
      title: 'Confirmed',
      value: scheduleStats.confirmedShifts,
      icon: CheckIcon,
      color: 'text-green-600',
    },
    {
      title: 'Scheduled',
      value: scheduleStats.scheduledShifts,
      icon: ClockIcon,
      color: 'text-yellow-600',
    },
    {
      title: 'Completed',
      value: scheduleStats.completedShifts,
      icon: CheckIcon,
      color: 'text-gray-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Schedule Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage employee shifts and schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}
            className="flex items-center gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            {viewMode === 'table' ? 'Calendar View' : 'Table View'}
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            Schedule Shift
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Roles</option>
                <option value="Manager">Manager</option>
                <option value="Chef">Chef</option>
                <option value="Waiter">Waiter</option>
                <option value="Cashier">Cashier</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={shifts}
            columns={columns}
            loading={isLoading}
            pagination={{
              currentPage,
              totalPages: Math.ceil((shiftsData?.total || 0) / itemsPerPage),
              totalItems: shiftsData?.total || 0,
              itemsPerPage,
              onPageChange: setCurrentPage,
              onItemsPerPageChange: setItemsPerPage,
            }}
          />
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}
        title={isCreateModalOpen ? 'Schedule New Shift' : 'Edit Shift'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Employee *
            </label>
            <select
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Employee</option>
              {mockEmployees.filter(emp => emp.isActive).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} ({employee.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date *
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Time *
              </label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Time *
              </label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Optional notes about this shift..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isCreateModalOpen ? handleCreate : handleEdit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreateModalOpen ? 'Schedule Shift' : 'Update Shift'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedShift(null);
        }}
        title="Shift Details"
      >
        {selectedShift && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Employee
                </label>
                <p className="text-gray-900 dark:text-white">{selectedShift.employeeName}</p>
                <p className="text-sm text-gray-500">{selectedShift.role}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </label>
                <div className="mt-1">{getStatusBadge(selectedShift.status)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date
                </label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(selectedShift.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Time
                </label>
                <p className="text-gray-900 dark:text-white">
                  {selectedShift.startTime} - {selectedShift.endTime}
                </p>
              </div>
            </div>

            {selectedShift.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Notes
                </label>
                <p className="text-gray-900 dark:text-white">{selectedShift.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedShift(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(selectedShift);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Edit Shift
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
