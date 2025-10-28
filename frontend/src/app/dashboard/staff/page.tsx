'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { CreateStaffRequest, Staff, useCreateStaffMutation, useDeactivateStaffMutation, useDeleteStaffMutation, useGetStaffByIdQuery, useGetStaffQuery, useUpdateStaffMutation } from '@/lib/api/endpoints/staffApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  EyeIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'chef', label: 'Chef' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'cashier', label: 'Cashier' },
];

export default function StaffPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  const companyId = (user as any)?.companyId || 
                    (companyContext as any)?.companyId;

  const { data: staffResponse, isLoading } = useGetStaffQuery({
    branchId,
    search: searchQuery || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    page: currentPage,
    limit: itemsPerPage,
  }, { skip: !branchId });

  const { data: selectedStaffData } = useGetStaffByIdQuery(selectedStaffId, {
    skip: !selectedStaffId || !isViewModalOpen,
  });

  const [createStaff, { isLoading: isCreating }] = useCreateStaffMutation();
  const [updateStaff, { isLoading: isUpdating }] = useUpdateStaffMutation();
  const [deleteStaff] = useDeleteStaffMutation();
  const [deactivateStaff] = useDeactivateStaffMutation();

  // Extract staff from API response
  const staff = useMemo(() => {
    if (!staffResponse) return [];
    return staffResponse.staff || [];
  }, [staffResponse]);

  const totalStaff = useMemo(() => {
    return staffResponse?.total || 0;
  }, [staffResponse]);

  const [formData, setFormData] = useState<Partial<CreateStaffRequest>>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'waiter',
    password: '',
    pin: '',
    salary: undefined,
  });

  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isCreateModalOpen, isEditModalOpen]);

  useEffect(() => {
    if (selectedStaffData && selectedStaffId && isEditModalOpen) {
      setFormData({
        firstName: selectedStaffData.firstName,
        lastName: selectedStaffData.lastName,
        email: selectedStaffData.email,
        phoneNumber: selectedStaffData.phoneNumber,
        role: selectedStaffData.role,
        salary: selectedStaffData.salary,
        pin: '',
        password: '',
      });
    }
  }, [selectedStaffData, selectedStaffId, isEditModalOpen]);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      role: 'waiter',
      password: '',
      pin: '',
      salary: undefined,
    });
    setSelectedStaffId('');
  };

  const handleCreate = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        ...formData,
        branchId,
        companyId,
        role: formData.role || 'waiter',
      } as any;
      await createStaff(payload).unwrap();
      toast.success('Staff member created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to create staff member');
    }
  };

  const handleUpdate = async () => {
    if (!selectedStaffId || !formData.firstName || !formData.lastName || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
      };

      // Only include phoneNumber if it has a value
      if (formData.phoneNumber) {
        payload.phoneNumber = formData.phoneNumber;
      }

      // Only include password if user provided a new one
      if (formData.password && formData.password.trim()) {
        payload.password = formData.password;
      }

      // Only include PIN if user provided a new one
      if (formData.pin && formData.pin.trim()) {
        payload.pin = formData.pin;
      }

      // Include salary if set
      if (formData.salary !== undefined && formData.salary !== null) {
        payload.salary = formData.salary;
      }

      await updateStaff({ id: selectedStaffId, ...payload }).unwrap();
      toast.success('Staff member updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update staff member');
    }
  };

  const handleDelete = async (staffId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to delete "${staffName}"? This action cannot be undone.`)) return;

    try {
      await deleteStaff(staffId).unwrap();
      toast.success('Staff member deleted successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to delete staff member');
    }
  };

  const handleToggleStatus = async (staff: Staff) => {
    try {
      await deactivateStaff(staff.id).unwrap();
      toast.success(`Staff member ${staff.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update staff status');
    }
  };

  const openViewModal = (staff: Staff) => {
    setSelectedStaffId(staff.id);
    setIsViewModalOpen(true);
  };

  const openEditModal = (staff: Staff) => {
    setSelectedStaffId(staff.id);
    setIsEditModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      'manager': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'chef': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'waiter': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'cashier': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'owner': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return colors[role.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const getRoleLabel = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Filter staff by role and status
  const filteredStaff = useMemo(() => {
    let filtered = staff;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => 
        statusFilter === 'active' ? s.isActive : !s.isActive
      );
    }

    return filtered;
  }, [staff, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: totalStaff,
      active: staff.filter(s => s.isActive).length,
      inactive: staff.filter(s => !s.isActive).length,
      managers: staff.filter(s => s.role === 'manager').length,
      totalPayroll: staff.filter(s => s.isActive && s.salary).reduce((sum, s) => sum + (s.salary || 0), 0),
    };
  }, [staff, totalStaff]);

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
          {getRoleLabel(value)}
        </Badge>
      ),
    },
    {
      key: 'phoneNumber',
      title: 'Contact',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <PhoneIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">{value || 'Not provided'}</span>
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
            {value ? new Date(value).toLocaleDateString() : 'N/A'}
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
            {value ? formatCurrency(value) : 'Not set'}
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
            title="View Details"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
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
            onClick={() => handleToggleStatus(row)}
            className={row.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
            title={row.isActive ? 'Deactivate' : 'Activate'}
          >
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id, `${row.firstName} ${row.lastName}`)}
            className="text-red-600 hover:text-red-700"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

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
                  {formatCurrency(stats.totalPayroll)}
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
                  ...ROLE_OPTIONS,
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
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading staff members...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={filteredStaff}
          columns={columns}
          loading={isLoading}
          searchable={false}
          selectable={true}
          pagination={{
            currentPage,
            totalPages: Math.ceil(totalStaff / itemsPerPage),
            itemsPerPage,
            totalItems: totalStaff,
            onPageChange: setCurrentPage,
            onItemsPerPageChange: setItemsPerPage,
          }}
          exportable={true}
          exportFilename="staff"
          onExport={(format, items) => {
            console.log(`Exporting ${items.length} staff members as ${format}`);
            toast.success(`Exporting ${items.length} staff members as ${format.toUpperCase()}`);
          }}
          emptyMessage="No staff members found. Add your first staff member to get started."
        />
      )}

      {/* View Staff Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedStaffId('');
        }}
        title="Staff Member Details"
        className="max-w-4xl"
      >
        {selectedStaffData && (
          <div className="space-y-6">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedStaffData.firstName} {selectedStaffData.lastName}
                    </h3>
                    <Badge className={`${getRoleBadge(selectedStaffData.role)} mt-2`}>
                      {getRoleLabel(selectedStaffData.role)}
                    </Badge>
                  </div>
                  <Badge variant={selectedStaffData.isActive ? 'success' : 'danger'}>
                    {selectedStaffData.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{selectedStaffData.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{selectedStaffData.phoneNumber || 'Not provided'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Employment Information</h4>
                <div className="space-y-2 text-sm">
                  {selectedStaffData.employeeId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Employee ID:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{selectedStaffData.employeeId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Hire Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedStaffData.hireDate ? new Date(selectedStaffData.hireDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  {selectedStaffData.salary && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Salary:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedStaffData.salary)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedStaffData.address && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Address</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {typeof selectedStaffData.address === 'string' 
                      ? selectedStaffData.address 
                      : `${selectedStaffData.address.street || ''}, ${selectedStaffData.address.city || ''}, ${selectedStaffData.address.state || ''} ${selectedStaffData.address.zipCode || ''}`
                    }
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Joined: {formatDateTime(selectedStaffData.createdAt)}
                <br />
                Last updated: {formatDateTime(selectedStaffData.updatedAt)}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedStaffId('');
                }}
              >
                Close
              </Button>
              <Button onClick={() => {
                setIsViewModalOpen(false);
                openEditModal(selectedStaffData);
              }}>
                <PencilIcon className="w-4 h-4 mr-2" />
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
          resetForm();
        }}
        title={isEditModalOpen ? 'Edit Staff Member' : 'Add Staff Member'}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName || ''}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName || ''}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Phone Number"
            value={formData.phoneNumber || ''}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Role"
              options={ROLE_OPTIONS}
              value={formData.role || 'waiter'}
              onChange={(value) => setFormData({ ...formData, role: value as any })}
            />
            <Input
              label="Salary (Optional)"
              type="number"
              value={formData.salary?.toString() || ''}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>

          {isCreateModalOpen && (
            <>
              <Input
                label="Password"
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={isCreateModalOpen}
                placeholder="Min 8 characters with uppercase, lowercase, number and special character"
              />
              <Input
                label="PIN (Optional, 6 digits)"
                type="text"
                maxLength={6}
                value={formData.pin || ''}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                placeholder="6 digit PIN"
              />
            </>
          )}

          {isEditModalOpen && (
            <div className="space-y-4">
              <Input
                label="New Password (Optional)"
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave empty to keep current password"
              />
              <Input
                label="New PIN (Optional, 6 digits)"
                type="text"
                maxLength={6}
                value={formData.pin || ''}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                placeholder="Leave empty to keep current PIN"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
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
              onClick={isEditModalOpen ? handleUpdate : handleCreate}
              disabled={isCreating || isUpdating || !formData.firstName || !formData.lastName || !formData.email || (isCreateModalOpen && !formData.password)}
            >
              {isCreating || isUpdating ? 'Saving...' : isEditModalOpen ? 'Update' : 'Add'} Staff Member
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
