'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { CreateCustomerRequest, Customer, useCreateCustomerMutation, useDeleteCustomerMutation, useGetCustomersQuery, useUpdateCustomerMutation } from '@/lib/api/endpoints/customersApi';
import { useAppSelector } from '@/lib/store';
import {
  GiftIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

const LOYALTY_TIERS = [
  { value: 'bronze', label: 'Bronze', minPoints: 0, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'silver', label: 'Silver', minPoints: 500, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  { value: 'gold', label: 'Gold', minPoints: 1000, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'platinum', label: 'Platinum', minPoints: 2000, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
];

export default function CustomersPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data, isLoading, refetch } = useGetCustomersQuery({
    branchId: user?.branchId || undefined,
    search: searchQuery || undefined,
    tier: tierFilter === 'all' ? undefined : tierFilter,
    page: currentPage,
    limit: itemsPerPage,
  });

  const [createCustomer] = useCreateCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();

  const [formData, setFormData] = useState<CreateCustomerRequest>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
    });
    setSelectedCustomer(null);
  };

  const handleCreate = async () => {
    try {
      await createCustomer(formData).unwrap();
      toast.success('Customer created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create customer');
    }
  };

  const handleEdit = async () => {
    if (!selectedCustomer) return;

    try {
      await updateCustomer({
        id: selectedCustomer.id,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
      }).unwrap();
      toast.success('Customer updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update customer');
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete "${customer.firstName} ${customer.lastName}"?`)) return;

    try {
      await deleteCustomer(customer.id).unwrap();
      toast.success('Customer deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete customer');
    }
  };

  const handleLoyaltyAdjustment = async (customerId: string, points: number, reason: string) => {
    try {
      await updateCustomer({
        id: customerId,
        loyaltyPoints: points,
      } as any).unwrap();
      toast.success(`Loyalty points ${points >= 0 ? 'added' : 'deducted'} successfully`);
      setIsLoyaltyModalOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to adjust loyalty points');
    }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phoneNumber: customer.phoneNumber || '',
    });
    setIsEditModalOpen(true);
  };

  const openLoyaltyModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsLoyaltyModalOpen(true);
  };

  const getLoyaltyTier = (points: number) => {
    return LOYALTY_TIERS.find(tier => points >= tier.minPoints) || LOYALTY_TIERS[0];
  };

  const getNextTier = (currentPoints: number) => {
    const currentTier = getLoyaltyTier(currentPoints);
    const currentTierIndex = LOYALTY_TIERS.findIndex(tier => tier.value === currentTier.value);
    return LOYALTY_TIERS[currentTierIndex + 1] || null;
  };

  const columns = [
    {
      key: 'name',
      title: 'Customer',
      sortable: true,
      render: (value: any, row: Customer) => (
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
      key: 'phoneNumber',
      title: 'Phone',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <PhoneIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value || 'Not provided'}
          </span>
        </div>
      ),
    },
    {
      key: 'loyaltyPoints',
      title: 'Loyalty Points',
      sortable: true,
      align: 'right' as const,
      render: (value: number) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">{value.toLocaleString()}</p>
          <div className="flex items-center gap-1 justify-end">
            <StarIcon className="w-4 h-4 text-yellow-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getLoyaltyTier(value).label}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'tier',
      title: 'Tier',
      render: (value: string) => {
        const tier = LOYALTY_TIERS.find(t => t.value === value);
        return (
          <Badge className={tier?.color}>
            {tier?.label || value}
          </Badge>
        );
      },
    },
    {
      key: 'createdAt',
      title: 'Joined',
      render: (value: string) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: Customer) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openLoyaltyModal(row)}
            className="text-purple-600 hover:text-purple-700"
          >
            <TrophyIcon className="w-4 h-4" />
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
    bronze: data?.customers?.filter(c => getLoyaltyTier(c.loyaltyPoints).value === 'bronze').length || 0,
    silver: data?.customers?.filter(c => getLoyaltyTier(c.loyaltyPoints).value === 'silver').length || 0,
    gold: data?.customers?.filter(c => getLoyaltyTier(c.loyaltyPoints).value === 'gold').length || 0,
    platinum: data?.customers?.filter(c => getLoyaltyTier(c.loyaltyPoints).value === 'platinum').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customer Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your customers and loyalty program
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <UsersIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {LOYALTY_TIERS.map((tier) => {
          const count = stats[tier.value as keyof typeof stats] || 0;
          return (
            <Card key={tier.value}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{tier.label}</p>
                    <p className={`text-2xl font-bold ${tier.color.replace('bg-', 'text-').replace('-100', '-800').replace('-900/30', '-400')}`}>
                      {count}
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tier.color}`}>
                    <TrophyIcon className="w-4 h-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Loyalty Program Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GiftIcon className="w-5 h-5" />
            Loyalty Program Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {LOYALTY_TIERS.map((tier) => {
              const count = stats[tier.value as keyof typeof stats] || 0;
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              const nextTier = getNextTier(tier.minPoints);

              return (
                <div key={tier.value} className="text-center">
                  <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${tier.color}`}>
                    <TrophyIcon className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {tier.label}
                  </h3>
                  <p className="text-2xl font-bold text-primary-600 mb-2">
                    {count}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {percentage.toFixed(1)}% of customers
                  </p>
                  {nextTier && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Next: {nextTier.label} ({nextTier.minPoints} pts)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Tiers' },
                  ...LOYALTY_TIERS.map(tier => ({ value: tier.value, label: tier.label })),
                ]}
                value={tierFilter}
                onChange={setTierFilter}
                placeholder="Filter by tier"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <DataTable
        data={data?.customers || []}
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
        exportFilename="customers"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} customers as ${format}`);
        }}
        emptyMessage="No customers found. Add your first customer to get started."
      />

      {/* Create Customer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Add New Customer"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Phone Number (Optional)"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
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
              Add Customer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Customer"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Phone Number (Optional)"
            value={formData.phoneNumber}
            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          />

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
              Update Customer
            </Button>
          </div>
        </div>
      </Modal>

      {/* Loyalty Management Modal */}
      <Modal
        isOpen={isLoyaltyModalOpen}
        onClose={() => setIsLoyaltyModalOpen(false)}
        title="Manage Loyalty Points"
        className="max-w-md"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full mx-auto mb-3 flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedCustomer.firstName} {selectedCustomer.lastName}
              </h3>
              <Badge className={getLoyaltyTier(selectedCustomer.loyaltyPoints).color}>
                {getLoyaltyTier(selectedCustomer.loyaltyPoints).label} Member
              </Badge>
            </div>

            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {selectedCustomer.loyaltyPoints.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Points</p>
            </div>

            {(() => {
              const nextTier = getNextTier(selectedCustomer.loyaltyPoints);
              if (nextTier) {
                const pointsNeeded = nextTier.minPoints - selectedCustomer.loyaltyPoints;
                return (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-400 text-center">
                      {pointsNeeded} more points to reach {nextTier.label}
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Points Adjustment
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => handleLoyaltyAdjustment(selectedCustomer.id, 100, 'Bonus points')}
                    className="flex-1"
                  >
                    +100 Points
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleLoyaltyAdjustment(selectedCustomer.id, 500, 'Reward')}
                    className="flex-1"
                  >
                    +500 Points
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleLoyaltyAdjustment(selectedCustomer.id, -50, 'Redemption')}
                    className="flex-1 text-red-600 hover:text-red-700"
                  >
                    -50 Points
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Points will be automatically calculated based on customer orders and redemptions
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}