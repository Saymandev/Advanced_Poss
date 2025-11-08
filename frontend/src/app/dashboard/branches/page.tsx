'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Branch, useCreateBranchMutation, useDeleteBranchMutation, useGetBranchesQuery, useToggleBranchStatusMutation, useUpdateBranchMutation } from '@/lib/api/endpoints/branchesApi';
import { Staff, useGetStaffQuery } from '@/lib/api/endpoints/staffApi';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
  BuildingOfficeIcon,
  ClockIcon,
  EnvelopeIcon,
  EyeIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  PowerIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function BranchesPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data, isLoading, refetch } = useGetBranchesQuery({
    companyId: companyContext?.companyId,
    search: searchQuery || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    page: currentPage,
    limit: itemsPerPage,
  });

  const [createBranch] = useCreateBranchMutation();
  const [updateBranch] = useUpdateBranchMutation();
  const [deleteBranch] = useDeleteBranchMutation();
  const [toggleBranchStatus] = useToggleBranchStatusMutation();

  // Get staff for manager selection
  const { data: staffData } = useGetStaffQuery({ branchId: user?.branchId || undefined });
  
  const managers = staffData?.staff?.filter((s: Staff) => s.role === 'manager' && s.isActive) || [];

  const [formData, setFormData] = useState({
    name: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'US',
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
    companyId: companyContext?.companyId || '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: 'US',
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
      companyId: companyContext?.companyId || '',
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Branch name is required');
      return;
    }
    if (!formData.address.street.trim() || !formData.address.city.trim() || !formData.address.country.trim()) {
      toast.error('Address information is required');
      return;
    }
    if (!companyContext?.companyId) {
      toast.error('Company ID is required');
      return;
    }

    try {
      await createBranch({
        ...formData,
        companyId: companyContext.companyId,
      } as any).unwrap();
      toast.success('Branch created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create branch');
    }
  };

  const handleEdit = async () => {
    if (!selectedBranch) return;

    try {
      await updateBranch({
        id: selectedBranch.id,
        data: {
          name: formData.name,
          address: formData.address,
          phone: formData.phone || undefined,
          email: formData.email || undefined,
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
      toast.error(error.data?.message || 'Failed to update branch');
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`Are you sure you want to delete "${branch.name}"?`)) return;

    try {
      await deleteBranch(branch.id).unwrap();
      toast.success('Branch deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete branch');
    }
  };

  const handleToggleStatus = async (branch: Branch) => {
    try {
      await toggleBranchStatus(branch.id).unwrap();
      toast.success(`Branch ${branch.isActive ? 'deactivated' : 'activated'} successfully`);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to toggle branch status');
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
          country: branch.country || 'US',
          zipCode: branch.zipCode || '',
        };

    setFormData({
      name: branch.name,
      address: address as any,
      phone: branch.phoneNumber || '',
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
      totalTables: (branch as any).totalTables || 0,
      totalSeats: (branch as any).totalSeats || 0,
      companyId: branch.companyId,
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setIsViewModalOpen(true);
  };

  const columns = [
    {
      key: 'name',
      title: 'Branch Name',
      sortable: true,
      render: (value: string, row: Branch) => {
        const address = typeof row.address === 'object' && row.address !== null && 'city' in row.address
          ? row.address
          : { city: row.city || '', state: row.state || '' };
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <BuildingOfficeIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">{value}</p>
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
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'danger'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      ),
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
            className={row.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
          >
            <PowerIcon className="w-4 h-4" />
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Branch Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your restaurant branches and locations
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Branch
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Branches</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {data?.total || 0}
                </p>
              </div>
              <BuildingOfficeIcon className="w-8 h-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Branches</p>
                <p className="text-3xl font-bold text-green-600">
                  {data?.branches?.filter(b => b.isActive).length || 0}
                </p>
              </div>
              <PowerIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inactive Branches</p>
                <p className="text-3xl font-bold text-red-600">
                  {data?.branches?.filter(b => !b.isActive).length || 0}
                </p>
              </div>
              <PowerIcon className="w-8 h-8 text-red-600" />
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
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} branches as ${format}`);
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
              value={formData.totalTables}
              onChange={(e) => setFormData({ ...formData, totalTables: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
            <Input
              label="Total Seats"
              type="number"
              value={formData.totalSeats}
              onChange={(e) => setFormData({ ...formData, totalSeats: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Opening Hours</h4>
            <div className="space-y-2">
              {formData.openingHours.map((day, index) => (
                <div key={day.day} className="flex items-center gap-2">
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
                        }}
                        className="flex-1"
                      />
                    </>
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
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create Branch
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
              value={formData.totalTables}
              onChange={(e) => setFormData({ ...formData, totalTables: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
            <Input
              label="Total Seats"
              type="number"
              value={formData.totalSeats}
              onChange={(e) => setFormData({ ...formData, totalSeats: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Opening Hours</h4>
            <div className="space-y-2">
              {formData.openingHours.map((day, index) => (
                <div key={day.day} className="flex items-center gap-2">
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
                        }}
                        className="flex-1"
                      />
                    </>
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
            >
              Cancel
            </Button>
            <Button onClick={handleEdit}>
              Update Branch
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
        {selectedBranch && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                <BuildingOfficeIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedBranch.name}
                </h3>
                <Badge variant={selectedBranch.isActive ? 'success' : 'danger'}>
                  {selectedBranch.isActive ? 'Active' : 'Inactive'}
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
                        {typeof selectedBranch.address === 'object' && selectedBranch.address !== null
                          ? `${selectedBranch.address.street}, ${selectedBranch.address.city}${selectedBranch.address.state ? `, ${selectedBranch.address.state}` : ''} ${selectedBranch.address.zipCode || ''}`
                          : `${selectedBranch.address || ''}${selectedBranch.city ? `, ${selectedBranch.city}` : ''}${selectedBranch.state ? `, ${selectedBranch.state}` : ''} ${selectedBranch.zipCode || ''}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedBranch.phoneNumber || (selectedBranch as any).phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedBranch.email || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Operating Hours</h4>
                  <div className="space-y-2">
                    {(selectedBranch as any).openingHours && Array.isArray((selectedBranch as any).openingHours) && (selectedBranch as any).openingHours.length > 0 ? (
                      <div className="space-y-1">
                        {(selectedBranch as any).openingHours.map((day: any) => (
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
                            {(selectedBranch as any).openingTime || '09:00'} - {(selectedBranch as any).closingTime || '21:00'}
                          </span>
                        </div>
                        {(selectedBranch as any).timezone && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Timezone: {(selectedBranch as any).timezone}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Capacity</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {(selectedBranch as any).totalTables !== undefined && (
                      <div>Tables: {(selectedBranch as any).totalTables}</div>
                    )}
                    {(selectedBranch as any).totalSeats !== undefined && (
                      <div>Seats: {(selectedBranch as any).totalSeats}</div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Manager</h4>
                  {selectedBranch.manager ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedBranch.manager.firstName} {selectedBranch.manager.lastName}
                      <br />
                      {selectedBranch.manager.email}
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
                Created: {formatDateTime(selectedBranch.createdAt)}
                <br />
                Last updated: {formatDateTime(selectedBranch.updatedAt)}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
