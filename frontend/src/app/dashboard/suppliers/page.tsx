'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Combobox } from '@/components/ui/Combobox';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Supplier, useActivateSupplierMutation, useCreateSupplierMutation, useDeactivateSupplierMutation, useDeleteSupplierMutation, useGetSuppliersQuery, useGetSupplierStatsQuery, useMakeSupplierPreferredMutation, useRemoveSupplierPreferredMutation, useUpdateSupplierMutation } from '@/lib/api/endpoints/suppliersApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import {
  BuildingOfficeIcon,
  CheckBadgeIcon,
  EnvelopeIcon,
  EyeIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  PowerIcon,
  StarIcon,
  TrashIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
export default function SuppliersPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const companyId = (user as any)?.companyId || 
                    (companyContext as any)?.companyId ||
                    (companyContext as any)?._id ||
                    (companyContext as any)?.id;
  // Debug logging
  useEffect(() => {
    // Debug logging removed
  }, [companyId, user, companyContext]);
  const queryParams = useMemo(() => {
    const params: any = {
      companyId: companyId || undefined,
      page: currentPage,
      limit: itemsPerPage,
    };
    // Only add optional params if they have values
    if (searchQuery) params.search = searchQuery;
    if (statusFilter !== 'all') params.isActive = statusFilter === 'active';
    if (typeFilter !== 'all') params.type = typeFilter;
    if (ratingFilter !== 'all') params.rating = parseInt(ratingFilter);
    return params;
  }, [companyId, searchQuery, statusFilter, typeFilter, ratingFilter, currentPage, itemsPerPage]);
  // Debug query params
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, searchQuery, statusFilter, typeFilter, ratingFilter, currentPage, itemsPerPage]);
  const { data: suppliersResponse, isLoading, error, refetch } = useGetSuppliersQuery(queryParams, { 
    skip: !companyId,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  // Debug API response and auto-retry if needed
  useEffect(() => {
    // If we have companyId but no suppliers and no error, try refetching once
    if (companyId && !isLoading && !error && (!suppliersResponse || suppliersResponse.suppliers?.length === 0)) {
      // Don't auto-refetch immediately, let user manually refresh if needed
    }
  }, [suppliersResponse, isLoading, error, companyId]);
  const { data: supplierStats } = useGetSupplierStatsQuery(companyId || '', { skip: !companyId });
  const [createSupplier, { isLoading: isCreating }] = useCreateSupplierMutation();
  const [updateSupplier, { isLoading: isUpdating }] = useUpdateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();
  const [activateSupplier] = useActivateSupplierMutation();
  const [deactivateSupplier] = useDeactivateSupplierMutation();
  const [makePreferred] = useMakeSupplierPreferredMutation();
  const [removePreferred] = useRemoveSupplierPreferredMutation();
  // Extract suppliers from API response
  const suppliers = useMemo(() => {
    if (!suppliersResponse) {
      return [];
    }
    const supplierList = suppliersResponse.suppliers || [];
    return supplierList;
  }, [suppliersResponse]);
  const totalSuppliers = useMemo(() => {
    const total = suppliersResponse?.total || 0;
    return total;
  }, [suppliersResponse]);
  // Get unique supplier types from existing suppliers for suggestions
  const existingSupplierTypes = useMemo(() => {
    const types = new Set<string>();
    suppliers.forEach((supplier: any) => {
      if (supplier.type) {
        types.add(supplier.type);
      }
    });
    return Array.from(types).map((type) => ({
      value: type,
      label: type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' '),
    }));
  }, [suppliers]);
  // Combine predefined types with existing types from database
  const supplierTypeOptions = useMemo(() => {
    const predefined = [
      { value: 'food', label: 'Food' },
      { value: 'beverage', label: 'Beverage' },
      { value: 'equipment', label: 'Equipment' },
      { value: 'packaging', label: 'Packaging' },
      { value: 'service', label: 'Service' },
      { value: 'other', label: 'Other' },
    ];
    const predefinedMap = new Map(predefined.map(opt => [opt.value, opt]));
    const combined = [...predefined];
    // Add existing types that aren't in predefined list
    existingSupplierTypes.forEach((type) => {
      if (!predefinedMap.has(type.value)) {
        combined.push(type);
      }
    });
    return combined;
  }, [existingSupplierTypes]);
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    type: 'food',
    contactPerson: '',
    email: '',
    phone: '',
    alternatePhone: '',
    website: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
    },
    taxId: '',
    registrationNumber: '',
    paymentTerms: 'net-30',
    creditLimit: 0,
    bankDetails: {
      bankName: '',
      accountNumber: '',
      accountName: '',
      ifscCode: '',
      swiftCode: '',
    },
    productCategories: [],
    certifications: [],
    notes: '',
    tags: [],
  });
  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isCreateModalOpen, isEditModalOpen]);
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'food',
      contactPerson: '',
      email: '',
      phone: '',
      alternatePhone: '',
      website: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'USA',
      },
      taxId: '',
      registrationNumber: '',
      paymentTerms: 'net-30',
      creditLimit: 0,
      bankDetails: {
        bankName: '',
        accountNumber: '',
        accountName: '',
        ifscCode: '',
        swiftCode: '',
      },
      productCategories: [],
      certifications: [],
      notes: '',
      tags: [],
    });
    setSelectedSupplier(null);
  };
  const handleCreate = async () => {
    if (!formData.name || !formData.contactPerson || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!companyId) {
      toast.error('Company ID is missing');
      return;
    }
    if (!formData.address.street || !formData.address.city || !formData.address.state) {
      toast.error('Please fill in complete address');
      return;
    }
    try {
      await createSupplier({
        companyId,
        name: formData.name,
        description: formData.description || undefined,
        type: formData.type,
        contactPerson: formData.contactPerson,
        email: formData.email,
        phone: formData.phone,
        alternatePhone: formData.alternatePhone || undefined,
        website: formData.website || undefined,
        address: {
          street: formData.address.street,
          city: formData.address.city,
          state: formData.address.state,
          zipCode: formData.address.zipCode,
          country: formData.address.country,
        },
        taxId: formData.taxId || undefined,
        registrationNumber: formData.registrationNumber || undefined,
        paymentTerms: formData.paymentTerms,
        creditLimit: formData.creditLimit || undefined,
        bankDetails: formData.bankDetails?.bankName ? formData.bankDetails : undefined,
        productCategories: formData.productCategories || undefined,
        certifications: formData.certifications || undefined,
        notes: formData.notes || undefined,
        tags: formData.tags || undefined,
      } as any).unwrap();
      toast.success('Supplier created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      // Manually refetch to ensure the list updates immediately
      // Only refetch if the query is not skipped (companyId exists)
      if (companyId) {
        try {
          const refetchResult = await refetch();
          if (refetchResult.data) {
            }
        } catch (refetchError) {
          console.error('Refetch error:', refetchError);
        }
      }
    } catch (error: any) {
      console.error('Error creating supplier:', error);
      toast.error(error?.data?.message || error?.message || 'Failed to create supplier');
    }
  };
  const handleEdit = async () => {
    if (!selectedSupplier) return;
    if (!formData.name || !formData.contactPerson || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await updateSupplier({
        id: selectedSupplier.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          type: formData.type,
          contactPerson: formData.contactPerson,
          email: formData.email,
          phone: formData.phone,
          alternatePhone: formData.alternatePhone || undefined,
          website: formData.website || undefined,
          address: {
            street: formData.address.street,
            city: formData.address.city,
            state: formData.address.state,
            zipCode: formData.address.zipCode,
            country: formData.address.country,
          },
          taxId: formData.taxId || undefined,
          registrationNumber: formData.registrationNumber || undefined,
          paymentTerms: formData.paymentTerms,
          creditLimit: formData.creditLimit || undefined,
          bankDetails: formData.bankDetails?.bankName ? formData.bankDetails : undefined,
          productCategories: formData.productCategories || undefined,
          certifications: formData.certifications || undefined,
          notes: formData.notes || undefined,
          tags: formData.tags || undefined,
        } as any,
      }).unwrap();
      toast.success('Supplier updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update supplier');
    }
  };
  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`Are you sure you want to delete "${supplier.name}"?`)) return;
    try {
      await deleteSupplier(supplier.id).unwrap();
      toast.success('Supplier deleted successfully');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete supplier');
    }
  };
  const handleToggleStatus = async (supplier: Supplier) => {
    try {
      if (supplier.isActive) {
        await deactivateSupplier(supplier.id).unwrap();
        toast.success('Supplier deactivated successfully');
      } else {
        await activateSupplier(supplier.id).unwrap();
        toast.success('Supplier activated successfully');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to toggle supplier status');
    }
  };
  const handleTogglePreferred = async (supplier: Supplier) => {
    try {
      if (supplier.isPreferred) {
        await removePreferred(supplier.id).unwrap();
        toast.success('Removed from preferred suppliers');
      } else {
        await makePreferred(supplier.id).unwrap();
        toast.success('Added to preferred suppliers');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to toggle preferred status');
    }
  };
  const openViewModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsViewModalOpen(true);
  };
  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      description: supplier.description || '',
      type: supplier.type,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone || supplier.phoneNumber || '',
      alternatePhone: supplier.alternatePhone || '',
      website: supplier.website || '',
      address: supplier.address || {
        street: supplier.city || '',
        city: supplier.city || '',
        state: supplier.state || '',
        zipCode: supplier.zipCode || '',
        country: supplier.country || 'USA',
      },
      taxId: supplier.taxId || '',
      registrationNumber: supplier.registrationNumber || '',
      paymentTerms: supplier.paymentTerms,
      creditLimit: supplier.creditLimit || 0,
      bankDetails: supplier.bankDetails || {
        bankName: '',
        accountNumber: '',
        accountName: '',
        ifscCode: '',
        swiftCode: '',
      },
      productCategories: supplier.productCategories || [],
      certifications: supplier.certifications || [],
      notes: supplier.notes || '',
      tags: supplier.tags || [],
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
            <span className="text-sm text-gray-600 dark:text-gray-400">{row.phone || row.phoneNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (value: string) => (
        <Badge variant="secondary" className="capitalize">
          {value}
        </Badge>
      ),
    },
    {
      key: 'address',
      title: 'Location',
      render: (value: any, row: Supplier) => {
        const address = row.address || { city: row.city, state: row.state, country: row.country };
        return (
          <div className="flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {address.city}, {address.state}
            </span>
          </div>
        );
      },
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
      render: (value: string) => {
        const termsMap: { [key: string]: string } = {
          'net-7': 'Net 7',
          'net-15': 'Net 15',
          'net-30': 'Net 30',
          'net-60': 'Net 60',
          'cod': 'COD',
          'prepaid': 'Prepaid',
        };
        return <Badge variant="secondary">{termsMap[value] || value}</Badge>;
      },
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value: boolean, row: Supplier) => (
        <div className="flex flex-col gap-1">
          <Badge variant={value ? 'success' : 'danger'}>
            {value ? 'Active' : 'Inactive'}
          </Badge>
          {row.isPreferred && (
            <Badge variant="warning" className="text-xs">
              <CheckBadgeIcon className="w-3 h-3 mr-1" />
              Preferred
            </Badge>
          )}
        </div>
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
            onClick={() => handleTogglePreferred(row)}
            className={row.isPreferred ? 'text-yellow-600 hover:text-yellow-700' : 'text-gray-600 hover:text-gray-700'}
            title={row.isPreferred ? 'Remove Preferred' : 'Make Preferred'}
          >
            <CheckBadgeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleStatus(row)}
            className={row.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
            title={row.isActive ? 'Deactivate' : 'Activate'}
          >
            <PowerIcon className="w-4 h-4" />
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
  const stats = useMemo(() => {
    if (supplierStats) {
      return {
        total: supplierStats.total || totalSuppliers,
        active: supplierStats.active || suppliers.filter(s => s.isActive).length,
        topRated: supplierStats.topRated || suppliers.filter(s => s.rating >= 4).length,
        avgRating: supplierStats.avgRating || (suppliers.length ? (suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length).toFixed(1) : '0'),
      };
    }
    return {
      total: totalSuppliers,
      active: suppliers.filter(s => s.isActive).length,
      topRated: suppliers.filter(s => s.rating >= 4).length,
      avgRating: suppliers.length ? (suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length).toFixed(1) : '0',
    };
  }, [suppliers, totalSuppliers, supplierStats]);
  // Show error if query failed
  if (error) {
    console.error('Suppliers API Error:', error);
  }
  // Show warning if companyId is missing
  if (!companyId && !isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600 dark:text-red-400 mb-2">Unable to load suppliers</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Company ID is missing. Please ensure you are logged in and have selected a company.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Debug: User ID: {(user as any)?.id}, Company ID: {(user as any)?.companyId || 'Not found'}
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Supplier Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your suppliers and vendor relationships
          </p>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-2">
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                Error loading suppliers: {(error as any)?.data?.message || (error as any)?.message || 'Unknown error'}
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
          {!isLoading && !error && suppliers.length === 0 && companyId && (
            <p className="text-yellow-600 dark:text-yellow-400 text-sm mt-1">
              No suppliers found for company ID: {companyId}. Click "Add Supplier" to create your first supplier.
            </p>
          )}
          {!isLoading && !error && suppliers.length === 0 && !companyId && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">
              Company ID is missing. Please ensure you are logged in and have selected a company.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
          <ImportButton
            onImport={async (data, _result) => {
              let successCount = 0;
              let errorCount = 0;
              for (const item of data) {
                try {
                  const payload: any = {
                    companyId,
                    name: item.name || item.Name,
                    description: item.description || item.Description || undefined,
                    type: item.type || item.Type || 'food',
                    contactPerson: item.contactPerson || item['Contact Person'] || '',
                    email: item.email || item.Email || '',
                    phone: item.phone || item.Phone || '',
                    alternatePhone: item.alternatePhone || item['Alternate Phone'] || undefined,
                    website: item.website || item.Website || undefined,
                    address: {
                      street: item['Street'] || item.street || item.address?.street || '',
                      city: item['City'] || item.city || item.address?.city || '',
                      state: item['State'] || item.state || item.address?.state || '',
                      zipCode: item['Zip Code'] || item.zipCode || item.address?.zipCode || '',
                      country: item['Country'] || item.country || item.address?.country || 'USA',
                    },
                    taxId: item.taxId || item['Tax ID'] || undefined,
                    registrationNumber: item.registrationNumber || item['Registration Number'] || undefined,
                    paymentTerms: item.paymentTerms || item['Payment Terms'] || 'net-30',
                    creditLimit: item.creditLimit || item['Credit Limit'] ? parseFloat(item.creditLimit || item['Credit Limit']) : undefined,
                  };
                  await createSupplier(payload).unwrap();
                  successCount++;
                } catch (error: any) {
                  console.error('Failed to import supplier:', item, error);
                  errorCount++;
                }
              }
              if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} suppliers`);
                await refetch();
              }
              if (errorCount > 0) {
                toast.error(`Failed to import ${errorCount} suppliers`);
              }
            }}
            columns={[
              { key: 'name', label: 'Name', required: true, type: 'string' },
              { key: 'type', label: 'Type', required: true, type: 'string' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'phone', label: 'Phone', type: 'string' },
              { key: 'contactPerson', label: 'Contact Person', type: 'string' },
              { key: 'street', label: 'Street', type: 'string' },
              { key: 'city', label: 'City', type: 'string' },
              { key: 'state', label: 'State', type: 'string' },
              { key: 'zipCode', label: 'Zip Code', type: 'string' },
              { key: 'country', label: 'Country', type: 'string' },
            ]}
            filename="suppliers-import-template"
            variant="secondary"
          />
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto text-sm sm:text-base">
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Total Suppliers</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate" title={stats.total.toString()}>
                  {stats.total.toLocaleString()}
                </p>
              </div>
              <TruckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Active Suppliers</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 truncate" title={stats.active.toString()}>
                  {stats.active.toLocaleString()}
                </p>
              </div>
              <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Top Rated</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 truncate" title={stats.topRated.toString()}>
                  {stats.topRated.toLocaleString()}
                </p>
              </div>
              <StarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Avg Rating</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600 truncate" title={`${stats.avgRating}⭐`}>
                  {stats.avgRating}⭐
                </p>
              </div>
              <StarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Types' },
                  ...supplierTypeOptions,
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
                placeholder="Filter by type"
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
      {isLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Loading suppliers...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={suppliers}
          columns={columns}
          loading={isLoading}
          searchable={false}
          selectable={true}
          pagination={{
            currentPage,
            totalPages: Math.ceil(totalSuppliers / itemsPerPage),
            itemsPerPage,
            totalItems: totalSuppliers,
            onPageChange: setCurrentPage,
            onItemsPerPageChange: setItemsPerPage,
          }}
          exportable={true}
          exportFilename="suppliers"
          onExport={(_format, _items) => {
            // Export is handled automatically by ExportButton component
          }}
          emptyMessage="No suppliers found. Add your first supplier to get started."
        />
      )}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Supplier Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type *
              </label>
              <Combobox
                value={formData.type || 'food'}
                onChange={(value: string) => setFormData({ ...formData, type: value.trim() })}
                options={supplierTypeOptions}
                placeholder="Select a type or enter custom type..."
                allowCustom={true}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              placeholder="Brief description of the supplier..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <Input
              label="Alternate Phone (Optional)"
              value={formData.alternatePhone}
              onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
            />
          </div>
          <Input
            label="Street Address"
            value={formData.address.street}
            onChange={(e) => setFormData({ 
              ...formData, 
              address: { ...formData.address, street: e.target.value } 
            })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.address.city}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, city: e.target.value } 
              })}
              required
            />
            <Input
              label="State"
              value={formData.address.state}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, state: e.target.value } 
              })}
              required
            />
            <Input
              label="ZIP Code"
              value={formData.address.zipCode}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, zipCode: e.target.value } 
              })}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Country"
              value={formData.address.country}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, country: e.target.value } 
              })}
              required
            />
            <Input
              label="Website (Optional)"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://supplier.com"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              label="Tax ID (Optional)"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
            />
            <Input
              label="Registration Number (Optional)"
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
            />
            <Select
              label="Payment Terms"
              options={[
                { value: 'net-7', label: 'Net 7' },
                { value: 'net-15', label: 'Net 15' },
                { value: 'net-30', label: 'Net 30' },
                { value: 'net-60', label: 'Net 60' },
                { value: 'cod', label: 'Cash on Delivery' },
                { value: 'prepaid', label: 'Prepaid' },
              ]}
              value={formData.paymentTerms}
              onChange={(value) => setFormData({ ...formData, paymentTerms: value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Credit Limit (Optional)
            </label>
            <Input
              type="number"
              value={formData.creditLimit}
              onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          {/* Bank Details Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Bank Details (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <Input
                label="Bank Name"
                value={formData.bankDetails?.bankName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: {
                    ...formData.bankDetails,
                    bankName: e.target.value,
                    accountNumber: formData.bankDetails?.accountNumber || '',
                    accountName: formData.bankDetails?.accountName || '',
                    ifscCode: formData.bankDetails?.ifscCode || '',
                    swiftCode: formData.bankDetails?.swiftCode || '',
                  } as any,
                })}
              />
              <Input
                label="Account Number"
                value={formData.bankDetails?.accountNumber || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: {
                    ...formData.bankDetails,
                    bankName: formData.bankDetails?.bankName || '',
                    accountNumber: e.target.value,
                    accountName: formData.bankDetails?.accountName || '',
                    ifscCode: formData.bankDetails?.ifscCode || '',
                    swiftCode: formData.bankDetails?.swiftCode || '',
                  } as any,
                })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <Input
                label="Account Name"
                value={formData.bankDetails?.accountName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: {
                    ...formData.bankDetails,
                    bankName: formData.bankDetails?.bankName || '',
                    accountNumber: formData.bankDetails?.accountNumber || '',
                    accountName: e.target.value,
                    ifscCode: formData.bankDetails?.ifscCode || '',
                    swiftCode: formData.bankDetails?.swiftCode || '',
                  } as any,
                })}
              />
              <Input
                label="IFSC/SWIFT Code"
                value={formData.bankDetails?.ifscCode || formData.bankDetails?.swiftCode || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: {
                    ...formData.bankDetails,
                    bankName: formData.bankDetails?.bankName || '',
                    accountNumber: formData.bankDetails?.accountNumber || '',
                    accountName: formData.bankDetails?.accountName || '',
                    ifscCode: e.target.value,
                    swiftCode: e.target.value,
                  } as any,
                })}
              />
            </div>
          </div>
          {/* Product Categories */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Categories (Optional, comma-separated)
            </label>
            <Input
              value={Array.isArray(formData.productCategories) ? formData.productCategories.join(', ') : formData.productCategories || ''}
              onChange={(e) => setFormData({
                ...formData,
                productCategories: e.target.value ? e.target.value.split(',').map(c => c.trim()).filter(c => c) : [],
              })}
              placeholder="e.g., Vegetables, Fruits, Dairy"
            />
          </div>
          {/* Certifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Certifications (Optional, comma-separated)
            </label>
            <Input
              value={Array.isArray(formData.certifications) ? formData.certifications.join(', ') : formData.certifications || ''}
              onChange={(e) => setFormData({
                ...formData,
                certifications: e.target.value ? e.target.value.split(',').map(c => c.trim()).filter(c => c) : [],
              })}
              placeholder="e.g., ISO-9001, HACCP, Organic"
            />
          </div>
          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (Optional, comma-separated)
            </label>
            <Input
              value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags || ''}
              onChange={(e) => setFormData({
                ...formData,
                tags: e.target.value ? e.target.value.split(',').map(t => t.trim()).filter(t => t) : [],
              })}
              placeholder="e.g., preferred, local, reliable"
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
            <Button onClick={handleCreate} disabled={isCreating} className="w-full sm:w-auto text-sm sm:text-base">
              {isCreating ? 'Creating...' : 'Add Supplier'}
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
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Supplier Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type *
              </label>
              <Combobox
                value={formData.type || 'food'}
                onChange={(value: string) => setFormData({ ...formData, type: value.trim() })}
                options={supplierTypeOptions}
                placeholder="Select a type or enter custom type..."
                allowCustom={true}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              placeholder="Brief description of the supplier..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              required
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
            <Input
              label="Alternate Phone (Optional)"
              value={formData.alternatePhone}
              onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
            />
          </div>
          <Input
            label="Street Address"
            value={formData.address.street}
            onChange={(e) => setFormData({ 
              ...formData, 
              address: { ...formData.address, street: e.target.value } 
            })}
            required
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              label="City"
              value={formData.address.city}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, city: e.target.value } 
              })}
              required
            />
            <Input
              label="State"
              value={formData.address.state}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, state: e.target.value } 
              })}
              required
            />
            <Input
              label="ZIP Code"
              value={formData.address.zipCode}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, zipCode: e.target.value } 
              })}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Country"
              value={formData.address.country}
              onChange={(e) => setFormData({ 
                ...formData, 
                address: { ...formData.address, country: e.target.value } 
              })}
              required
            />
            <Input
              label="Website (Optional)"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://supplier.com"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              label="Tax ID (Optional)"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
            />
            <Input
              label="Registration Number (Optional)"
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
            />
            <Select
              label="Payment Terms"
              options={[
                { value: 'net-7', label: 'Net 7' },
                { value: 'net-15', label: 'Net 15' },
                { value: 'net-30', label: 'Net 30' },
                { value: 'net-60', label: 'Net 60' },
                { value: 'cod', label: 'Cash on Delivery' },
                { value: 'prepaid', label: 'Prepaid' },
              ]}
              value={formData.paymentTerms}
              onChange={(value) => setFormData({ ...formData, paymentTerms: value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Credit Limit (Optional)
            </label>
            <Input
              type="number"
              value={formData.creditLimit}
              onChange={(e) => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
          {/* Bank Details Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Bank Details (Optional)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <Input
                label="Bank Name"
                value={formData.bankDetails?.bankName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: {
                    ...formData.bankDetails,
                    bankName: e.target.value,
                    accountNumber: formData.bankDetails?.accountNumber || '',
                    accountName: formData.bankDetails?.accountName || '',
                    ifscCode: formData.bankDetails?.ifscCode || '',
                    swiftCode: formData.bankDetails?.swiftCode || '',
                  } as any,
                })}
              />
              <Input
                label="Account Number"
                value={formData.bankDetails?.accountNumber || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: {
                    ...formData.bankDetails,
                    bankName: formData.bankDetails?.bankName || '',
                    accountNumber: e.target.value,
                    accountName: formData.bankDetails?.accountName || '',
                    ifscCode: formData.bankDetails?.ifscCode || '',
                    swiftCode: formData.bankDetails?.swiftCode || '',
                  } as any,
                })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <Input
                label="Account Name"
                value={formData.bankDetails?.accountName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: {
                    ...formData.bankDetails,
                    bankName: formData.bankDetails?.bankName || '',
                    accountNumber: formData.bankDetails?.accountNumber || '',
                    accountName: e.target.value,
                    ifscCode: formData.bankDetails?.ifscCode || '',
                    swiftCode: formData.bankDetails?.swiftCode || '',
                  } as any,
                })}
              />
              <Input
                label="IFSC/SWIFT Code"
                value={formData.bankDetails?.ifscCode || formData.bankDetails?.swiftCode || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: {
                    ...formData.bankDetails,
                    bankName: formData.bankDetails?.bankName || '',
                    accountNumber: formData.bankDetails?.accountNumber || '',
                    accountName: formData.bankDetails?.accountName || '',
                    ifscCode: e.target.value,
                    swiftCode: e.target.value,
                  } as any,
                })}
              />
            </div>
          </div>
          {/* Product Categories */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Categories (Optional, comma-separated)
            </label>
            <Input
              value={Array.isArray(formData.productCategories) ? formData.productCategories.join(', ') : formData.productCategories || ''}
              onChange={(e) => setFormData({
                ...formData,
                productCategories: e.target.value ? e.target.value.split(',').map(c => c.trim()).filter(c => c) : [],
              })}
              placeholder="e.g., Vegetables, Fruits, Dairy"
            />
          </div>
          {/* Certifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Certifications (Optional, comma-separated)
            </label>
            <Input
              value={Array.isArray(formData.certifications) ? formData.certifications.join(', ') : formData.certifications || ''}
              onChange={(e) => setFormData({
                ...formData,
                certifications: e.target.value ? e.target.value.split(',').map(c => c.trim()).filter(c => c) : [],
              })}
              placeholder="e.g., ISO-9001, HACCP, Organic"
            />
          </div>
          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (Optional, comma-separated)
            </label>
            <Input
              value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags || ''}
              onChange={(e) => setFormData({
                ...formData,
                tags: e.target.value ? e.target.value.split(',').map(t => t.trim()).filter(t => t) : [],
              })}
              placeholder="e.g., preferred, local, reliable"
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
            <Button onClick={handleEdit} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update Supplier'}
            </Button>
          </div>
        </div>
      </Modal>
      {/* View Supplier Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedSupplier(null);
        }}
        title="Supplier Details"
        className="max-w-3xl"
      >
        {selectedSupplier && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <TruckIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {selectedSupplier.name}
                  </h3>
                  {selectedSupplier.isPreferred && (
                    <Badge variant="warning">
                      <CheckBadgeIcon className="w-3 h-3 mr-1" />
                      Preferred
                    </Badge>
                  )}
                  <Badge variant={selectedSupplier.isActive ? 'success' : 'danger'}>
                    {selectedSupplier.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                {selectedSupplier.code && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Code: {selectedSupplier.code}
                  </p>
                )}
                {selectedSupplier.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {selectedSupplier.description}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Contact Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{selectedSupplier.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{selectedSupplier.phone || selectedSupplier.phoneNumber}</span>
                  </div>
                  {selectedSupplier.alternatePhone && (
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">{selectedSupplier.alternatePhone}</span>
                    </div>
                  )}
                  {selectedSupplier.website && (
                    <div className="flex items-center gap-2">
                      <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                      <a href={selectedSupplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {selectedSupplier.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Address</h4>
                <div className="flex items-start gap-2 text-sm">
                  <MapPinIcon className="w-4 h-4 text-gray-400 mt-1" />
                  <div className="text-gray-600 dark:text-gray-400">
                    <p>{selectedSupplier.address?.street || ''}</p>
                    <p>{selectedSupplier.address?.city}, {selectedSupplier.address?.state} {selectedSupplier.address?.zipCode}</p>
                    <p>{selectedSupplier.address?.country}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Type</p>
                <Badge variant="secondary" className="capitalize">{selectedSupplier.type}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Payment Terms</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedSupplier.paymentTerms === 'net-7' ? 'Net 7' :
                   selectedSupplier.paymentTerms === 'net-15' ? 'Net 15' :
                   selectedSupplier.paymentTerms === 'net-30' ? 'Net 30' :
                   selectedSupplier.paymentTerms === 'net-60' ? 'Net 60' :
                   selectedSupplier.paymentTerms === 'cod' ? 'COD' :
                   selectedSupplier.paymentTerms === 'prepaid' ? 'Prepaid' :
                   selectedSupplier.paymentTerms}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rating</p>
                <div className="flex items-center gap-1">
                  {renderStars(selectedSupplier.rating)}
                  <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                    ({selectedSupplier.rating})
                  </span>
                </div>
              </div>
            </div>
            {(selectedSupplier.taxId || selectedSupplier.registrationNumber || selectedSupplier.creditLimit || selectedSupplier.currentBalance) && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Business Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {selectedSupplier.taxId && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Tax ID:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedSupplier.taxId}</span>
                    </div>
                  )}
                  {selectedSupplier.registrationNumber && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Registration #:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedSupplier.registrationNumber}</span>
                    </div>
                  )}
                  {selectedSupplier.creditLimit && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Credit Limit:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{formatCurrency(selectedSupplier.creditLimit)}</span>
                    </div>
                  )}
                  {selectedSupplier.currentBalance !== undefined && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Current Balance:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{formatCurrency(selectedSupplier.currentBalance)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Bank Details */}
            {selectedSupplier.bankDetails && selectedSupplier.bankDetails.bankName && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Bank Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Bank Name:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedSupplier.bankDetails.bankName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Account Number:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedSupplier.bankDetails.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Account Name:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedSupplier.bankDetails.accountName}</span>
                  </div>
                  {(selectedSupplier.bankDetails.ifscCode || selectedSupplier.bankDetails.swiftCode) && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">IFSC/SWIFT:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        {selectedSupplier.bankDetails.ifscCode || selectedSupplier.bankDetails.swiftCode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Performance Metrics */}
            {(selectedSupplier.totalOrders || selectedSupplier.totalPurchases || selectedSupplier.onTimeDeliveryRate || selectedSupplier.qualityScore) && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Performance Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {selectedSupplier.totalOrders !== undefined && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Total Orders:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedSupplier.totalOrders}</span>
                    </div>
                  )}
                  {selectedSupplier.totalPurchases !== undefined && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Total Purchases:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{formatCurrency(selectedSupplier.totalPurchases || 0)}</span>
                    </div>
                  )}
                  {selectedSupplier.onTimeDeliveryRate !== undefined && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">On-Time Delivery Rate:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedSupplier.onTimeDeliveryRate}%</span>
                    </div>
                  )}
                  {selectedSupplier.qualityScore !== undefined && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Quality Score:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">{selectedSupplier.qualityScore}/10</span>
                    </div>
                  )}
                  {selectedSupplier.lastOrderDate && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Last Order:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        {new Date(selectedSupplier.lastOrderDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedSupplier.firstOrderDate && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">First Order:</span>
                      <span className="ml-2 text-gray-900 dark:text-white font-medium">
                        {new Date(selectedSupplier.firstOrderDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {(selectedSupplier.productCategories?.length || selectedSupplier.certifications?.length) && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Categories & Certifications</h4>
                <div className="space-y-3">
                  {selectedSupplier.productCategories && selectedSupplier.productCategories.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Product Categories:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSupplier.productCategories.map((cat, idx) => (
                          <Badge key={idx} variant="secondary">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedSupplier.certifications && selectedSupplier.certifications.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Certifications:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSupplier.certifications.map((cert, idx) => (
                          <Badge key={idx} variant="warning">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Tags */}
            {selectedSupplier.tags && selectedSupplier.tags.length > 0 && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedSupplier.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            {selectedSupplier.notes && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSupplier.notes}</p>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => setIsViewModalOpen(false)}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  openEditModal(selectedSupplier);
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit Supplier
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
