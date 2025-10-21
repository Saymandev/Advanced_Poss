'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { CreateSupplierRequest, Supplier, useCreateSupplierMutation, useDeleteSupplierMutation, useGetSuppliersQuery, useToggleSupplierStatusMutation, useUpdateSupplierMutation } from '@/lib/api/endpoints/suppliersApi';
import { useAppSelector } from '@/lib/store';
import {
    BuildingOfficeIcon,
    EnvelopeIcon,
    MapPinIcon,
    PencilIcon,
    PhoneIcon,
    PlusIcon,
    PowerIcon,
    StarIcon,
    TrashIcon,
    TruckIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data, isLoading, refetch } = useGetSuppliersQuery({
    branchId: user?.branchId || undefined,
    search: searchQuery || undefined,
    isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
    rating: ratingFilter === 'all' ? undefined : parseInt(ratingFilter),
    page: currentPage,
    limit: itemsPerPage,
  });

  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();
  const [toggleSupplierStatus] = useToggleSupplierStatusMutation();

  const [formData, setFormData] = useState<CreateSupplierRequest>({
    name: '',
    contactPerson: '',
    email: '',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    website: '',
    taxId: '',
    paymentTerms: 'Net 30',
    leadTime: 7,
    minimumOrder: 100,
    rating: 5,
    notes: '',
    branchId: user?.branchId || '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      contactPerson: '',
      email: '',
      phoneNumber: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
      website: '',
      taxId: '',
      paymentTerms: 'Net 30',
      leadTime: 7,
      minimumOrder: 100,
      rating: 5,
      notes: '',
      branchId: user?.branchId || '',
    });
    setSelectedSupplier(null);
  };

  const handleCreate = async () => {
    try {
      await createSupplier(formData).unwrap();
      toast.success('Supplier created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create supplier');
    }
  };

  const handleEdit = async () => {
    if (!selectedSupplier) return;

    try {
      await updateSupplier({
        id: selectedSupplier.id,
        data: formData,
      }).unwrap();
      toast.success('Supplier updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update supplier');
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Are you sure you want to delete "${supplier.name}"?`)) return;

    try {
      await deleteSupplier(supplier.id).unwrap();
      toast.success('Supplier deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete supplier');
    }
  };

  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      await toggleSupplierStatus(supplier.id).unwrap();
      toast.success(`Supplier ${supplier.isActive ? 'deactivated' : 'activated'} successfully`);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to toggle supplier status');
    }
  };

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phoneNumber: supplier.phoneNumber,
      address: supplier.address,
      city: supplier.city,
      state: supplier.state,
      zipCode: supplier.zipCode,
      country: supplier.country,
      website: supplier.website || '',
      taxId: supplier.taxId || '',
      paymentTerms: supplier.paymentTerms,
      leadTime: supplier.leadTime,
      minimumOrder: supplier.minimumOrder,
      rating: supplier.rating,
      notes: supplier.notes || '',
      branchId: supplier.branchId,
    });
    setIsEditModalOpen(true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const columns = [
    {
      key: 'name',
      title: 'Supplier',
      sortable: true,
      render: (value: string, row: Supplier) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <TruckIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{row.contactPerson}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      title: 'Contact',
      render: (value: string, row: Supplier) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
          </div>
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{row.phoneNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'address',
      title: 'Location',
      render: (value: string, row: Supplier) => (
        <div className="flex items-center gap-2">
          <MapPinIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value}, {row.city}, {row.state}
          </span>
        </div>
      ),
    },
    {
      key: 'rating',
      title: 'Rating',
      align: 'center' as const,
      render: (value: number) => (
        <div className="flex items-center justify-center gap-1">
          {renderStars(value)}
          <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
            ({value})
          </span>
        </div>
      ),
    },
    {
      key: 'paymentTerms',
      title: 'Payment Terms',
      render: (value: string) => (
        <Badge variant="secondary">{value}</Badge>
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
      render: (value: any, row: Supplier) => (
        <div className="flex items-center gap-2">
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

  const stats = {
    total: data?.total || 0,
    active: data?.suppliers?.filter(s => s.isActive).length || 0,
    topRated: data?.suppliers?.filter(s => s.rating >= 4).length || 0,
    avgRating: data?.suppliers?.length ? (data.suppliers.reduce((sum, s) => sum + s.rating, 0) / data.suppliers.length).toFixed(1) : '0',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Supplier Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your suppliers and vendor relationships
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Suppliers</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <TruckIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Suppliers</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <BuildingOfficeIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Top Rated</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.topRated}</p>
              </div>
              <StarIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
                <p className="text-3xl font-bold text-purple-600">{stats.avgRating}⭐</p>
              </div>
              <StarIcon className="w-8 h-8 text-purple-600" />
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
                placeholder="Search suppliers..."
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
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Ratings' },
                  { value: '5', label: '5 Stars' },
                  { value: '4', label: '4+ Stars' },
                  { value: '3', label: '3+ Stars' },
                ]}
                value={ratingFilter}
                onChange={setRatingFilter}
                placeholder="Filter by rating"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <DataTable
        data={data?.suppliers || []}
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
        exportFilename="suppliers"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} suppliers as ${format}`);
        }}
        emptyMessage="No suppliers found. Add your first supplier to get started."
      />

      {/* Create Supplier Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Add New Supplier"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Supplier Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              required
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              required
            />
            <Input
              label="ZIP Code"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Country"
              options={[
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'MX', label: 'Mexico' },
                { value: 'UK', label: 'United Kingdom' },
                { value: 'DE', label: 'Germany' },
                { value: 'FR', label: 'France' },
                { value: 'IT', label: 'Italy' },
                { value: 'ES', label: 'Spain' },
                { value: 'CN', label: 'China' },
                { value: 'JP', label: 'Japan' },
                { value: 'IN', label: 'India' },
              ]}
              value={formData.country}
              onChange={(value) => setFormData({ ...formData, country: value })}
            />
            <Input
              label="Website (Optional)"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://supplier.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Tax ID (Optional)"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
            />
            <Select
              label="Payment Terms"
              options={[
                { value: 'Net 15', label: 'Net 15' },
                { value: 'Net 30', label: 'Net 30' },
                { value: 'Net 45', label: 'Net 45' },
                { value: 'Net 60', label: 'Net 60' },
                { value: 'Cash on Delivery', label: 'Cash on Delivery' },
                { value: 'Prepaid', label: 'Prepaid' },
              ]}
              value={formData.paymentTerms}
              onChange={(value) => setFormData({ ...formData, paymentTerms: value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rating (1-5)
              </label>
              <Select
                options={[
                  { value: '5', label: '⭐⭐⭐⭐⭐ Excellent' },
                  { value: '4', label: '⭐⭐⭐⭐ Very Good' },
                  { value: '3', label: '⭐⭐⭐ Good' },
                  { value: '2', label: '⭐⭐ Fair' },
                  { value: '1', label: '⭐ Poor' },
                ]}
                value={formData.rating.toString()}
                onChange={(value) => setFormData({ ...formData, rating: parseInt(value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Lead Time (days)"
              type="number"
              value={formData.leadTime}
              onChange={(e) => setFormData({ ...formData, leadTime: parseInt(e.target.value) || 0 })}
              required
            />
            <Input
              label="Minimum Order ($)"
              type="number"
              value={formData.minimumOrder}
              onChange={(e) => setFormData({ ...formData, minimumOrder: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full"
              placeholder="Additional notes about this supplier..."
            />
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
              Add Supplier
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Supplier Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Supplier"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Supplier Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              required
            />
          </div>

          <Input
            label="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
            <Input
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              required
            />
            <Input
              label="ZIP Code"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Country"
              options={[
                { value: 'US', label: 'United States' },
                { value: 'CA', label: 'Canada' },
                { value: 'MX', label: 'Mexico' },
                { value: 'UK', label: 'United Kingdom' },
                { value: 'DE', label: 'Germany' },
                { value: 'FR', label: 'France' },
                { value: 'IT', label: 'Italy' },
                { value: 'ES', label: 'Spain' },
                { value: 'CN', label: 'China' },
                { value: 'JP', label: 'Japan' },
                { value: 'IN', label: 'India' },
              ]}
              value={formData.country}
              onChange={(value) => setFormData({ ...formData, country: value })}
            />
            <Input
              label="Website (Optional)"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://supplier.com"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Tax ID (Optional)"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
            />
            <Select
              label="Payment Terms"
              options={[
                { value: 'Net 15', label: 'Net 15' },
                { value: 'Net 30', label: 'Net 30' },
                { value: 'Net 45', label: 'Net 45' },
                { value: 'Net 60', label: 'Net 60' },
                { value: 'Cash on Delivery', label: 'Cash on Delivery' },
                { value: 'Prepaid', label: 'Prepaid' },
              ]}
              value={formData.paymentTerms}
              onChange={(value) => setFormData({ ...formData, paymentTerms: value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rating (1-5)
              </label>
              <Select
                options={[
                  { value: '5', label: '⭐⭐⭐⭐⭐ Excellent' },
                  { value: '4', label: '⭐⭐⭐⭐ Very Good' },
                  { value: '3', label: '⭐⭐⭐ Good' },
                  { value: '2', label: '⭐⭐ Fair' },
                  { value: '1', label: '⭐ Poor' },
                ]}
                value={formData.rating.toString()}
                onChange={(value) => setFormData({ ...formData, rating: parseInt(value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Lead Time (days)"
              type="number"
              value={formData.leadTime}
              onChange={(e) => setFormData({ ...formData, leadTime: parseInt(e.target.value) || 0 })}
              required
            />
            <Input
              label="Minimum Order ($)"
              type="number"
              value={formData.minimumOrder}
              onChange={(e) => setFormData({ ...formData, minimumOrder: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full"
              placeholder="Additional notes about this supplier..."
            />
          </div>

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
              Update Supplier
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
