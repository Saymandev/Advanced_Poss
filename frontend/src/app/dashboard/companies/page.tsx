'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
  Company,
  CreateCompanyRequest,
  useCreateCompanyMutation,
  useDeactivateCompanyMutation,
  useDeleteCompanyMutation,
  useGetCompaniesQuery,
  useGetCompanyStatsQuery,
  useUpdateCompanyMutation,
} from '@/lib/api/endpoints/companiesApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
  BuildingOffice2Icon,
  ChartBarIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrashIcon,
  UsersIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const SUBSCRIPTION_PLANS = [
  { value: 'basic', label: 'Basic' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
];

export default function CompaniesPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      router.replace('/dashboard/super-admin');
    }
  }, [user, router]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data: companiesData, isLoading, refetch } = useGetCompaniesQuery({});

  const [createCompany, { isLoading: isCreating }] = useCreateCompanyMutation();
  const [updateCompany, { isLoading: isUpdating }] = useUpdateCompanyMutation();
  const [deleteCompany, { isLoading: isDeleting }] = useDeleteCompanyMutation();
  const [deactivateCompany] = useDeactivateCompanyMutation();

  const companies = useMemo(() => {
    if (!companiesData) return [];
    // Handle different response structures
    if (Array.isArray(companiesData)) {
      return companiesData.map((comp: any) => ({
        ...comp,
        id: comp._id || comp.id,
      }));
    }
    if (companiesData.companies && Array.isArray(companiesData.companies)) {
      return companiesData.companies.map((comp: any) => ({
        ...comp,
        id: comp._id || comp.id,
      }));
    }
    return [];
  }, [companiesData]);

  const [formData, setFormData] = useState<Partial<CreateCompanyRequest>>({
    name: '',
    email: '',
    phoneNumber: '',
    website: '',
    slug: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'BD',
      zipCode: '',
    },
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const filteredCompanies = useMemo(() => {
    let filtered = companies;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (company) =>
          company.name.toLowerCase().includes(query) ||
          company.email.toLowerCase().includes(query) ||
          company.slug?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((company) => {
        if (statusFilter === 'active') return company.isActive;
        if (statusFilter === 'inactive') return !company.isActive;
        return true;
      });
    }

    if (subscriptionFilter !== 'all') {
      filtered = filtered.filter(
        (company) => company.subscriptionStatus === subscriptionFilter
      );
    }

    return filtered;
  }, [companies, searchQuery, statusFilter, subscriptionFilter]);

  const totalCompanies = filteredCompanies.length;
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(start, start + itemsPerPage);
  }, [filteredCompanies, currentPage, itemsPerPage]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      website: '',
      slug: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: 'BD',
        zipCode: '',
      },
    });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = 'Company name is required';
    }
    if (!formData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format';
    }
    if (!formData.address?.street?.trim()) {
      errors.street = 'Street address is required';
    }
    if (!formData.address?.city?.trim()) {
      errors.city = 'City is required';
    }
    if (!formData.address?.country?.trim()) {
      errors.country = 'Country is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      await createCompany({
        name: formData.name!.trim(),
        email: formData.email!.trim(),
        phoneNumber: formData.phoneNumber?.trim(),
        website: formData.website?.trim(),
        slug: formData.slug?.trim(),
        address: formData.address!,
      } as CreateCompanyRequest).unwrap();
      toast.success('Company created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create company');
    }
  };

  const handleEdit = async () => {
    if (!selectedCompany || !validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      await updateCompany({
        id: selectedCompany.id,
        ...formData,
      } as any).unwrap();
      toast.success('Company updated successfully');
      setIsEditModalOpen(false);
      setSelectedCompany(null);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update company');
    }
  };

  const handleDelete = async (company: Company) => {
    if (!confirm(`Are you sure you want to delete "${company.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCompany(company.id).unwrap();
      toast.success('Company deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete company');
    }
  };

  const handleDeactivate = async (company: Company) => {
    const action = company.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} "${company.name}"?`)) {
      return;
    }

    try {
      await deactivateCompany(company.id).unwrap();
      toast.success(`Company ${action}d successfully`);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || `Failed to ${action} company`);
    }
  };

  const openEditModal = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      email: company.email,
      phoneNumber: company.phoneNumber,
      website: company.website,
      slug: (company as any).slug || '',
      address: company.address || {
        street: '',
        city: '',
        state: '',
        country: 'BD',
        zipCode: '',
      },
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (company: Company) => {
    setSelectedCompany(company);
    setIsViewModalOpen(true);
  };

  const openStatsModal = (company: Company) => {
    setSelectedCompany(company);
    setIsStatsModalOpen(true);
  };

  // Fetch company stats when stats modal is open
  const { data: companyStatsData, isLoading: isLoadingStats } = useGetCompanyStatsQuery(
    selectedCompany?.id || '',
    { skip: !isStatsModalOpen || !selectedCompany?.id }
  );

  // Columns configuration for DataTable
  const columns: { key: keyof Company | string; title: string; render: (value: any, row: Company) => React.ReactNode }[] = [
    {
      key: 'name',
      title: 'Company',
      render: (_value, company: Company) => (
        <div className="flex items-center gap-3">
          {company.logo ? (
            <img
              src={company.logo}
              alt={company.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {company.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{company.name}</p>
            <p className="text-sm text-gray-500">{company.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (_value, company: Company) => (
        <div className="flex flex-col gap-1">
          <Badge variant={company.isActive ? 'success' : 'danger'}>
            {company.isActive ? 'Active' : 'Inactive'}
          </Badge>
          {company.subscriptionStatus && (
            <Badge
              variant={
                company.subscriptionStatus === 'active'
                  ? 'success'
                  : company.subscriptionStatus === 'trial'
                  ? 'warning'
                  : 'danger'
              }
            >
              {company.subscriptionStatus}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'subscriptionPlan',
      title: 'Subscription',
      render: (_value, company: Company) => (
        <span className="text-sm font-medium capitalize">
          {company.subscriptionPlan || 'N/A'}
        </span>
      ),
    },
    {
      key: 'phoneNumber',
      title: 'Contact',
      render: (_value, company: Company) => (
        <div className="text-sm">
          {company.phoneNumber && (
            <p className="text-gray-900 dark:text-white">{company.phoneNumber}</p>
          )}
          {company.website && (
            <p className="text-gray-500 text-xs">{company.website}</p>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (_value, company: Company) => (
        <span className="text-sm text-gray-500">
          {company.createdAt ? formatDateTime(company.createdAt) : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_value, company: Company) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openViewModal(company)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="View Details"
          >
            <EyeIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => openStatsModal(company)}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
            title="View Statistics"
          >
            <ChartBarIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => openEditModal(company)}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleDeactivate(company)}
            className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
            title={company.isActive ? 'Deactivate' : 'Activate'}
          >
            {company.isActive ? (
              <XCircleIcon className="w-5 h-5" />
            ) : (
              <CheckCircleIcon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => handleDelete(company)}
            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  if (!user || user.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BuildingOffice2Icon className="w-8 h-8 text-purple-600" />
            Company Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage all companies in the system
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Company
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full"
            />
            <Select
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
            <Select
              value={subscriptionFilter}
              onChange={(value) => {
                setSubscriptionFilter(value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Subscriptions' },
                { value: 'active', label: 'Active' },
                { value: 'trial', label: 'Trial' },
                { value: 'expired', label: 'Expired' },
              ]}
            />
            <div className="flex items-center justify-end">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {totalCompanies} {totalCompanies === 1 ? 'company' : 'companies'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <DataTable
        data={paginatedCompanies}
        columns={columns}
        loading={isLoading}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil(totalCompanies / itemsPerPage),
          itemsPerPage,
          totalItems: totalCompanies,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="companies"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} companies as ${format}`);
        }}
        emptyMessage="No companies found. Create your first company to get started."
      />

      {/* Create Company Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create New Company"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
                error={formErrors.name}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="company@example.com"
                error={formErrors.email}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input
                value={formData.phoneNumber || ''}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <Input
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Street *</label>
                <Input
                  value={formData.address?.street || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address!, street: e.target.value },
                    })
                  }
                  placeholder="Street address"
                  error={formErrors.street}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <Input
                    value={formData.address?.city || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address!, city: e.target.value },
                      })
                    }
                    placeholder="City"
                    error={formErrors.city}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <Input
                    value={formData.address?.state || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address!, state: e.target.value },
                      })
                    }
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country *</label>
                  <Input
                    value={formData.address?.country || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address!, country: e.target.value },
                      })
                    }
                    placeholder="Country"
                    error={formErrors.country}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ZIP Code</label>
                <Input
                  value={formData.address?.zipCode || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address!, zipCode: e.target.value },
                    })
                  }
                  placeholder="ZIP Code"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={isCreating}>
              Create Company
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Company Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCompany(null);
          resetForm();
        }}
        title="Edit Company"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          {/* Same form fields as create modal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter company name"
                error={formErrors.name}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="company@example.com"
                error={formErrors.email}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input
                value={formData.phoneNumber || ''}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <Input
              value={formData.website || ''}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Public URL Slug (Custom URL identifier)
            </label>
            <Input
              value={(formData as any).slug || ''}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value } as any)}
              placeholder="company-url-slug"
            />
            <p className="text-xs text-gray-500 mt-1">
              Custom slug for public URLs. Leave empty to auto-generate from company name.
              Only lowercase letters, numbers, and hyphens allowed.
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Street *</label>
                <Input
                  value={formData.address?.street || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address!, street: e.target.value },
                    })
                  }
                  placeholder="Street address"
                  error={formErrors.street}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <Input
                    value={formData.address?.city || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address!, city: e.target.value },
                      })
                    }
                    placeholder="City"
                    error={formErrors.city}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State</label>
                  <Input
                    value={formData.address?.state || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address!, state: e.target.value },
                      })
                    }
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Country *</label>
                  <Input
                    value={formData.address?.country || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address!, country: e.target.value },
                      })
                    }
                    placeholder="Country"
                    error={formErrors.country}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ZIP Code</label>
                <Input
                  value={formData.address?.zipCode || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address!, zipCode: e.target.value },
                    })
                  }
                  placeholder="ZIP Code"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedCompany(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} isLoading={isUpdating}>
              Update Company
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Company Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedCompany(null);
        }}
        title={selectedCompany?.name || 'Company Details'}
        className="max-w-2xl"
      >
        {selectedCompany && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {selectedCompany.logo ? (
                <img
                  src={selectedCompany.logo}
                  alt={selectedCompany.name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {selectedCompany.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">{selectedCompany.name}</h3>
                <Badge variant={selectedCompany.isActive ? 'success' : 'danger'}>
                  {selectedCompany.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{selectedCompany.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{selectedCompany.phoneNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Subscription Status</p>
                <Badge
                  variant={
                    selectedCompany.subscriptionStatus === 'active'
                      ? 'success'
                      : selectedCompany.subscriptionStatus === 'trial'
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {selectedCompany.subscriptionStatus || 'N/A'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Subscription Plan</p>
                <p className="font-medium capitalize">
                  {selectedCompany.subscriptionPlan || 'N/A'}
                </p>
              </div>
            </div>

            {selectedCompany.address && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Address</p>
                <p className="font-medium">
                  {selectedCompany.address.street}, {selectedCompany.address.city}
                  {selectedCompany.address.state && `, ${selectedCompany.address.state}`}
                  {selectedCompany.address.country && `, ${selectedCompany.address.country}`}
                  {selectedCompany.address.zipCode && ` ${selectedCompany.address.zipCode}`}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium">
                  {selectedCompany.createdAt
                    ? formatDateTime(selectedCompany.createdAt)
                    : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Updated</p>
                <p className="font-medium">
                  {selectedCompany.updatedAt
                    ? formatDateTime(selectedCompany.updatedAt)
                    : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Company Statistics Modal */}
      <Modal
        isOpen={isStatsModalOpen}
        onClose={() => {
          setIsStatsModalOpen(false);
          setSelectedCompany(null);
        }}
        title={`${selectedCompany?.name || 'Company'} - Statistics`}
        className="max-w-4xl"
      >
        {selectedCompany && (
          <div className="space-y-6">
            {isLoadingStats ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">Loading statistics...</p>
              </div>
            ) : companyStatsData ? (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <BuildingOffice2Icon className="w-8 h-8 text-blue-600" />
                        <div>
                          <p className="text-2xl font-bold">{companyStatsData.stats?.totalBranches ?? 0}</p>
                          <p className="text-xs text-gray-500">Total Branches</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <UsersIcon className="w-8 h-8 text-green-600" />
                        <div>
                          <p className="text-2xl font-bold">{companyStatsData.stats?.totalUsers ?? 0}</p>
                          <p className="text-xs text-gray-500">Total Employees</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <ShoppingBagIcon className="w-8 h-8 text-purple-600" />
                        <div>
                          <p className="text-2xl font-bold">{companyStatsData.stats?.totalOrders ?? 0}</p>
                          <p className="text-xs text-gray-500">Total Orders</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <CurrencyDollarIcon className="w-8 h-8 text-yellow-600" />
                        <div>
                          <p className="text-2xl font-bold">
                            {companyStatsData.stats?.totalRevenue 
                              ? new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'BDT',
                                }).format(companyStatsData.stats.totalRevenue)
                              : '৳0'}
                          </p>
                          <p className="text-xs text-gray-500">Total Revenue</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Metrics */}
                {(companyStatsData.stats?.totalOrders ?? 0) > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Metrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Average Order Value</p>
                          <p className="text-lg font-semibold">
                            {(companyStatsData.stats?.totalOrders ?? 0) > 0
                              ? new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'BDT',
                                }).format((companyStatsData.stats?.totalRevenue ?? 0) / (companyStatsData.stats?.totalOrders ?? 1))
                              : 'N/A'}
                          </p>
                        </div>
                        {(companyStatsData.stats?.totalUsers ?? 0) > 0 && (
                          <div>
                            <p className="text-sm text-gray-500">Revenue per Employee</p>
                            <p className="text-lg font-semibold">
                              {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'BDT',
                              }).format((companyStatsData.stats?.totalRevenue ?? 0) / (companyStatsData.stats?.totalUsers ?? 1))}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No statistics available for this company.</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

