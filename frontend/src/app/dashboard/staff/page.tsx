'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
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
  
  // Redirect if user doesn't have staff-management feature (auto-redirects to role-specific dashboard)
  useFeatureRedirect('staff-management');
  
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

  const queryParams = useMemo(() => {
    const params: any = {
      branchId: branchId || undefined,
      page: currentPage,
      limit: itemsPerPage,
    };
    
    if (searchQuery) params.search = searchQuery;
    if (roleFilter !== 'all') params.role = roleFilter;
    
    return params;
  }, [branchId, searchQuery, roleFilter, currentPage, itemsPerPage]);

  const { data: staffResponse, isLoading, error, refetch } = useGetStaffQuery(queryParams, { 
    skip: !branchId,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  const { data: selectedStaffData } = useGetStaffByIdQuery(selectedStaffId, {
    skip: !selectedStaffId || (!isViewModalOpen && !isEditModalOpen),
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
    hourlyRate: undefined,
    department: '',
    emergencyContact: undefined,
    address: undefined,
    skills: [],
    certifications: [],
    notes: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isCreateModalOpen, isEditModalOpen]);

  useEffect(() => {
    // Populate form when editing staff member
    if (selectedStaffData && selectedStaffId && isEditModalOpen) {
      setFormData({
        firstName: selectedStaffData.firstName || '',
        lastName: selectedStaffData.lastName || '',
        email: selectedStaffData.email || '',
        phoneNumber: selectedStaffData.phoneNumber || '',
        role: selectedStaffData.role || 'waiter',
        salary: selectedStaffData.salary,
        hourlyRate: selectedStaffData.hourlyRate,
        department: selectedStaffData.department || '',
        emergencyContact: selectedStaffData.emergencyContact,
        address: selectedStaffData.address,
        skills: selectedStaffData.skills || [],
        certifications: selectedStaffData.certifications || [],
        notes: selectedStaffData.notes || '',
        pin: '',
        password: '',
      });
      setFormErrors({});
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
      hourlyRate: undefined,
      department: '',
      emergencyContact: undefined,
      address: undefined,
      skills: [],
      certifications: [],
      notes: '',
    });
    setSelectedStaffId('');
    setFormErrors({});
  };

  const validateForm = (isEdit = false): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!isEdit && !formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (formData.pin && formData.pin.length !== 6) {
      errors.pin = 'PIN must be exactly 6 digits';
    }

    if (formData.phoneNumber && !/^[\d\s\-\+\(\)]+$/.test(formData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }

    if (formData.salary !== undefined && formData.salary < 0) {
      errors.salary = 'Salary cannot be negative';
    }

    if (formData.hourlyRate !== undefined && formData.hourlyRate < 0) {
      errors.hourlyRate = 'Hourly rate cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm(false)) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!companyId || !branchId) {
      toast.error('Company or Branch ID is missing');
      return;
    }

    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role || 'waiter',
        password: formData.password,
        pin: formData.pin || undefined,
        branchId,
        companyId,
      };

      // Add optional fields that are supported by CreateUserDto
      if (formData.salary !== undefined && formData.salary !== null) {
        payload.salary = formData.salary;
      }
      // Note: hourlyRate, department, emergencyContact, address, skills, certifications, notes
      // are NOT supported by CreateUserDto/User schema, so we don't include them in create
      // These can be added via update if the schema is extended in the future

      await createStaff(payload).unwrap();
      toast.success('Staff member created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      setFormErrors({});
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to create staff member';
      toast.error(errorMessage);
      
      // Set field-specific errors if available
      if (error?.data?.errors) {
        setFormErrors(error.data.errors);
      }
    }
  };

  const handleUpdate = async () => {
    if (!selectedStaffId) {
      toast.error('No staff member selected');
      return;
    }

    if (!validateForm(true)) {
      toast.error('Please fix the errors in the form');
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

      // Include salary if set (supported by UpdateUserDto)
      if (formData.salary !== undefined && formData.salary !== null) {
        payload.salary = formData.salary;
      }

      // Note: hourlyRate, department, emergencyContact, address, skills, certifications, notes
      // are NOT supported by UpdateUserDto/User schema, so we don't include them
      // These can be added via update if the schema is extended in the future

      await updateStaff({ id: selectedStaffId, ...payload }).unwrap();
      toast.success('Staff member updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      setFormErrors({});
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to update staff member';
      toast.error(errorMessage);
      
      // Set field-specific errors if available
      if (error?.data?.errors) {
        setFormErrors(error.data.errors);
      }
    }
  };

  const handleDelete = async (staffId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to delete "${staffName}"? This action cannot be undone.`)) return;

    try {
      await deleteStaff(staffId).unwrap();
      toast.success('Staff member deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to delete staff member');
    }
  };

  const handleToggleStatus = async (staff: Staff) => {
    try {
      if (staff.isActive) {
        // Deactivate
        await deactivateStaff(staff.id).unwrap();
        toast.success('Staff member deactivated successfully');
      } else {
        // Activate by updating isActive status
        await updateStaff({ 
          id: staff.id, 
          isActive: true 
        } as any).unwrap();
        toast.success('Staff member activated successfully');
      }
      refetch();
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
    
    // Populate form immediately with available data from the list
    setFormData({
      firstName: staff.firstName || '',
      lastName: staff.lastName || '',
      email: staff.email || '',
      phoneNumber: staff.phoneNumber || '',
      role: staff.role || 'waiter',
      salary: staff.salary,
      hourlyRate: staff.hourlyRate,
      department: staff.department || '',
      emergencyContact: staff.emergencyContact,
      address: staff.address,
      skills: staff.skills || [],
      certifications: staff.certifications || [],
      notes: staff.notes || '',
      pin: '',
      password: '',
    });
    setFormErrors({});
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

  // Show warning if branchId is missing
  if (!branchId && !isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 mb-2">Unable to load staff</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Branch ID is missing. Please ensure you are logged in and have selected a branch.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your restaurant staff and team members
          </p>
          {error && (
            <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm mt-1">
              Error loading staff: {(error as any)?.data?.message || (error as any)?.message || 'Unknown error'}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <ImportButton
            onImport={async (data, _result) => {
              let successCount = 0;
              let errorCount = 0;

              for (const item of data) {
                try {
                  if (!companyId || !branchId) {
                    toast.error('Company or Branch ID is missing');
                    return;
                  }

                  const payload: any = {
                    firstName: item.firstName || item['First Name'] || item.name?.split(' ')[0] || '',
                    lastName: item.lastName || item['Last Name'] || item.name?.split(' ').slice(1).join(' ') || '',
                    email: item.email || item.Email || '',
                    phoneNumber: item.phoneNumber || item['Phone Number'] || item.phone || item.Phone || '',
                    role: item.role || item.Role || 'waiter',
                    password: item.password || item.Password || 'TempPassword123!', // Generate temp password
                    pin: item.pin || item.PIN || undefined,
                    branchId,
                    companyId,
                  };

                  if (item.salary || item.Salary) {
                    payload.salary = parseFloat(item.salary || item.Salary);
                  }

                  await createStaff(payload).unwrap();
                  successCount++;
                } catch (error: any) {
                  console.error('Failed to import staff:', item, error);
                  errorCount++;
                }
              }

              if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} staff members`);
                await refetch();
              }
              if (errorCount > 0) {
                toast.error(`Failed to import ${errorCount} staff members`);
              }
            }}
            columns={[
              { key: 'firstName', label: 'First Name', required: true, type: 'string' },
              { key: 'lastName', label: 'Last Name', required: true, type: 'string' },
              { key: 'email', label: 'Email', required: true, type: 'email' },
              { key: 'phoneNumber', label: 'Phone Number', type: 'string' },
              { key: 'role', label: 'Role', required: true, type: 'string' },
              { key: 'password', label: 'Password', type: 'string' },
              { key: 'salary', label: 'Salary', type: 'number' },
            ]}
            filename="staff-import-template"
            variant="secondary"
          />
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto text-sm sm:text-base">
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            Add Staff Member
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Total Staff</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate" title={stats.total.toString()}>
                  {stats.total.toLocaleString()}
                </p>
              </div>
              <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Active</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate" title={stats.active.toString()}>
                  {stats.active.toLocaleString()}
                </p>
              </div>
              <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Inactive</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600 truncate" title={stats.inactive.toString()}>
                  {stats.inactive.toLocaleString()}
                </p>
              </div>
              <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Managers</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 truncate" title={stats.managers.toString()}>
                  {stats.managers.toLocaleString()}
                </p>
              </div>
              <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Monthly Payroll</p>
                <p className="text-sm sm:text-base md:text-lg font-bold text-yellow-600 truncate" title={formatCurrency(stats.totalPayroll)}>
                  {formatCurrency(stats.totalPayroll)}
                </p>
              </div>
              <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search staff members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm sm:text-base"
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

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">
            Error loading staff: {(error as any)?.data?.message || (error as any)?.message || 'Unknown error'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}

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
          onExport={(_format, _items) => {
            // Export is handled automatically by ExportButton component
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
                  {selectedStaffData.department && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Department:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedStaffData.department}</span>
                    </div>
                  )}
                  {selectedStaffData.salary && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Monthly Salary:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedStaffData.salary)}
                      </span>
                    </div>
                  )}
                  {selectedStaffData.hourlyRate && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Hourly Rate:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(selectedStaffData.hourlyRate)}/hr
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selectedStaffData.address && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Address</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600 dark:text-gray-400">
                      {typeof selectedStaffData.address === 'string' 
                        ? selectedStaffData.address 
                        : `${selectedStaffData.address.street || ''}, ${selectedStaffData.address.city || ''}, ${selectedStaffData.address.state || ''} ${selectedStaffData.address.zipCode || ''}, ${selectedStaffData.address.country || ''}`
                      }
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            {selectedStaffData.emergencyContact && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Emergency Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {selectedStaffData.emergencyContact.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Relationship:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {selectedStaffData.emergencyContact.relationship}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">
                      {selectedStaffData.emergencyContact.phoneNumber}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Skills & Certifications */}
            {(selectedStaffData.skills?.length || selectedStaffData.certifications?.length) && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedStaffData.skills && selectedStaffData.skills.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedStaffData.skills.map((skill, idx) => (
                          <Badge key={idx} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedStaffData.certifications && selectedStaffData.certifications.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">Certifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedStaffData.certifications.map((cert, idx) => (
                          <Badge key={idx} variant="warning">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedStaffData.notes && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedStaffData.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Joined: {formatDateTime(selectedStaffData.createdAt)}
                <br />
                Last updated: {formatDateTime(selectedStaffData.updatedAt)}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedStaffId('');
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Close
              </Button>
              <Button onClick={() => {
                setIsViewModalOpen(false);
                openEditModal(selectedStaffData);
              }} className="w-full sm:w-auto text-sm sm:text-base">
                <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
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
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="First Name"
                value={formData.firstName || ''}
                onChange={(e) => {
                  setFormData({ ...formData, firstName: e.target.value });
                  if (formErrors.firstName) {
                    setFormErrors({ ...formErrors, firstName: '' });
                  }
                }}
                required
                error={formErrors.firstName}
                className="text-sm sm:text-base"
              />
            </div>
            <div>
              <Input
                label="Last Name"
                value={formData.lastName || ''}
                onChange={(e) => {
                  setFormData({ ...formData, lastName: e.target.value });
                  if (formErrors.lastName) {
                    setFormErrors({ ...formErrors, lastName: '' });
                  }
                }}
                required
                error={formErrors.lastName}
                className="text-sm sm:text-base"
              />
            </div>
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email || ''}
            onChange={(e) => {
              setFormData({ ...formData, email: e.target.value });
              if (formErrors.email) {
                setFormErrors({ ...formErrors, email: '' });
              }
            }}
            required
            error={formErrors.email}
          />

          <Input
            label="Phone Number"
            value={formData.phoneNumber || ''}
            onChange={(e) => {
              setFormData({ ...formData, phoneNumber: e.target.value });
              if (formErrors.phoneNumber) {
                setFormErrors({ ...formErrors, phoneNumber: '' });
              }
            }}
            error={formErrors.phoneNumber}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Role"
              options={ROLE_OPTIONS}
              value={formData.role || 'waiter'}
              onChange={(value) => setFormData({ ...formData, role: value as any })}
            />
            <Input
              label="Department (Optional)"
              value={formData.department || ''}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g., Kitchen, Front of House"
              className="text-sm sm:text-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Monthly Salary (Optional)"
              type="number"
              value={formData.salary?.toString() || ''}
              onChange={(e) => {
                setFormData({ ...formData, salary: e.target.value ? parseFloat(e.target.value) : undefined });
                if (formErrors.salary) {
                  setFormErrors({ ...formErrors, salary: '' });
                }
              }}
              placeholder="Monthly salary amount"
              error={formErrors.salary}
            />
            <Input
              label="Hourly Rate (Optional)"
              type="number"
              value={formData.hourlyRate?.toString() || ''}
              onChange={(e) => {
                setFormData({ ...formData, hourlyRate: e.target.value ? parseFloat(e.target.value) : undefined });
                if (formErrors.hourlyRate) {
                  setFormErrors({ ...formErrors, hourlyRate: '' });
                }
              }}
              placeholder="Per hour rate"
              error={formErrors.hourlyRate}
            />
          </div>

          {isCreateModalOpen && (
            <>
              <Input
                label="Password"
                type="password"
                value={formData.password || ''}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (formErrors.password) {
                    setFormErrors({ ...formErrors, password: '' });
                  }
                }}
                required={isCreateModalOpen}
                placeholder="Min 8 characters"
                error={formErrors.password}
              />
              <Input
                label="PIN (Optional, 6 digits)"
                type="text"
                maxLength={6}
                value={formData.pin || ''}
                onChange={(e) => {
                  setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') });
                  if (formErrors.pin) {
                    setFormErrors({ ...formErrors, pin: '' });
                  }
                }}
                placeholder="6 digit PIN"
                error={formErrors.pin}
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

          {/* Emergency Contact Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Emergency Contact (Optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Contact Name"
                value={formData.emergencyContact?.name || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: {
                    ...formData.emergencyContact,
                    name: e.target.value,
                    relationship: formData.emergencyContact?.relationship || '',
                    phoneNumber: formData.emergencyContact?.phoneNumber || '',
                  } as any,
                })}
                placeholder="Name"
                className="text-sm sm:text-base"
              />
              <Input
                label="Relationship"
                value={formData.emergencyContact?.relationship || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: {
                    ...formData.emergencyContact,
                    name: formData.emergencyContact?.name || '',
                    relationship: e.target.value,
                    phoneNumber: formData.emergencyContact?.phoneNumber || '',
                  } as any,
                })}
                placeholder="e.g., Spouse, Parent"
                className="text-sm sm:text-base"
              />
              <Input
                label="Phone Number"
                value={formData.emergencyContact?.phoneNumber || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  emergencyContact: {
                    ...formData.emergencyContact,
                    name: formData.emergencyContact?.name || '',
                    relationship: formData.emergencyContact?.relationship || '',
                    phoneNumber: e.target.value,
                  } as any,
                })}
                placeholder="Phone"
                className="text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Address (Optional)</h4>
            <Input
              label="Street Address"
              value={typeof formData.address === 'object' ? formData.address?.street || '' : ''}
              onChange={(e) => setFormData({
                ...formData,
                address: {
                  ...(typeof formData.address === 'object' ? formData.address : {}),
                  street: e.target.value,
                  city: typeof formData.address === 'object' ? formData.address?.city || '' : '',
                  state: typeof formData.address === 'object' ? formData.address?.state || '' : '',
                  zipCode: typeof formData.address === 'object' ? formData.address?.zipCode || '' : '',
                  country: typeof formData.address === 'object' ? formData.address?.country || 'USA' : 'USA',
                } as any,
              })}
              placeholder="Street"
              className="mb-2"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
              <Input
                label="City"
                value={typeof formData.address === 'object' ? formData.address?.city || '' : ''}
                onChange={(e) => setFormData({
                  ...formData,
                  address: {
                    ...(typeof formData.address === 'object' ? formData.address : {}),
                    street: typeof formData.address === 'object' ? formData.address?.street || '' : '',
                    city: e.target.value,
                    state: typeof formData.address === 'object' ? formData.address?.state || '' : '',
                    zipCode: typeof formData.address === 'object' ? formData.address?.zipCode || '' : '',
                    country: typeof formData.address === 'object' ? formData.address?.country || 'USA' : 'USA',
                  } as any,
                })}
                placeholder="City"
                className="text-sm sm:text-base"
              />
              <Input
                label="State"
                value={typeof formData.address === 'object' ? formData.address?.state || '' : ''}
                onChange={(e) => setFormData({
                  ...formData,
                  address: {
                    ...(typeof formData.address === 'object' ? formData.address : {}),
                    street: typeof formData.address === 'object' ? formData.address?.street || '' : '',
                    city: typeof formData.address === 'object' ? formData.address?.city || '' : '',
                    state: e.target.value,
                    zipCode: typeof formData.address === 'object' ? formData.address?.zipCode || '' : '',
                    country: typeof formData.address === 'object' ? formData.address?.country || 'USA' : 'USA',
                  } as any,
                })}
                placeholder="State"
                className="text-sm sm:text-base"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="ZIP Code"
                value={typeof formData.address === 'object' ? formData.address?.zipCode || '' : ''}
                onChange={(e) => setFormData({
                  ...formData,
                  address: {
                    ...(typeof formData.address === 'object' ? formData.address : {}),
                    street: typeof formData.address === 'object' ? formData.address?.street || '' : '',
                    city: typeof formData.address === 'object' ? formData.address?.city || '' : '',
                    state: typeof formData.address === 'object' ? formData.address?.state || '' : '',
                    zipCode: e.target.value,
                    country: typeof formData.address === 'object' ? formData.address?.country || 'USA' : 'USA',
                  } as any,
                })}
                placeholder="ZIP Code"
              />
              <Input
                label="Country"
                value={typeof formData.address === 'object' ? formData.address?.country || 'USA' : 'USA'}
                onChange={(e) => setFormData({
                  ...formData,
                  address: {
                    ...(typeof formData.address === 'object' ? formData.address : {}),
                    street: typeof formData.address === 'object' ? formData.address?.street || '' : '',
                    city: typeof formData.address === 'object' ? formData.address?.city || '' : '',
                    state: typeof formData.address === 'object' ? formData.address?.state || '' : '',
                    zipCode: typeof formData.address === 'object' ? formData.address?.zipCode || '' : '',
                    country: e.target.value,
                  } as any,
                })}
                placeholder="Country"
              />
            </div>
          </div>

          {/* Notes Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full"
              placeholder="Additional notes about this staff member..."
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button
              onClick={isEditModalOpen ? handleUpdate : handleCreate}
              disabled={isCreating || isUpdating || !formData.firstName || !formData.lastName || !formData.email || (isCreateModalOpen && !formData.password)}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {isCreating || isUpdating ? 'Saving...' : isEditModalOpen ? 'Update' : 'Add'} Staff Member
            </Button>
          </div>
          {Object.keys(formErrors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-4">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Please fix the following errors:</p>
              <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
                {Object.values(formErrors).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
