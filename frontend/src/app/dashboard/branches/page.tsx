'use client';
import { PinVerificationModal } from '@/components/auth/PinVerificationModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import { Branch, useCreateBranchMutation, useGetBranchByIdQuery, useGetBranchesQuery, useGetBranchStatsQuery, usePermanentDeleteBranchMutation, useRestoreBranchMutation, useSoftDeleteBranchMutation, useToggleBranchStatusMutation, useUpdateBranchMutation } from '@/lib/api/endpoints/branchesApi';
import { Staff, useGetStaffQuery } from '@/lib/api/endpoints/staffApi';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
  BuildingOfficeIcon,
  ClockIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  PowerIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
export default function BranchesPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  // Redirect if user doesn't have branches feature (auto-redirects to role-specific dashboard)
  useFeatureRedirect('branches');
  const companyId = companyContext?.companyId || user?.companyId || '';
  // Get current active branch ID
  const currentBranchId = user?.branchId || (companyContext as any)?.branchId || '';
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: 'delete' | 'permanent-delete' | 'toggle'; data: Branch } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { data, isLoading, refetch } = useGetBranchesQuery(
    {
      companyId,
      search: searchQuery || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
      page: currentPage,
      limit: itemsPerPage,
    },
    { skip: !companyId },
  );
  const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating }] = useUpdateBranchMutation();
  const [softDeleteBranch, { isLoading: isSoftDeleting }] = useSoftDeleteBranchMutation();
  const [restoreBranch, { isLoading: _isRestoring }] = useRestoreBranchMutation();
  const [permanentDeleteBranch, { isLoading: _isPermanentDeleting }] = usePermanentDeleteBranchMutation();
  const [toggleBranchStatus, { isLoading: isToggling }] = useToggleBranchStatusMutation();
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Reset form when modals close
  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreateModalOpen, isEditModalOpen]);
  // Get staff for manager selection
  const { data: staffData } = useGetStaffQuery(
    {
      companyId,
      role: 'manager',
      isActive: true,
      limit: 200,
    },
    { skip: !companyId },
  );
  const managers = staffData?.staff?.filter((s: Staff) => s.role === 'manager' && s.isActive) || [];
  const [formData, setFormData] = useState({
    name: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'BD',
      zipCode: '',
    },
    phone: '',
    email: '',
    managerId: '',
    openingHours: [
      { day: 'monday', open: '09:00', close: '21:00', isClosed: false },
      { day: 'tuesday', open: '09:00', close: '21:00', isClosed: false },
      { day: 'wednesday', open: '09:00', close: '21:00', isClosed: false },
      { day: 'thursday', open: '09:00', close: '21:00', isClosed: false },
      { day: 'friday', open: '09:00', close: '21:00', isClosed: false },
      { day: 'saturday', open: '09:00', close: '21:00', isClosed: false },
      { day: 'sunday', open: '09:00', close: '21:00', isClosed: false },
    ],
    totalTables: 0,
    totalSeats: 0,
    companyId: companyId || '',
  });
  const resetForm = () => {
    setFormData({
      name: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: 'BD',
        zipCode: '',
      },
      phone: '',
      email: '',
      managerId: '',
      openingHours: [
        { day: 'monday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'tuesday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'wednesday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'thursday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'friday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'saturday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'sunday', open: '09:00', close: '21:00', isClosed: false },
      ],
      totalTables: 0,
      totalSeats: 0,
      companyId: companyId || '',
    });
    setFormErrors({});
  };
  // Validation functions
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    // Name validation
    if (!formData.name.trim()) {
      errors.name = 'Branch name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Branch name must be at least 2 characters';
    }
    // Address validation
    if (!formData.address.street.trim()) {
      errors.street = 'Street address is required';
    }
    if (!formData.address.city.trim()) {
      errors.city = 'City is required';
    }
    if (!formData.address.country.trim()) {
      errors.country = 'Country is required';
    }
    // Email validation
    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    // Phone validation
    if (formData.phone && !validatePhone(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    // Opening hours validation
    formData.openingHours.forEach((day, index) => {
      if (!day.isClosed) {
        if (!day.open || !day.close) {
          errors[`openingHours.${index}`] = 'Opening and closing times are required';
        } else if (day.open >= day.close) {
          errors[`openingHours.${index}`] = 'Closing time must be after opening time';
        }
      }
    });
    // Total tables/seats validation
    if (formData.totalTables < 0) {
      errors.totalTables = 'Total tables cannot be negative';
    }
    if (formData.totalSeats < 0) {
      errors.totalSeats = 'Total seats cannot be negative';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleCreate = async () => {
    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }
    setIsSubmitting(true);
    try {
      await createBranch({
        name: formData.name.trim(),
        address: {
          street: formData.address.street.trim(),
          city: formData.address.city.trim(),
          state: formData.address.state?.trim() || undefined,
          country: formData.address.country.trim(),
          zipCode: formData.address.zipCode?.trim() || undefined,
        },
        phone: formData.phone?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        managerId: formData.managerId || undefined,
        openingHours: formData.openingHours,
        totalTables: formData.totalTables !== undefined && formData.totalTables !== null ? formData.totalTables : undefined,
        totalSeats: formData.totalSeats !== undefined && formData.totalSeats !== null ? formData.totalSeats : undefined,
        companyId,
      } as any).unwrap();
      toast.success('Branch created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      // Force refetch to ensure new branch appears immediately
      await refetch();
      // Scroll to top to see the new branch
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to create branch';
      toast.error(errorMessage);
      console.error('Create branch error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleEdit = async () => {
    if (!selectedBranch) return;
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateBranch({
        id: selectedBranch.id,
        data: {
          name: formData.name.trim(),
          address: {
            street: formData.address.street.trim(),
            city: formData.address.city.trim(),
            state: formData.address.state?.trim() || undefined,
            country: formData.address.country.trim(),
            zipCode: formData.address.zipCode?.trim() || undefined,
          },
          phone: formData.phone?.trim() || undefined,
          email: formData.email?.trim() || undefined,
          managerId: formData.managerId || undefined,
          openingHours: formData.openingHours,
          totalTables: formData.totalTables || undefined,
          totalSeats: formData.totalSeats || undefined,
        },
      }).unwrap();
      toast.success('Branch updated successfully');
      setIsEditModalOpen(false);
      setSelectedBranch(null);
      resetForm();
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to update branch';
      toast.error(errorMessage);
      console.error('Update branch error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDelete = async (branch: Branch) => {
    const isSuperAdmin = user?.role === 'super_admin';
    const isOwner = user?.role === 'owner';

    if (isSuperAdmin) {
      // Super admins can permanently delete branches
      if (!confirm(`⚠️ WARNING: As a Super Admin, this will PERMANENTLY DELETE "${branch.name}" and ALL related data. This action CANNOT be undone. Are you sure?`)) return;

      setPendingAction({ type: 'permanent-delete', data: branch });
      setIsPinModalOpen(true);
    } else if (isOwner) {
      // Owners soft delete branches (move to trash)
      if (!confirm(`Are you sure you want to delete "${branch.name}"? It will be moved to trash and can be restored later.`)) return;

      setPendingAction({ type: 'delete', data: branch });
      setIsPinModalOpen(true);
    } else {
      // Non-admins shouldn't reach here due to UI restrictions
      toast.error('You do not have permission to delete branches');
    }
  };

  const handleRestore = async (branch: Branch) => {
    if (!confirm(`Are you sure you want to restore "${branch.name}"?`)) return;

    try {
      await restoreBranch(branch.id).unwrap();
      toast.success('Branch restored successfully');
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to restore branch';
      toast.error(errorMessage);
      console.error('Restore branch error:', error);
    }
  };

  const handlePinVerificationSuccess = async () => {
    if (!pendingAction) return;

    const branch = pendingAction.data;

    try {
      if (pendingAction.type === 'delete') {
        await softDeleteBranch(branch.id).unwrap();
        toast.success('Branch moved to trash successfully');
      } else if (pendingAction.type === 'permanent-delete') {
        await permanentDeleteBranch(branch.id).unwrap();
        toast.success('Branch permanently deleted with all related data');
      } else if (pendingAction.type === 'toggle') {
        const action = branch.isActive ? 'deactivate' : 'activate';
        await toggleBranchStatus(branch.id).unwrap();
        toast.success(`Branch ${action}d successfully`);
      }
      refetch();
    } catch (error: any) {
      let action = '';
      if (pendingAction.type === 'delete') action = 'delete';
      else if (pendingAction.type === 'permanent-delete') action = 'permanently delete';
      else if (pendingAction.type === 'toggle') action = branch.isActive ? 'deactivate' : 'activate';

      const errorMessage = error?.data?.message || error?.message || `Failed to ${action} branch`;
      toast.error(errorMessage);
      console.error(`${action} branch error:`, error);
    } finally {
      setPendingAction(null);
    }
  };
  const handleToggleStatus = async (branch: Branch) => {
    const action = branch.isActive ? 'deactivate' : 'activate';

    // Check if user is admin (Super Admin or Owner)
    const isAdmin = user?.role === 'super_admin' || user?.role === 'owner';

    if (isAdmin) {
      // For admins, require PIN verification
      setPendingAction({ type: 'toggle', data: branch });
      setIsPinModalOpen(true);
    } else {
      // For non-admins, show regular confirmation (though they may not have permission due to backend guards)
      if (!confirm(`Are you sure you want to ${action} "${branch.name}"?`)) return;
      try {
        await toggleBranchStatus(branch.id).unwrap();
        toast.success(`Branch ${action}d successfully`);
        refetch();
      } catch (error: any) {
        const errorMessage = error?.data?.message || error?.message || `Failed to ${action} branch`;
        toast.error(errorMessage);
        console.error('Toggle branch status error:', error);
      }
    }
  };
  const openEditModal = (branch: Branch) => {
    setSelectedBranch(branch);
    // Handle both old and new address structures
    const address = typeof branch.address === 'object' && branch.address !== null && 'street' in branch.address
      ? branch.address
      : {
          street: typeof branch.address === 'string' ? branch.address : '',
          city: branch.city || '',
          state: branch.state || '',
          country: branch.country || 'BD',
          zipCode: branch.zipCode || '',
        };
    setFormData({
      name: branch.name,
      address: address as any,
      phone: branch.phoneNumber || (branch as any).phone || '',
      email: branch.email || '',
      managerId: branch.managerId || '',
      openingHours: (branch as any).openingHours || [
        { day: 'monday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'tuesday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'wednesday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'thursday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'friday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'saturday', open: '09:00', close: '21:00', isClosed: false },
        { day: 'sunday', open: '09:00', close: '21:00', isClosed: false },
      ],
      totalTables: (branch as any).totalTables !== undefined && (branch as any).totalTables !== null ? (branch as any).totalTables : 0,
      totalSeats: (branch as any).totalSeats !== undefined && (branch as any).totalSeats !== null ? (branch as any).totalSeats : 0,
      companyId: branch.companyId,
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };
  const openViewModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsViewModalOpen(true);
  };
  // Fetch full branch details and stats when viewing
  const { data: branchDetails, isLoading: isLoadingDetails, error: _detailsError } = useGetBranchByIdQuery(selectedBranch?.id || '', {
    skip: !selectedBranch?.id || !isViewModalOpen,
    refetchOnMountOrArgChange: true,
  });
  const { data: branchStats, isLoading: isLoadingStats, error: _statsError } = useGetBranchStatsQuery(selectedBranch?.id || '', {
    skip: !selectedBranch?.id || !isViewModalOpen,
    refetchOnMountOrArgChange: true,
  });
  // Use detailed branch data if available, otherwise fallback to selectedBranch
  // Also merge stats branch data if available (it has totalTables/totalSeats)
  const displayBranch = useMemo(() => {
    if (branchDetails) {
      // Use branchStats.stats for configured values (they come from branch.totalTables/totalSeats)
      // Use branchStats.branch for manager (populated from getStats)
      const mergedBranch = {
        ...branchDetails,
        // Merge totalTables and totalSeats from branchStats.stats (configured values)
        // Use the value from branchDetails first, then fallback to branchStats.stats
        // Note: 0 is a valid value (means 0 configured tables/seats), undefined/null means not set
        totalTables: branchDetails.totalTables !== undefined && branchDetails.totalTables !== null 
          ? branchDetails.totalTables 
          : (branchStats?.stats?.totalTables !== undefined && branchStats.stats.totalTables !== null 
              ? branchStats.stats.totalTables 
              : undefined),
        totalSeats: branchDetails.totalSeats !== undefined && branchDetails.totalSeats !== null 
          ? branchDetails.totalSeats 
          : (branchStats?.stats?.totalSeats !== undefined && branchStats.stats.totalSeats !== null 
              ? branchStats.stats.totalSeats 
              : undefined),
        // Merge manager from branchStats.branch if available
        manager: branchDetails.manager ?? branchStats?.branch?.manager ?? undefined,
      };
      return mergedBranch;
    }
    return selectedBranch;
  }, [branchDetails, branchStats, selectedBranch]);
  // Log for debugging
  useEffect(() => {
    if (isViewModalOpen && selectedBranch) {
      // Debug logging removed
    }
  }, [isViewModalOpen, selectedBranch, branchDetails, branchStats, displayBranch, isLoadingDetails, isLoadingStats, _detailsError, _statsError]);
  const columns = [
    {
      key: 'name',
      title: 'Branch Name',
      sortable: true,
      render: (value: string, row: Branch) => {
        const address = typeof row.address === 'object' && row.address !== null && 'city' in row.address
          ? row.address
          : { city: row.city || '', state: row.state || '' };
        const isCurrentBranch = currentBranchId && (row.id === currentBranchId || row.id === (currentBranchId as any)?._id);
        return (
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${isCurrentBranch ? 'bg-primary-500' : 'bg-primary-100 dark:bg-primary-900/30'} rounded-lg flex items-center justify-center relative`}>
              <BuildingOfficeIcon className={`w-5 h-5 ${isCurrentBranch ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`} />
              {isCurrentBranch && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 dark:text-white">{value}</p>
                {isCurrentBranch && (
                  <Badge variant="success" className="text-xs">
                    Current Branch
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {address.city}{address.state ? `, ${address.state}` : ''}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'address',
      title: 'Address',
      render: (value: any, row: Branch) => {
        const address = typeof row.address === 'object' && row.address !== null && 'street' in row.address
          ? row.address
          : {
              street: typeof row.address === 'string' ? row.address : '',
              city: row.city || '',
              state: row.state || '',
              zipCode: row.zipCode || '',
            };
        return (
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {address.street}, {address.city}{address.state ? `, ${address.state}` : ''} {address.zipCode || ''}
            </span>
          </div>
        );
      },
    },
    {
      key: 'phoneNumber',
      title: 'Contact',
      render: (value: string, row: Branch) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {value || (row as any).phone || 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{row.email || 'N/A'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'openingHours',
      title: 'Hours',
      render: (value: any, row: Branch) => {
        const branchWithHours = row as any;
        if (branchWithHours.openingHours && Array.isArray(branchWithHours.openingHours) && branchWithHours.openingHours.length > 0) {
          const firstDay = branchWithHours.openingHours[0];
          return (
            <div className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {firstDay.open} - {firstDay.close}
              </span>
            </div>
          );
        }
        // Fallback to old structure
        return (
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {branchWithHours.openingTime || '09:00'} - {branchWithHours.closingTime || '21:00'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value: boolean, row: Branch) => {
        const isCurrentBranch = currentBranchId && (row.id === currentBranchId || row.id === (currentBranchId as any)?._id);
        return (
          <div className="flex flex-col gap-1">
            <Badge variant={value ? 'success' : 'danger'}>
              {value ? 'Active' : 'Inactive'}
            </Badge>
            {isCurrentBranch && (
              <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                You are here
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: Branch) => (
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
            onClick={() => handleToggleStatus(row)}
            disabled={isToggling}
            className={row.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
            title={row.isActive ? 'Deactivate branch' : 'Activate branch'}
          >
            <PowerIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            disabled={isSoftDeleting}
            className="text-red-600 hover:text-red-700"
            title="Delete branch"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];
  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-96 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            No company selected
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            Please select a company to manage branches.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Branch Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your restaurant branches and locations
            {currentBranchId && data?.branches?.find(b => b.id === currentBranchId) && (
              <span className="ml-2 text-primary-600 dark:text-primary-400 font-medium">
                • Currently active: <strong className="text-primary-700 dark:text-primary-300">{data.branches.find(b => b.id === currentBranchId)?.name}</strong>
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto text-sm">
          <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          Add Branch
        </Button>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Branches</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate" title={(data?.total || 0).toLocaleString()}>
                  {(data?.total || 0).toLocaleString()}
                </p>
              </div>
              <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-primary-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Active Branches</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600 truncate" title={(data?.branches?.filter(b => b.isActive).length || 0).toLocaleString()}>
                  {(data?.branches?.filter(b => b.isActive).length || 0).toLocaleString()}
                </p>
              </div>
              <PowerIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Inactive Branches</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-red-600 truncate" title={(data?.branches?.filter(b => !b.isActive).length || 0).toLocaleString()}>
                  {(data?.branches?.filter(b => !b.isActive).length || 0).toLocaleString()}
                </p>
              </div>
              <PowerIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-red-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
      {/* Data Table */}
      <DataTable
        data={data?.branches || []}
        columns={columns}
        loading={isLoading}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil((data?.total || 0) / itemsPerPage),
          itemsPerPage,
          totalItems: data?.total || 0,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="branches"
        onExport={(_format, _items) => {
          // Export handler
          }}
        emptyMessage="No branches found. Create your first branch to get started."
      />
      {/* Create Branch Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create New Branch"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Branch Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Downtown Location"
              required
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>
          <Input
            label="Street Address"
            value={formData.address.street}
            onChange={(e) => setFormData({ 
              ...formData, 
              address: { ...formData.address, street: e.target.value }
            })}
            placeholder="123 Main Street"
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.address.city}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, city: e.target.value }
              })}
              placeholder="New York"
              required
            />
            <Input
              label="State"
              value={formData.address.state}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, state: e.target.value }
              })}
              placeholder="NY"
            />
            <Input
              label="ZIP Code"
              value={formData.address.zipCode}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, zipCode: e.target.value }
              })}
              placeholder="10001"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="branch@restaurant.com"
            />
            <Select
              label="Country"
              options={[
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'UK', label: 'United Kingdom' },
                { value: 'AU', label: 'Australia' },
              ]}
              value={formData.address.country}
              onChange={(value) => setFormData({ 
                ...formData, 
                address: { ...formData.address, country: value }
              })}
            />
          </div>
          {managers.length > 0 && (
            <Select
              label="Manager (Optional)"
              options={[
                { value: '', label: 'No Manager' },
                ...managers.map((m: Staff) => ({ 
                  value: m.id, 
                  label: `${m.firstName} ${m.lastName}` 
                }))
              ]}
              value={formData.managerId}
              onChange={(value) => setFormData({ ...formData, managerId: value })}
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Total Tables"
              type="number"
              min="0"
              value={formData.totalTables}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                setFormData({ ...formData, totalTables: value >= 0 ? value : 0 });
                if (formErrors.totalTables) {
                  setFormErrors({ ...formErrors, totalTables: '' });
                }
              }}
              onBlur={() => {
                if (formData.totalTables < 0) {
                  setFormErrors({ ...formErrors, totalTables: 'Total tables cannot be negative' });
                } else {
                  const { totalTables: _, ...rest } = formErrors;
                  setFormErrors(rest);
                }
              }}
              placeholder="0"
              error={formErrors.totalTables}
            />
            <Input
              label="Total Seats"
              type="number"
              min="0"
              value={formData.totalSeats}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                setFormData({ ...formData, totalSeats: value >= 0 ? value : 0 });
                if (formErrors.totalSeats) {
                  setFormErrors({ ...formErrors, totalSeats: '' });
                }
              }}
              onBlur={() => {
                if (formData.totalSeats < 0) {
                  setFormErrors({ ...formErrors, totalSeats: 'Total seats cannot be negative' });
                } else {
                  const { totalSeats: _, ...rest } = formErrors;
                  setFormErrors(rest);
                }
              }}
              placeholder="0"
              error={formErrors.totalSeats}
            />
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Opening Hours</h4>
            <div className="space-y-2">
              {formData.openingHours.map((day, index) => (
                <div key={day.day} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {day.day}
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!day.isClosed}
                        onChange={(e) => {
                          const updated = [...formData.openingHours];
                          updated[index] = { ...day, isClosed: !e.target.checked };
                          setFormData({ ...formData, openingHours: updated });
                          // Clear error when toggling closed
                          const errorKey = `openingHours.${index}`;
                          if (formErrors[errorKey]) {
                            const { [errorKey]: _, ...rest } = formErrors;
                            setFormErrors(rest);
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Open</span>
                    </label>
                    {!day.isClosed && (
                      <>
                        <Input
                          type="time"
                          value={day.open}
                          onChange={(e) => {
                            const updated = [...formData.openingHours];
                            updated[index] = { ...day, open: e.target.value };
                            setFormData({ ...formData, openingHours: updated });
                            // Clear error if both times are set and valid
                            const errorKey = `openingHours.${index}`;
                            if (formErrors[errorKey] && e.target.value && updated[index].close) {
                              if (e.target.value < updated[index].close) {
                                const { [errorKey]: _, ...rest } = formErrors;
                                setFormErrors(rest);
                              }
                            }
                          }}
                          onBlur={() => {
                            if (!day.open || !day.close) {
                              setFormErrors({ ...formErrors, [`openingHours.${index}`]: 'Opening and closing times are required' });
                            } else if (day.open >= day.close) {
                              setFormErrors({ ...formErrors, [`openingHours.${index}`]: 'Closing time must be after opening time' });
                            } else {
                              const { [`openingHours.${index}`]: _, ...rest } = formErrors;
                              setFormErrors(rest);
                            }
                          }}
                          className="flex-1"
                        />
                        <span className="text-gray-400">to</span>
                        <Input
                          type="time"
                          value={day.close}
                          onChange={(e) => {
                            const updated = [...formData.openingHours];
                            updated[index] = { ...day, close: e.target.value };
                            setFormData({ ...formData, openingHours: updated });
                            // Clear error if both times are set and valid
                            const errorKey = `openingHours.${index}`;
                            if (formErrors[errorKey] && updated[index].open && e.target.value) {
                              if (updated[index].open < e.target.value) {
                                const { [errorKey]: _, ...rest } = formErrors;
                                setFormErrors(rest);
                              }
                            }
                          }}
                          onBlur={() => {
                            if (!day.open || !day.close) {
                              setFormErrors({ ...formErrors, [`openingHours.${index}`]: 'Opening and closing times are required' });
                            } else if (day.open >= day.close) {
                              setFormErrors({ ...formErrors, [`openingHours.${index}`]: 'Closing time must be after opening time' });
                            } else {
                              const { [`openingHours.${index}`]: _, ...rest } = formErrors;
                              setFormErrors(rest);
                            }
                          }}
                          className="flex-1"
                        />
                      </>
                    )}
                  </div>
                  {formErrors[`openingHours.${index}`] && (
                    <p className="text-sm text-red-600 dark:text-red-400 ml-28">
                      {formErrors[`openingHours.${index}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting || isCreating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={isSubmitting || isCreating}
            >
              {isSubmitting || isCreating ? 'Creating...' : 'Create Branch'}
            </Button>
          </div>
        </div>
      </Modal>
      {/* Edit Branch Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedBranch(null);
          resetForm();
        }}
        title="Edit Branch"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          {Object.keys(formErrors).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Please fix the following errors:
                  </p>
                  <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                    {Object.entries(formErrors).map(([key, message]) => (
                      <li key={key}>{message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Branch Name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (formErrors.name) {
                  setFormErrors({ ...formErrors, name: '' });
                }
              }}
              onBlur={() => {
                if (!formData.name.trim()) {
                  setFormErrors({ ...formErrors, name: 'Branch name is required' });
                } else if (formData.name.trim().length < 2) {
                  setFormErrors({ ...formErrors, name: 'Branch name must be at least 2 characters' });
                } else {
                  const { name: _, ...rest } = formErrors;
                  setFormErrors(rest);
                }
              }}
              placeholder="e.g., Downtown Location"
              required
              error={formErrors.name}
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (formErrors.phone) {
                  setFormErrors({ ...formErrors, phone: '' });
                }
              }}
              onBlur={() => {
                if (formData.phone && !validatePhone(formData.phone)) {
                  setFormErrors({ ...formErrors, phone: 'Please enter a valid phone number' });
                } else {
                  const { phone: _, ...rest } = formErrors;
                  setFormErrors(rest);
                }
              }}
              placeholder="+1 (555) 123-4567"
              error={formErrors.phone}
            />
          </div>
          <Input
            label="Street Address"
            value={formData.address.street}
            onChange={(e) => {
              setFormData({ 
                ...formData, 
                address: { ...formData.address, street: e.target.value }
              });
              if (formErrors.street) {
                setFormErrors({ ...formErrors, street: '' });
              }
            }}
            onBlur={() => {
              if (!formData.address.street.trim()) {
                setFormErrors({ ...formErrors, street: 'Street address is required' });
              } else {
                const { street: _, ...rest } = formErrors;
                setFormErrors(rest);
              }
            }}
            placeholder="123 Main Street"
            required
            error={formErrors.street}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.address.city}
              onChange={(e) => {
                setFormData({ 
                  ...formData, 
                  address: { ...formData.address, city: e.target.value }
                });
                if (formErrors.city) {
                  setFormErrors({ ...formErrors, city: '' });
                }
              }}
              onBlur={() => {
                if (!formData.address.city.trim()) {
                  setFormErrors({ ...formErrors, city: 'City is required' });
                } else {
                  const { city: _, ...rest } = formErrors;
                  setFormErrors(rest);
                }
              }}
              placeholder="New York"
              required
              error={formErrors.city}
            />
            <Input
              label="State/Province"
              value={formData.address.state}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, state: e.target.value }
              })}
              placeholder="NY"
            />
            <Input
              label="ZIP/Postal Code"
              value={formData.address.zipCode}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, zipCode: e.target.value }
              })}
              placeholder="10001"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (formErrors.email) {
                  setFormErrors({ ...formErrors, email: '' });
                }
              }}
              onBlur={() => {
                if (formData.email && !validateEmail(formData.email)) {
                  setFormErrors({ ...formErrors, email: 'Please enter a valid email address' });
                } else {
                  const { email: _, ...rest } = formErrors;
                  setFormErrors(rest);
                }
              }}
              placeholder="branch@restaurant.com"
              error={formErrors.email}
            />
            <Select
              label="Country"
              options={[
                { value: 'BD', label: 'Bangladesh' },
                { value: 'IN', label: 'India' },
                { value: 'PK', label: 'Pakistan' },
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'UK', label: 'United Kingdom' },
                { value: 'AU', label: 'Australia' },
                { value: 'DE', label: 'Germany' },
                { value: 'FR', label: 'France' },
                { value: 'IT', label: 'Italy' },
                { value: 'ES', label: 'Spain' },
                { value: 'NL', label: 'Netherlands' },
                { value: 'BE', label: 'Belgium' },
                { value: 'CH', label: 'Switzerland' },
                { value: 'AT', label: 'Austria' },
                { value: 'SE', label: 'Sweden' },
                { value: 'NO', label: 'Norway' },
                { value: 'DK', label: 'Denmark' },
                { value: 'FI', label: 'Finland' },
                { value: 'PL', label: 'Poland' },
                { value: 'CZ', label: 'Czech Republic' },
                { value: 'GR', label: 'Greece' },
                { value: 'PT', label: 'Portugal' },
                { value: 'IE', label: 'Ireland' },
                { value: 'NZ', label: 'New Zealand' },
                { value: 'SG', label: 'Singapore' },
                { value: 'MY', label: 'Malaysia' },
                { value: 'TH', label: 'Thailand' },
                { value: 'PH', label: 'Philippines' },
                { value: 'ID', label: 'Indonesia' },
                { value: 'VN', label: 'Vietnam' },
                { value: 'AE', label: 'United Arab Emirates' },
                { value: 'SA', label: 'Saudi Arabia' },
                { value: 'ZA', label: 'South Africa' },
                { value: 'EG', label: 'Egypt' },
                { value: 'BR', label: 'Brazil' },
                { value: 'MX', label: 'Mexico' },
                { value: 'AR', label: 'Argentina' },
                { value: 'CL', label: 'Chile' },
                { value: 'CO', label: 'Colombia' },
                { value: 'JP', label: 'Japan' },
                { value: 'KR', label: 'South Korea' },
                { value: 'CN', label: 'China' },
                { value: 'HK', label: 'Hong Kong' },
                { value: 'TW', label: 'Taiwan' },
              ]}
              value={formData.address.country}
              onChange={(value) => {
                setFormData({ 
                  ...formData, 
                  address: { ...formData.address, country: value }
                });
                if (formErrors.country) {
                  setFormErrors({ ...formErrors, country: '' });
                }
              }}
              error={formErrors.country}
            />
          </div>
          <div>
            <Input
              label="Public URL Slug (Custom URL identifier)"
              value={(formData as any).slug || ''}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value } as any)}
              placeholder="branch-url-slug"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Custom slug for public URLs. Leave empty to auto-generate from branch name.
              Only lowercase letters, numbers, and hyphens allowed. Must be unique within the company.
            </p>
          </div>
          {managers.length > 0 && (
            <Select
              label="Manager (Optional)"
              options={[
                { value: '', label: 'No Manager' },
                ...managers.map((m: Staff) => ({ 
                  value: m.id, 
                  label: `${m.firstName} ${m.lastName}` 
                }))
              ]}
              value={formData.managerId}
              onChange={(value) => setFormData({ ...formData, managerId: value })}
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Total Tables"
              type="number"
              min="0"
              value={formData.totalTables}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                setFormData({ ...formData, totalTables: value >= 0 ? value : 0 });
                if (formErrors.totalTables) {
                  setFormErrors({ ...formErrors, totalTables: '' });
                }
              }}
              onBlur={() => {
                if (formData.totalTables < 0) {
                  setFormErrors({ ...formErrors, totalTables: 'Total tables cannot be negative' });
                } else {
                  const { totalTables: _, ...rest } = formErrors;
                  setFormErrors(rest);
                }
              }}
              placeholder="0"
              error={formErrors.totalTables}
            />
            <Input
              label="Total Seats"
              type="number"
              min="0"
              value={formData.totalSeats}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                setFormData({ ...formData, totalSeats: value >= 0 ? value : 0 });
                if (formErrors.totalSeats) {
                  setFormErrors({ ...formErrors, totalSeats: '' });
                }
              }}
              onBlur={() => {
                if (formData.totalSeats < 0) {
                  setFormErrors({ ...formErrors, totalSeats: 'Total seats cannot be negative' });
                } else {
                  const { totalSeats: _, ...rest } = formErrors;
                  setFormErrors(rest);
                }
              }}
              placeholder="0"
              error={formErrors.totalSeats}
            />
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Opening Hours</h4>
            <div className="space-y-2">
              {formData.openingHours.map((day, index) => (
                <div key={day.day} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                      {day.day}
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!day.isClosed}
                        onChange={(e) => {
                          const updated = [...formData.openingHours];
                          updated[index] = { ...day, isClosed: !e.target.checked };
                          setFormData({ ...formData, openingHours: updated });
                          // Clear error when toggling closed
                          const errorKey = `openingHours.${index}`;
                          if (formErrors[errorKey]) {
                            const { [errorKey]: _, ...rest } = formErrors;
                            setFormErrors(rest);
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Open</span>
                    </label>
                    {!day.isClosed && (
                      <>
                        <Input
                          type="time"
                          value={day.open}
                          onChange={(e) => {
                            const updated = [...formData.openingHours];
                            updated[index] = { ...day, open: e.target.value };
                            setFormData({ ...formData, openingHours: updated });
                            // Clear error if both times are set and valid
                            const errorKey = `openingHours.${index}`;
                            if (formErrors[errorKey] && e.target.value && updated[index].close) {
                              if (e.target.value < updated[index].close) {
                                const { [errorKey]: _, ...rest } = formErrors;
                                setFormErrors(rest);
                              }
                            }
                          }}
                          onBlur={() => {
                            if (!day.open || !day.close) {
                              setFormErrors({ ...formErrors, [`openingHours.${index}`]: 'Opening and closing times are required' });
                            } else if (day.open >= day.close) {
                              setFormErrors({ ...formErrors, [`openingHours.${index}`]: 'Closing time must be after opening time' });
                            } else {
                              const { [`openingHours.${index}`]: _, ...rest } = formErrors;
                              setFormErrors(rest);
                            }
                          }}
                          className="flex-1"
                        />
                        <span className="text-gray-400">to</span>
                        <Input
                          type="time"
                          value={day.close}
                          onChange={(e) => {
                            const updated = [...formData.openingHours];
                            updated[index] = { ...day, close: e.target.value };
                            setFormData({ ...formData, openingHours: updated });
                            // Clear error if both times are set and valid
                            const errorKey = `openingHours.${index}`;
                            if (formErrors[errorKey] && updated[index].open && e.target.value) {
                              if (updated[index].open < e.target.value) {
                                const { [errorKey]: _, ...rest } = formErrors;
                                setFormErrors(rest);
                              }
                            }
                          }}
                          onBlur={() => {
                            if (!day.open || !day.close) {
                              setFormErrors({ ...formErrors, [`openingHours.${index}`]: 'Opening and closing times are required' });
                            } else if (day.open >= day.close) {
                              setFormErrors({ ...formErrors, [`openingHours.${index}`]: 'Closing time must be after opening time' });
                            } else {
                              const { [`openingHours.${index}`]: _, ...rest } = formErrors;
                              setFormErrors(rest);
                            }
                          }}
                          className="flex-1"
                        />
                      </>
                    )}
                  </div>
                  {formErrors[`openingHours.${index}`] && (
                    <p className="text-sm text-red-600 dark:text-red-400 ml-28">
                      {formErrors[`openingHours.${index}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedBranch(null);
                resetForm();
              }}
              disabled={isSubmitting || isUpdating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleEdit}
              disabled={isSubmitting || isUpdating}
            >
              {isSubmitting || isUpdating ? 'Updating...' : 'Update Branch'}
            </Button>
          </div>
        </div>
      </Modal>
      {/* View Branch Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedBranch(null);
        }}
        title="Branch Details"
        className="max-w-2xl"
      >
        {(isLoadingDetails || isLoadingStats) && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">Loading branch details...</div>
          </div>
        )}
        {(_detailsError || _statsError) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error loading branch data
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {_detailsError ? 'Failed to load branch details' : ''}
                  {_statsError ? 'Failed to load branch statistics' : ''}
                </p>
              </div>
            </div>
          </div>
        )}
        {displayBranch && !isLoadingDetails && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {displayBranch.name}
                </h3>
                <Badge variant={displayBranch.isActive ? 'success' : 'danger'}>
                  {displayBranch.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {typeof displayBranch.address === 'object' && displayBranch.address !== null
                          ? `${displayBranch.address.street}, ${displayBranch.address.city}${displayBranch.address.state ? `, ${displayBranch.address.state}` : ''} ${displayBranch.address.zipCode || ''}`
                          : `${displayBranch.address || ''}${(displayBranch as any).city ? `, ${(displayBranch as any).city}` : ''}${(displayBranch as any).state ? `, ${(displayBranch as any).state}` : ''} ${(displayBranch as any).zipCode || ''}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {(displayBranch as any).phoneNumber || displayBranch.phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {displayBranch.email || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Operating Hours</h4>
                  <div className="space-y-2">
                    {(displayBranch as any).openingHours && Array.isArray((displayBranch as any).openingHours) && (displayBranch as any).openingHours.length > 0 ? (
                      <div className="space-y-1">
                        {(displayBranch as any).openingHours.map((day: any) => (
                          <div key={day.day} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="capitalize w-20">{day.day}:</span>
                            {day.isClosed ? (
                              <span className="text-gray-500">Closed</span>
                            ) : (
                              <span>{day.open} - {day.close}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <ClockIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {(displayBranch as any).openingTime || '09:00'} - {(displayBranch as any).closingTime || '21:00'}
                          </span>
                        </div>
                        {(displayBranch as any).timezone && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Timezone: {(displayBranch as any).timezone}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Capacity & Statistics</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {(displayBranch as any).totalTables !== undefined && (displayBranch as any).totalTables !== null ? (
                      <div>Configured Tables: {(displayBranch as any).totalTables}</div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">
                        Configured Tables: Not set
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                          (Edit branch to set this value)
                        </span>
                      </div>
                    )}
                    {(displayBranch as any).totalSeats !== undefined && (displayBranch as any).totalSeats !== null ? (
                      <div>Configured Seats: {(displayBranch as any).totalSeats}</div>
                    ) : (
                      <div className="text-gray-500 dark:text-gray-400">
                        Configured Seats: Not set
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                          (Edit branch to set this value)
                        </span>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="font-medium text-primary-600 dark:text-primary-400 mb-1">Actual Data:</div>
                      {isLoadingStats ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">Loading statistics...</div>
                      ) : branchStats?.stats ? (
                        <>
                          <div>Total Tables: {branchStats.stats.actualTablesCount ?? 0}</div>
                          <div>Total Staff/Users: {branchStats.stats.actualUsersCount ?? branchStats.stats.totalStaff ?? 0}</div>
                          <div>Total Orders: {branchStats.stats.totalOrders ?? 0}</div>
                          <div className="font-medium text-green-600 dark:text-green-400 mt-1">
                            Today's Revenue: ${(branchStats.stats.todayRevenue ?? 0).toFixed(2)}
                          </div>
                        </>
                      ) : branchStats ? (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          No statistics available
                          <div className="text-xs mt-1 text-yellow-600 dark:text-yellow-400">
                            Debug: branchStats exists but stats is missing. Check console for details.
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400">No statistics available</div>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Manager</h4>
                  {displayBranch?.manager ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {displayBranch.manager.firstName} {displayBranch.manager.lastName}
                      <br />
                      {displayBranch.manager.email}
                    </div>
                  ) : displayBranch?.managerId ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Manager ID: {typeof displayBranch.managerId === 'string' ? displayBranch.managerId : (displayBranch.managerId as any)?._id || (displayBranch.managerId as any)?.id}
                      <br />
                      <span className="text-xs text-yellow-600 dark:text-yellow-400">(Manager data not loaded - check backend populate)</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      No manager assigned
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Created: {formatDateTime(displayBranch.createdAt)}
                <br />
                Last updated: {formatDateTime(displayBranch.updatedAt)}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* PIN Verification Modal for Admin Actions */}
      <PinVerificationModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingAction(null);
        }}
        onSuccess={handlePinVerificationSuccess}
        title={pendingAction?.type === 'delete' ? 'Confirm Branch Deletion' : 'Confirm Branch Status Change'}
        description={
          pendingAction?.type === 'delete'
            ? `Please enter your PIN to confirm deletion of "${pendingAction?.data?.name}". This action cannot be undone.`
            : `Please enter your PIN to confirm ${pendingAction?.data?.isActive ? 'deactivation' : 'activation'} of "${pendingAction?.data?.name}".`
        }
      />
    </div>
  );
}
