'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  EyeIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  UserIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  pin: string;
  isActive: boolean;
  hireDate: string;
  salary?: number;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  shiftSchedule?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Mock data for demonstration
const mockStaff: Staff[] = [
  {
    id: '1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@restaurant.com',
    phoneNumber: '+1 (555) 123-4567',
    role: 'Manager',
    pin: '1234',
    isActive: true,
    hireDate: '2023-06-15',
    salary: 55000,
    address: '123 Main St, Anytown, ST 12345',
    emergencyContactName: 'Mike Johnson',
    emergencyContactPhone: '+1 (555) 987-6543',
    shiftSchedule: {
      monday: '9:00-17:00',
      tuesday: '9:00-17:00',
      wednesday: '9:00-17:00',
      thursday: '9:00-17:00',
      friday: '9:00-17:00',
      saturday: 'OFF',
      sunday: 'OFF',
    },
    createdAt: '2023-06-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    firstName: 'Carlos',
    lastName: 'Rodriguez',
    email: 'carlos.rodriguez@restaurant.com',
    phoneNumber: '+1 (555) 234-5678',
    role: 'Chef',
    pin: '5678',
    isActive: true,
    hireDate: '2023-08-20',
    salary: 48000,
    shiftSchedule: {
      monday: '14:00-22:00',
      tuesday: '14:00-22:00',
      wednesday: 'OFF',
      thursday: '14:00-22:00',
      friday: '14:00-22:00',
      saturday: '14:00-22:00',
      sunday: 'OFF',
    },
    createdAt: '2023-08-20T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '3',
    firstName: 'Emma',
    lastName: 'Davis',
    email: 'emma.davis@restaurant.com',
    phoneNumber: '+1 (555) 345-6789',
    role: 'Waiter',
    pin: '9012',
    isActive: true,
    hireDate: '2023-11-10',
    salary: 32000,
    shiftSchedule: {
      monday: '17:00-23:00',
      tuesday: 'OFF',
      wednesday: '17:00-23:00',
      thursday: '17:00-23:00',
      friday: '17:00-23:00',
      saturday: '17:00-23:00',
      sunday: '17:00-23:00',
    },
    createdAt: '2023-11-10T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '4',
    firstName: 'Alex',
    lastName: 'Chen',
    email: 'alex.chen@restaurant.com',
    phoneNumber: '+1 (555) 456-7890',
    role: 'Cashier',
    pin: '3456',
    isActive: false,
    hireDate: '2023-09-05',
    salary: 28000,
    createdAt: '2023-09-05T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
  },
];

export default function StaffPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [staff, setStaff] = useState<Staff[]>(mockStaff);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const handleStatusToggle = (staffId: string) => {
    setStaff(prev => prev.map(member =>
      member.id === staffId
        ? { ...member, isActive: !member.isActive, updatedAt: new Date().toISOString() }
        : member
    ));
    toast.success('Staff status updated');
  };

  const openEditModal = (member: Staff) => {
    setSelectedStaff(member);
    setIsEditModalOpen(true);
  };

  const openViewModal = (member: Staff) => {
    setSelectedStaff(member);
    setIsViewModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      'Manager': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'Chef': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'Waiter': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'Cashier': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Bartender': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const columns = [
    {
      key: 'name',
      title: 'Staff Member',
      sortable: true,
      render: (value: any, row: Staff) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {row.firstName} {row.lastName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      render: (value: string) => (
        <Badge className={getRoleBadge(value)}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'phoneNumber',
      title: 'Contact',
      render: (value: string, row: Staff) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'hireDate',
      title: 'Hire Date',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(value).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      key: 'salary',
      title: 'Salary',
      align: 'right' as const,
      render: (value: number) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {value ? `$${value.toLocaleString()}` : 'Not set'}
          </p>
        </div>
      ),
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
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: Staff) => (
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
            onClick={() => openEditModal(row)}
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStatusToggle(row.id)}
            className={row.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
          >
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    total: staff.length,
    active: staff.filter(s => s.isActive).length,
    inactive: staff.filter(s => !s.isActive).length,
    managers: staff.filter(s => s.role === 'Manager').length,
    totalPayroll: staff.filter(s => s.isActive && s.salary).reduce((sum, s) => sum + (s.salary || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your restaurant staff and team members
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Staff</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-600" />
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
              <UsersIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inactive</p>
                <p className="text-3xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Managers</p>
                <p className="text-3xl font-bold text-purple-600">{stats.managers}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Payroll</p>
                <p className="text-3xl font-bold text-yellow-600">
                  ${stats.totalPayroll.toLocaleString()}
                </p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-yellow-600" />
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
                placeholder="Search staff members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Roles' },
                  { value: 'Manager', label: 'Manager' },
                  { value: 'Chef', label: 'Chef' },
                  { value: 'Waiter', label: 'Waiter' },
                  { value: 'Cashier', label: 'Cashier' },
                  { value: 'Bartender', label: 'Bartender' },
                ]}
                value={roleFilter}
                onChange={setRoleFilter}
                placeholder="Filter by role"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <DataTable
        data={staff}
        columns={columns}
        loading={false}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil(staff.length / itemsPerPage),
          itemsPerPage,
          totalItems: staff.length,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="staff"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} staff members as ${format}`);
        }}
        emptyMessage="No staff members found."
      />

      {/* Staff Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedStaff(null);
        }}
        title="Staff Member Details"
        className="max-w-4xl"
      >
        {selectedStaff && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedStaff.firstName} {selectedStaff.lastName}
                    </h3>
                    <Badge className={`${getRoleBadge(selectedStaff.role)} mt-2`}>
                      {selectedStaff.role}
                    </Badge>
                  </div>
                  <Badge variant={selectedStaff.isActive ? 'success' : 'danger'}>
                    {selectedStaff.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{selectedStaff.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{selectedStaff.phoneNumber}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Employment Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">PIN:</span>
                    <span className="font-mono text-gray-900 dark:text-white">****</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Hire Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedStaff.hireDate).toLocaleDateString()}
                    </span>
                  </div>
                  {selectedStaff.salary && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Salary:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${selectedStaff.salary.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Emergency Contact</h4>
                <div className="space-y-2 text-sm">
                  {selectedStaff.emergencyContactName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Name:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedStaff.emergencyContactName}
                      </span>
                    </div>
                  )}
                  {selectedStaff.emergencyContactPhone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedStaff.emergencyContactPhone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shift Schedule */}
            {selectedStaff.shiftSchedule && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Shift Schedule</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(selectedStaff.shiftSchedule).map(([day, hours]) => (
                    <div key={day} className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {day}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {hours || 'OFF'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Address */}
            {selectedStaff.address && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Address</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedStaff.address}</p>
              </div>
            )}

            {/* Timestamps */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Joined: {formatDateTime(selectedStaff.createdAt)}
                <br />
                Last updated: {formatDateTime(selectedStaff.updatedAt)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedStaff(null);
                }}
              >
                Close
              </Button>
              <Button onClick={() => openEditModal(selectedStaff)}>
                Edit Staff
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Staff Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedStaff(null);
        }}
        title={isEditModalOpen ? 'Edit Staff Member' : 'Add Staff Member'}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Staff creation/editing functionality would be implemented here with comprehensive form fields for all staff information.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedStaff(null);
              }}
            >
              Cancel
            </Button>
            <Button>
              {isEditModalOpen ? 'Update' : 'Add'} Staff Member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}