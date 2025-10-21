'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Branch, CreateBranchRequest, useCreateBranchMutation, useDeleteBranchMutation, useGetBranchesQuery, useToggleBranchStatusMutation, useUpdateBranchMutation } from '@/lib/api/endpoints/branchesApi';
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

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

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

  const [formData, setFormData] = useState<CreateBranchRequest>({
    name: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phoneNumber: '',
    email: '',
    managerId: '',
    openingTime: '09:00',
    closingTime: '21:00',
    timezone: 'America/New_York',
    companyId: companyContext?.companyId || '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
      phoneNumber: '',
      email: '',
      managerId: '',
      openingTime: '09:00',
      closingTime: '21:00',
      timezone: 'America/New_York',
      companyId: companyContext?.companyId || '',
    });
  };

  const handleCreate = async () => {
    try {
      await createBranch(formData).unwrap();
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
        data: formData,
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
    setFormData({
      name: branch.name,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      zipCode: branch.zipCode,
      country: branch.country,
      phoneNumber: branch.phoneNumber,
      email: branch.email,
      managerId: branch.managerId || '',
      openingTime: branch.openingTime,
      closingTime: branch.closingTime,
      timezone: branch.timezone,
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
      render: (value: string, row: Branch) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <BuildingOfficeIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{row.city}, {row.state}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'address',
      title: 'Address',
      render: (value: string, row: Branch) => (
        <div className="flex items-center gap-2">
          <MapPinIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value}, {row.city}, {row.state} {row.zipCode}
          </span>
        </div>
      ),
    },
    {
      key: 'phoneNumber',
      title: 'Contact',
      render: (value: string, row: Branch) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
          </div>
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{row.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'openingTime',
      title: 'Hours',
      render: (value: string, row: Branch) => (
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value} - {row.closingTime}
          </span>
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
        className="max-w-2xl"
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
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="(555) 123-4567"
              required
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Main Street"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="New York"
              required
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="NY"
              required
            />
            <Input
              label="ZIP Code"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              placeholder="10001"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="branch@restaurant.com"
              required
            />
            <Select
              label="Country"
              options={[
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'UK', label: 'United Kingdom' },
                { value: 'AU', label: 'Australia' },
              ]}
              value={formData.country}
              onChange={(value) => setFormData({ ...formData, country: value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Opening Time"
              type="time"
              value={formData.openingTime}
              onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
              required
            />
            <Input
              label="Closing Time"
              type="time"
              value={formData.closingTime}
              onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
              required
            />
          </div>

          <Select
            label="Timezone"
            options={TIMEZONES}
            value={formData.timezone}
            onChange={(value) => setFormData({ ...formData, timezone: value })}
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
        className="max-w-2xl"
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
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="(555) 123-4567"
              required
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="123 Main Street"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="New York"
              required
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="NY"
              required
            />
            <Input
              label="ZIP Code"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              placeholder="10001"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="branch@restaurant.com"
              required
            />
            <Select
              label="Country"
              options={[
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'UK', label: 'United Kingdom' },
                { value: 'AU', label: 'Australia' },
              ]}
              value={formData.country}
              onChange={(value) => setFormData({ ...formData, country: value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Opening Time"
              type="time"
              value={formData.openingTime}
              onChange={(e) => setFormData({ ...formData, openingTime: e.target.value })}
              required
            />
            <Input
              label="Closing Time"
              type="time"
              value={formData.closingTime}
              onChange={(e) => setFormData({ ...formData, closingTime: e.target.value })}
              required
            />
          </div>

          <Select
            label="Timezone"
            options={TIMEZONES}
            value={formData.timezone}
            onChange={(value) => setFormData({ ...formData, timezone: value })}
          />

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
                        {selectedBranch.address}, {selectedBranch.city}, {selectedBranch.state} {selectedBranch.zipCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedBranch.phoneNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedBranch.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Operating Hours</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedBranch.openingTime} - {selectedBranch.closingTime}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Timezone: {selectedBranch.timezone}
                    </div>
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
