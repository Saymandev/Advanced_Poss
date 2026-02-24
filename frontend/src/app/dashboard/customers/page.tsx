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
import { CreateCustomerRequest, Customer, useCreateCustomerMutation, useDeleteCustomerMutation, useGetCustomerByIdQuery, useGetCustomerLoyaltyHistoryQuery, useGetCustomerOrdersQuery, useGetCustomersQuery, useUpdateCustomerMutation, useUpdateLoyaltyPointsMutation } from '@/lib/api/endpoints/customersApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
    EyeIcon,
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
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const LOYALTY_TIERS = [
  { value: 'bronze', label: 'Bronze', minPoints: 0, color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'silver', label: 'Silver', minPoints: 500, color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  { value: 'gold', label: 'Gold', minPoints: 1000, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'platinum', label: 'Platinum', minPoints: 2000, color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
];

export default function CustomersPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  
  // Redirect if user doesn't have customer-management feature (auto-redirects to role-specific dashboard)
  useFeatureRedirect('customer-management');
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [loyaltyPointsChange, setLoyaltyPointsChange] = useState(0);
  const [loyaltyReason, setLoyaltyReason] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const companyId = (user as any)?.companyId || 
                   (companyContext as any)?.companyId;
  
  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  const queryParams = useMemo(() => {
    const params: any = {
      page: currentPage,
      limit: itemsPerPage,
    };
    
    if (branchId) params.branchId = branchId;
    if (companyId) params.companyId = companyId;
    if (searchQuery) params.search = searchQuery;
    
    return params;
  }, [branchId, companyId, searchQuery, currentPage, itemsPerPage]);

  const { data: customersResponse, isLoading, error, refetch } = useGetCustomersQuery(queryParams, { 
    skip: !branchId && !companyId,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });

  const { data: selectedCustomerData, refetch: refetchCustomerData } = useGetCustomerByIdQuery(selectedCustomerId, {
    skip: !selectedCustomerId || !isViewModalOpen,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  const { data: customerOrdersData, refetch: refetchCustomerOrders } = useGetCustomerOrdersQuery(selectedCustomerId, {
    skip: !selectedCustomerId || !isViewModalOpen,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  // Refetch customer data when modal opens to ensure fresh data
  useEffect(() => {
    if (isViewModalOpen && selectedCustomerId) {
      refetchCustomerData();
      refetchCustomerOrders();
    }
  }, [isViewModalOpen, selectedCustomerId, refetchCustomerData, refetchCustomerOrders]);

  const { data: loyaltyHistoryData } = useGetCustomerLoyaltyHistoryQuery(selectedCustomerId, {
    skip: !selectedCustomerId || !isLoyaltyModalOpen,
  });

  const [createCustomer, { isLoading: isCreating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();
  const [updateLoyaltyPoints] = useUpdateLoyaltyPointsMutation();

  // Extract customers from API response
  const customers = useMemo(() => {
    if (!customersResponse) return [];
    
    const response = customersResponse as any;
    let items = [];
    
    if (response.data) {
      items = response.data.customers || response.data.items || [];
    } else if (Array.isArray(response)) {
      items = response;
    } else {
      items = response.customers || response.items || [];
    }
    
    if (!Array.isArray(items)) return [];
    
    return items.map((customer: any) => ({
      id: customer._id || customer.id,
      firstName: customer.firstName || '',
      lastName: customer.lastName || '',
      email: customer.email || '',
      phoneNumber: customer.phone || customer.phoneNumber || '',
      dateOfBirth: customer.dateOfBirth,
      address: customer.address,
      loyaltyPoints: customer.loyaltyPoints || 0,
      tier: customer.loyaltyTier || customer.tier || 'bronze',
      totalOrders: customer.totalOrders || 0,
      totalSpent: customer.totalSpent || 0,
      lastOrderDate: customer.lastOrderDate,
      preferences: customer.preferences,
      notes: customer.notes,
      isActive: customer.isActive !== undefined ? customer.isActive : true,
      isVIP: customer.isVIP || false,
      createdAt: customer.createdAt || new Date().toISOString(),
      updatedAt: customer.updatedAt || new Date().toISOString(),
    }));
  }, [customersResponse]);

  const totalCustomers = useMemo(() => {
    const response = customersResponse as any;
    if (response?.data?.total) return response.data.total;
    if (response?.total) return response.total;
    return customers.length;
  }, [customersResponse, customers.length]);

  // Update selected customer when data loads
  useEffect(() => {
    if (selectedCustomerData && selectedCustomerId) {
      const customerData = selectedCustomerData as any;
      setSelectedCustomer({
        id: customerData._id || customerData.id,
        firstName: customerData.firstName || '',
        lastName: customerData.lastName || '',
        email: customerData.email || '',
        phoneNumber: customerData.phone || customerData.phoneNumber || '',
        dateOfBirth: customerData.dateOfBirth,
        address: customerData.address,
        loyaltyPoints: customerData.loyaltyPoints || 0,
        tier: customerData.loyaltyTier || customerData.tier || 'bronze',
        totalOrders: customerData.totalOrders || 0,
        totalSpent: customerData.totalSpent || 0,
        lastOrderDate: customerData.lastOrderDate,
        preferences: customerData.preferences,
        notes: customerData.notes,
        isActive: customerData.isActive !== undefined ? customerData.isActive : true,
        createdAt: customerData.createdAt || new Date().toISOString(),
        updatedAt: customerData.updatedAt || new Date().toISOString(),
      } as Customer);
    }
  }, [selectedCustomerData, selectedCustomerId]);

  const [formData, setFormData] = useState<CreateCustomerRequest>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isCreateModalOpen, isEditModalOpen]);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
    });
    setSelectedCustomer(null);
    setSelectedCustomerId('');
    setFormErrors({});
  };

  const validateForm = (): boolean => {
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

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!companyId) {
      toast.error('Company ID is missing');
      return;
    }

    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        companyId, // Backend expects 'companyId'
      };
      
      // Only include phone if provided (now optional)
      if (formData.phone && formData.phone.trim()) {
        payload.phone = formData.phone.trim();
      }
      
      // Include branchId if available (now supported by CreateCustomerDto)
      if (branchId) {
        payload.branchId = branchId;
      }
      
      // Only include optional fields if they have values
      if (formData.dateOfBirth) payload.dateOfBirth = formData.dateOfBirth;
      if (formData.address) payload.address = formData.address;
      if (formData.preferences) payload.preferences = formData.preferences;
      if (formData.notes) payload.notes = formData.notes;
      
      await createCustomer(payload).unwrap();
      toast.success('Customer created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      
      // Force refetch immediately and after a short delay to ensure cache is updated
      refetch();
      setTimeout(() => {
        refetch();
      }, 300);
    } catch (error: any) {
      let errorMessage = error?.data?.message || error?.message || 'Failed to create customer';
      
      // Handle duplicate key error more gracefully
      if (errorMessage.includes('E11000') || errorMessage.includes('duplicate key')) {
        if (errorMessage.includes('email')) {
          errorMessage = 'A customer with this email already exists';
          setFormErrors({ email: 'This email is already registered' });
        } else if (errorMessage.includes('phone')) {
          errorMessage = 'A customer with this phone number already exists';
          setFormErrors({ phone: 'This phone number is already registered' });
        } else {
          errorMessage = 'This customer already exists';
        }
      }
      
      toast.error(errorMessage);
      
      // Set field-specific errors if available
      if (error?.data?.errors) {
        setFormErrors(error.data.errors);
      }
    }
  };

  const handleEdit = async () => {
    if (!selectedCustomer) {
      toast.error('No customer selected');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      await updateCustomer({
        id: selectedCustomer.id,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      }).unwrap();
      toast.success('Customer updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to update customer';
      toast.error(errorMessage);
      
      // Set field-specific errors if available
      if (error?.data?.errors) {
        setFormErrors(error.data.errors);
      }
    }
  };

  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete "${customer.firstName} ${customer.lastName}"? This action cannot be undone.`)) return;

    try {
      await deleteCustomer(customer.id).unwrap();
      toast.success('Customer deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to delete customer');
    }
  };

  const handleLoyaltyAdjustment = async () => {
    if (!selectedCustomer) return;
    if (!loyaltyPointsChange || !loyaltyReason.trim()) {
      toast.error('Please enter points and reason');
      return;
    }

    try {
      await updateLoyaltyPoints({
        customerId: selectedCustomer.id,
        points: Math.abs(loyaltyPointsChange),
        type: loyaltyPointsChange > 0 ? 'add' : 'subtract',
        description: loyaltyReason,
      }).unwrap();
      toast.success(`Loyalty points ${loyaltyPointsChange >= 0 ? 'added' : 'deducted'} successfully`);
      setIsLoyaltyModalOpen(false);
      setLoyaltyPointsChange(0);
      setLoyaltyReason('');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to adjust loyalty points');
    }
  };

  const handleQuickLoyaltyAdjustment = async (customerId: string, points: number, reason: string) => {
    try {
      await updateLoyaltyPoints({
        customerId,
        points: Math.abs(points),
        type: points > 0 ? 'add' : 'subtract',
        description: reason,
      }).unwrap();
      toast.success(`Loyalty points ${points >= 0 ? 'added' : 'deducted'} successfully`);
      setIsLoyaltyModalOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to adjust loyalty points');
    }
  };

  const openViewModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
    setIsViewModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone || customer.phoneNumber || '',
    });
    setIsEditModalOpen(true);
  };

  const openLoyaltyModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedCustomerId(customer.id);
    setLoyaltyPointsChange(0);
    setLoyaltyReason('');
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
      render: (value: number) => {
        const points = value || 0;
        const tier = getLoyaltyTier(points);
        return (
          <div className="text-right">
            <p className="font-semibold text-gray-900 dark:text-white">{points.toLocaleString()}</p>
            <div className="flex items-center gap-1 justify-end">
              <StarIcon className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {tier.label}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'totalSpent',
      title: 'Total Spent',
      sortable: true,
      align: 'right' as const,
      render: (value: number) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatCurrency(value || 0)}
        </span>
      ),
    },
    {
      key: 'totalOrders',
      title: 'Orders',
      sortable: true,
      align: 'center' as const,
      render: (value: number) => (
        <Badge variant="secondary">
          {value || 0}
        </Badge>
      ),
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
            onClick={() => openViewModal(row)}
            title="View Details"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openLoyaltyModal(row)}
            className="text-purple-600 hover:text-purple-700"
            title="Manage Loyalty"
          >
            <TrophyIcon className="w-4 h-4" />
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

  // Filter customers by tier
  const filteredCustomers = useMemo(() => {
    if (tierFilter === 'all') return customers;
    return customers.filter(c => getLoyaltyTier(c.loyaltyPoints || 0).value === tierFilter);
  }, [customers, tierFilter]);

  const stats = useMemo(() => {
    return {
      total: totalCustomers,
      bronze: customers.filter(c => getLoyaltyTier(c.loyaltyPoints || 0).value === 'bronze').length,
      silver: customers.filter(c => getLoyaltyTier(c.loyaltyPoints || 0).value === 'silver').length,
      gold: customers.filter(c => getLoyaltyTier(c.loyaltyPoints || 0).value === 'gold').length,
      platinum: customers.filter(c => getLoyaltyTier(c.loyaltyPoints || 0).value === 'platinum').length,
    };
  }, [customers, totalCustomers]);

  // Show warning if companyId is missing
  if (!companyId && !branchId && !isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 mb-2">Unable to load customers</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Company or Branch ID is missing. Please ensure you are logged in and have selected a company/branch.
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Customer Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your customers and loyalty program
          </p>
          {!!error && (
            <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm mt-1">
              Error loading customers: {String((error as any)?.data?.message || (error as any)?.message || 'Unknown error')}
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
                  const payload: any = {
                    companyId: companyId?.toString(),
                    firstName: item.firstName || item['First Name'] || item.name?.split(' ')[0] || '',
                    lastName: item.lastName || item['Last Name'] || item.name?.split(' ').slice(1).join(' ') || '',
                    email: item.email || item.Email || '',
                    phone: item.phone || item.Phone || undefined,
                  };

                  if (branchId) {
                    payload.branchId = branchId.toString();
                  }

                  await createCustomer(payload).unwrap();
                  successCount++;
                } catch (error: any) {
                  console.error('Failed to import customer:', item, error);
                  errorCount++;
                }
              }

              if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} customers`);
                await refetch();
              }
              if (errorCount > 0) {
                toast.error(`Failed to import ${errorCount} customers`);
              }
            }}
            columns={[
              { key: 'firstName', label: 'First Name', required: true, type: 'string' },
              { key: 'lastName', label: 'Last Name', required: true, type: 'string' },
              { key: 'email', label: 'Email', required: true, type: 'email' },
              { key: 'phone', label: 'Phone', type: 'string' },
            ]}
            filename="customers-import-template"
            variant="secondary"
          />
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto text-sm sm:text-base">
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Total Customers</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate" title={stats.total.toString()}>
                  {stats.total.toLocaleString()}
                </p>
              </div>
              <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        {LOYALTY_TIERS.map((tier) => {
          const count = stats[tier.value as keyof typeof stats] || 0;
          return (
            <Card key={tier.value}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{tier.label}</p>
                    <p className={`text-lg sm:text-xl md:text-2xl font-bold truncate ${tier.color.replace('bg-', 'text-').replace('-100', '-800').replace('-900/30', '-400')}`} title={count.toString()}>
                      {count.toLocaleString()}
                    </p>
                  </div>
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${tier.color} flex-shrink-0`}>
                    <TrophyIcon className="w-3 h-3 sm:w-4 sm:h-4" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {LOYALTY_TIERS.map((tier) => {
              const count = stats[tier.value as keyof typeof stats] || 0;
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
              const nextTier = getNextTier(tier.minPoints);

              return (
                <div key={tier.value} className="text-center">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full mx-auto mb-2 sm:mb-3 flex items-center justify-center ${tier.color}`}>
                    <TrophyIcon className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-1">
                    {tier.label}
                  </h3>
                  <p className="text-xl sm:text-2xl font-bold text-primary-600 mb-2">
                    {count}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
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
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm sm:text-base"
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

      {/* Error Display */}
      {!!error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 font-medium">
            Error loading customers: {String((error as any)?.data?.message || (error as any)?.message || 'Unknown error')}
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

      {/* Customers Table */}
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading customers...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={filteredCustomers}
          columns={columns}
          loading={isLoading}
          searchable={false}
          selectable={true}
          pagination={{
            currentPage,
            totalPages: Math.ceil(totalCustomers / itemsPerPage),
            itemsPerPage,
            totalItems: totalCustomers,
            onPageChange: setCurrentPage,
            onItemsPerPageChange: setItemsPerPage,
          }}
          exportable={true}
          exportFilename="customers"
          onExport={(_format, _items) => {
            // Export is handled automatically by ExportButton component
          }}
          emptyMessage="No customers found. Add your first customer to get started."
        />
      )}

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
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !formData.firstName || !formData.lastName || !formData.email} className="w-full sm:w-auto text-sm sm:text-base">
              {isCreating ? 'Creating...' : 'Add Customer'}
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

      {/* View Customer Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedCustomerId('');
        }}
        title="Customer Details"
        className="max-w-4xl"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="border-b pb-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedCustomer.firstName} {selectedCustomer.lastName}
                    </h3>
                    <Badge className={getLoyaltyTier(selectedCustomer.loyaltyPoints || 0).color}>
                      {getLoyaltyTier(selectedCustomer.loyaltyPoints || 0).label}
                    </Badge>
                    {selectedCustomer.isActive === false && (
                      <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white break-words">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Phone</p>
                      <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">{selectedCustomer.phoneNumber || 'Not provided'}</p>
                    </div>
                    {selectedCustomer.address && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {selectedCustomer.address.street}, {selectedCustomer.address.city}, {selectedCustomer.address.state} {selectedCustomer.address.zipCode}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.totalOrders || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Spent</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(selectedCustomer.totalSpent || 0)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Loyalty Points</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{selectedCustomer.loyaltyPoints?.toLocaleString() || 0}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Average Order</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedCustomer.totalOrders > 0 ? formatCurrency((selectedCustomer.totalSpent || 0) / selectedCustomer.totalOrders) : formatCurrency(0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Orders */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Orders</h4>
              {customerOrdersData ? (
                <div className="space-y-2">
                  {(customerOrdersData as any)?.orders?.length > 0 ? (
                    ((customerOrdersData as any).orders || []).slice(0, 5).map((order: any) => (
                      <div key={order.id || order._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            Order #{order.orderNumber || order.order_id || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(order.totalAmount || order.total || 0)}</p>
                          <Badge variant="secondary">{order.status || 'N/A'}</Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">No orders yet</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">Loading orders...</p>
              )}
            </div>

            {/* Preferences */}
            {(selectedCustomer.preferences?.favoriteItems?.length || selectedCustomer.preferences?.allergies?.length || selectedCustomer.preferences?.dietaryRestrictions?.length) && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Preferences</h4>
                <div className="space-y-3">
                  {selectedCustomer.preferences?.favoriteItems?.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Favorite Items</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomer.preferences.favoriteItems.map((item: string, idx: number) => (
                          <Badge key={idx} variant="secondary">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedCustomer.preferences?.allergies?.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Allergies</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomer.preferences.allergies.map((allergy: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">{allergy}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedCustomer.preferences?.dietaryRestrictions?.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Dietary Restrictions</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCustomer.preferences.dietaryRestrictions.map((restriction: string, idx: number) => (
                          <Badge key={idx} variant="secondary">{restriction}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedCustomer.notes && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Notes</h4>
                <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">{selectedCustomer.notes}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedCustomerId('');
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  openLoyaltyModal(selectedCustomer);
                }}
                className="text-purple-600 hover:text-purple-700 w-full sm:w-auto text-sm sm:text-base"
              >
                <TrophyIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Manage Loyalty
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(selectedCustomer);
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                <PencilIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Edit Customer
              </Button>
            </div>
          </div>
        )}
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
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isUpdating || !formData.firstName || !formData.lastName || !formData.email} className="w-full sm:w-auto text-sm sm:text-base">
              {isUpdating ? 'Updating...' : 'Update Customer'}
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
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      type="number"
                      label="Points Amount"
                      value={loyaltyPointsChange.toString()}
                      onChange={(e) => setLoyaltyPointsChange(parseInt(e.target.value) || 0)}
                      placeholder="e.g., 100 or -50"
                      className="text-sm sm:text-base"
                    />
                    <Input
                      label="Reason"
                      value={loyaltyReason}
                      onChange={(e) => setLoyaltyReason(e.target.value)}
                      placeholder="e.g., Bonus points, Reward, Redemption"
                      className="text-sm sm:text-base"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleQuickLoyaltyAdjustment(selectedCustomer.id, 100, 'Bonus points')}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      +100 Points
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleQuickLoyaltyAdjustment(selectedCustomer.id, 500, 'Reward')}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      +500 Points
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleQuickLoyaltyAdjustment(selectedCustomer.id, -50, 'Redemption')}
                      className="flex-1 text-red-600 hover:text-red-700 text-xs sm:text-sm"
                    >
                      -50 Points
                    </Button>
                  </div>
                  <Button
                    onClick={handleLoyaltyAdjustment}
                    className="w-full text-sm sm:text-base"
                    disabled={!loyaltyPointsChange || !loyaltyReason.trim()}
                  >
                    Apply Adjustment
                  </Button>
                </div>
              </div>

              {/* Loyalty History */}
              {loyaltyHistoryData && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Recent Transactions</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(loyaltyHistoryData as any)?.transactions?.length > 0 ? (
                      ((loyaltyHistoryData as any).transactions || []).slice(0, 5).map((transaction: any, idx: number) => (
                        <div key={transaction.id || transaction._id || idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{transaction.description || 'N/A'}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          <Badge className={transaction.type === 'earned' || transaction.type === 'adjusted' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}>
                            {transaction.type === 'earned' || transaction.type === 'adjusted' ? '+' : '-'}{transaction.points || 0}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-2 text-sm">No loyalty transactions</p>
                    )}
                  </div>
                </div>
              )}

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