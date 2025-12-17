'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import { useGetBranchesQuery, useUpdateBranchPublicUrlMutation } from '@/lib/api/endpoints/branchesApi';
import { useGetCategoriesQuery } from '@/lib/api/endpoints/categoriesApi';
import {
  useAddCustomDomainMutation,
  useGetCompaniesQuery,
  useGetCompanyByIdQuery,
  useGetCustomDomainInfoQuery,
  useRemoveCustomDomainMutation,
  useUploadCompanyLogoMutation,
  useVerifyCustomDomainMutation,
} from '@/lib/api/endpoints/companiesApi';
import {
  useCreatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
  useGetPaymentMethodsByCompanyQuery,
  useUpdatePaymentMethodMutation,
  type PaymentMethod,
} from '@/lib/api/endpoints/paymentMethodsApi';
import {
  useCreateServiceChargeSettingMutation,
  useCreateTaxSettingMutation,
  useDeleteServiceChargeSettingMutation,
  useDeleteTaxSettingMutation,
  useGetCompanySettingsQuery,
  useGetInvoiceSettingsQuery,
  useGetServiceChargeSettingsQuery,
  useGetTaxSettingsQuery,
  useUpdateCompanySettingsMutation,
  useUpdateInvoiceSettingsMutation,
  useUpdateServiceChargeSettingMutation,
  useUpdateTaxSettingMutation,
  type InvoiceSettings,
} from '@/lib/api/endpoints/settingsApi';
import { useGetSubscriptionByCompanyQuery } from '@/lib/api/endpoints/subscriptionsApi';
import { useAppSelector } from '@/lib/store';
import {
  ClipboardDocumentIcon,
  CogIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  DocumentIcon,
  GlobeAltIcon,
  LinkIcon,
  PencilIcon,
  PhotoIcon,
  PlusIcon,
  ReceiptPercentIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

interface TaxSetting {
  id: string;
  name: string;
  rate: number;
  type: 'percentage' | 'fixed';
  isActive: boolean;
  appliesTo: 'all' | 'food' | 'beverage' | 'alcohol';
  companyId: string;
}

interface ServiceChargeSetting {
  id: string;
  name: string;
  rate: number;
  isActive: boolean;
  appliesTo: 'all' | 'dine_in' | 'takeout' | 'delivery';
  companyId: string;
}

export default function SettingsPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  
  // Redirect if user doesn't have settings feature (auto-redirects to role-specific dashboard)
  useFeatureRedirect('settings');
  
  const isSuperAdmin = user?.role === 'super_admin';
  
  // For Super Admin: Use selected company from state, or fallback to companyContext/user
  // For regular users: Use their companyId
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  
  // Get companies list for Super Admin selector
  const { data: companiesData } = useGetCompaniesQuery({}, { skip: !isSuperAdmin });
  const companies = useMemo(() => {
    if (!companiesData || !isSuperAdmin) return [];
    if (Array.isArray(companiesData)) return companiesData;
    return companiesData.companies || [];
  }, [companiesData, isSuperAdmin]);
  
  // Determine the actual companyId to use
  const companyId = isSuperAdmin 
    ? (selectedCompanyId || companyContext?.companyId || '')
    : (companyContext?.companyId || user?.companyId || '');
  const branchId = user?.branchId || '';
  
  // Clear stale companyContext for Super Admin on mount
  useEffect(() => {
    if (isSuperAdmin && companyContext?.companyId && !selectedCompanyId) {
      // Don't auto-use companyContext for Super Admin - they should select explicitly
      setSelectedCompanyId('');
    }
  }, [isSuperAdmin, companyContext, selectedCompanyId]);
  const [activeTab, setActiveTab] = useState<'general' | 'taxes' | 'service-charges' | 'invoice' | 'payment-methods' | 'custom-domain'>('general');
  const [invoiceForm, setInvoiceForm] = useState<Partial<InvoiceSettings>>({});
  const [editingBranchUrl, setEditingBranchUrl] = useState<{ branchId: string; url: string } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // General Settings
  const { data: companySettings } = useGetCompanySettingsQuery(
    companyId, 
    { skip: !companyId }
  );
  const [updateCompanySettings] = useUpdateCompanySettingsMutation();
  const [uploadCompanyLogo, { isLoading: isUploadingLogo }] = useUploadCompanyLogoMutation();

  // Get categories for dynamic tax appliesTo options
  const { data: categoriesData } = useGetCategoriesQuery(
    { companyId, branchId },
    { skip: !companyId }
  );
  const categories = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData.categories || [];
  }, [categoriesData]);

  // Get unique category types from categories for tax appliesTo options
  const categoryTypeOptions = useMemo(() => {
    const predefined = [
      { value: 'all', label: 'All Items' },
      { value: 'food', label: 'Food Only' },
      { value: 'beverage', label: 'Beverages Only' },
      { value: 'alcohol', label: 'Alcohol Only' },
    ];
    
    // Get unique types from categories
    const categoryTypes = new Set<string>();
    categories.forEach((cat: any) => {
      if (cat.type) {
        categoryTypes.add(cat.type);
      }
    });
    
    // Add category types that aren't already in predefined list
    const predefinedMap = new Map(predefined.map(opt => [opt.value, opt]));
    const combined = [...predefined];
    
    categoryTypes.forEach((type) => {
      if (!predefinedMap.has(type)) {
        combined.push({
          value: type,
          label: type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ') + ' Only',
        });
      }
    });
    
    return combined;
  }, [categories]);

  // Get company data to access slug
  const { data: company, refetch: refetchCompany } = useGetCompanyByIdQuery(companyId, {
    skip: !companyId,
  });

  // Get subscription to check for customDomainEnabled feature
  const { data: subscription } = useGetSubscriptionByCompanyQuery(
    { companyId },
    { skip: !companyId }
  );

  // Check if custom domain feature is enabled (plan.limits or subscription.limits)
  const isCustomDomainEnabled =
    (subscription as any)?.limits?.customDomainEnabled ??
    (subscription?.plan?.limits as any)?.customDomainEnabled ??
    false;

  // Get branches for the company
  const { data: branchesData, refetch: refetchBranches } = useGetBranchesQuery(
    { companyId, limit: 100 },
    { skip: !companyId }
  );
  const branches = branchesData?.branches || [];
  const currentBranch = branches.find(b => b.id === branchId);
  
  // Auto-refetch branches if slug is missing (backend will auto-generate it)
  useEffect(() => {
    if (currentBranch && !currentBranch.slug && company?.slug) {
      // Small delay to let backend process the auto-generation
      const timer = setTimeout(() => {
        refetchBranches();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentBranch?.slug, company?.slug, refetchBranches]);

  // Debug: Log branch and company data
  useEffect(() => {
    if (currentBranch) {
      console.log('🔍 Current Branch Data:', {
        id: currentBranch.id,
        name: currentBranch.name,
        slug: currentBranch.slug,
        hasSlug: !!currentBranch.slug,
        publicUrl: currentBranch.publicUrl,
      });
    }
    if (company) {
      console.log('🔍 Company Data:', {
        id: company.id,
        name: company.name,
        slug: company.slug,
        hasSlug: !!company.slug,
      });
    }
  }, [currentBranch, company]);

  // Update branch public URL mutation
  const [updateBranchPublicUrl] = useUpdateBranchPublicUrlMutation();

  // Helper function to generate public URL from slugs or custom domain
  const generatePublicUrl = (companySlug?: string, branchSlug?: string): string | null => {
    // If custom domain is verified, use it instead of slug-based URLs
    if (company?.customDomain && company?.domainVerified) {
      const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https://' : 'https://';
      if (branchSlug) {
        return `${protocol}${company.customDomain}/${branchSlug}`;
      }
      return `${protocol}${company.customDomain}`;
    }
    
    // Fallback to slug-based URLs
    if (!companySlug) return null;
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (branchSlug) {
      return `${baseUrl}/${companySlug}/${branchSlug}`;
    }
    return `${baseUrl}/${companySlug}`;
  };

  // Generate company-level public URL (fallback)
  const companyPublicUrl = generatePublicUrl(company?.slug);

  // Generate branch public URL from slugs if not stored
  const getBranchPublicUrl = (branch: typeof currentBranch): string | null => {
    if (branch?.publicUrl) {
      return branch.publicUrl;
    }
    // Generate from slugs
    if (company?.slug && branch?.slug) {
      return generatePublicUrl(company.slug, branch.slug);
    }
    return null;
  };

  const copyPublicUrl = (url: string) => {
    if (!url) {
      toast.error('Public URL not available.');
      return;
    }
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Public URL copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy URL');
    });
  };

  const handleUpdateBranchUrl = async (branchId: string, newUrl: string) => {
    if (!newUrl.trim()) {
      toast.error('Public URL cannot be empty');
      return;
    }
    try {
      await updateBranchPublicUrl({ id: branchId, publicUrl: newUrl.trim() }).unwrap();
      toast.success('Branch public URL updated successfully!');
      setEditingBranchUrl(null);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update branch URL');
    }
  };

  // Tax Settings
  const { data: taxSettings = [] } = useGetTaxSettingsQuery(
    companyId, 
    { skip: !companyId }
  );
  const [createTaxSetting] = useCreateTaxSettingMutation();
  const [updateTaxSetting] = useUpdateTaxSettingMutation();
  const [deleteTaxSetting] = useDeleteTaxSettingMutation();

  // Service Charge Settings
  const { data: serviceChargeSettings = [] } = useGetServiceChargeSettingsQuery(
    companyId, 
    { skip: !companyId }
  );
  const [createServiceChargeSetting] = useCreateServiceChargeSettingMutation();
  const [updateServiceChargeSetting] = useUpdateServiceChargeSettingMutation();
  const [deleteServiceChargeSetting] = useDeleteServiceChargeSettingMutation();

  // Invoice Settings
  const { data: invoiceSettings } = useGetInvoiceSettingsQuery(
    companyId, 
    { skip: !companyId }
  );
  const [updateInvoiceSettings] = useUpdateInvoiceSettingsMutation();

  // Payment Methods
  const { data: paymentMethods = [], isLoading: paymentMethodsLoading, refetch: refetchPaymentMethods } = useGetPaymentMethodsByCompanyQuery(
    companyId,
    { skip: !companyId }
  );
  const [createPaymentMethod, { isLoading: isCreatingPaymentMethod }] = useCreatePaymentMethodMutation();
  const [updatePaymentMethod, { isLoading: isUpdatingPaymentMethod }] = useUpdatePaymentMethodMutation();
  const [deletePaymentMethod, { isLoading: isDeletingPaymentMethod }] = useDeletePaymentMethodMutation();
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethodForm, setPaymentMethodForm] = useState({
    companyId: companyId,
    name: '',
    code: '',
    displayName: '',
    description: '',
    type: 'other' as PaymentMethod['type'],
    icon: '',
    color: '#10b981',
    isActive: true,
    sortOrder: 0,
    requiresReference: false,
    requiresAuthorization: false,
    allowsPartialPayment: false,
    allowsChangeDue: true,
  });

  // Modal states
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [isServiceChargeModalOpen, setIsServiceChargeModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxSetting | null>(null);
  const [editingServiceCharge, setEditingServiceCharge] = useState<ServiceChargeSetting | null>(null);

  // Form states
  const [taxForm, setTaxForm] = useState({
    name: '',
    rate: 0,
    type: 'percentage' as 'percentage' | 'fixed',
    isActive: true,
    appliesTo: 'all' as 'all' | 'food' | 'beverage' | 'alcohol',
  });

  const [serviceChargeForm, setServiceChargeForm] = useState({
    name: '',
    rate: 0,
    isActive: true,
    appliesTo: 'all' as 'all' | 'dine_in' | 'takeout' | 'delivery',
  });

  const resetTaxForm = () => {
    setTaxForm({
      name: '',
      rate: 0,
      type: 'percentage',
      isActive: true,
      appliesTo: 'all',
    });
    setEditingTax(null);
  };

  const resetServiceChargeForm = () => {
    setServiceChargeForm({
      name: '',
      rate: 0,
      isActive: true,
      appliesTo: 'all',
    });
    setEditingServiceCharge(null);
  };

  // Sync companyId in payment method form
  useEffect(() => {
    if (companyId) {
      setPaymentMethodForm(prev => ({ ...prev, companyId }));
    }
  }, [companyId]);

  const handleCreateTax = async () => {
    if (!taxForm.name.trim()) {
      toast.error('Tax name is required');
      return;
    }
    if (taxForm.rate <= 0) {
      toast.error('Tax rate must be greater than 0');
      return;
    }
    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }

    try {
      await createTaxSetting({
        ...taxForm,
        companyId,
      }).unwrap();
      toast.success('Tax setting created successfully');
      setIsTaxModalOpen(false);
      resetTaxForm();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create tax setting');
    }
  };

  const handleUpdateTax = async () => {
    if (!editingTax) return;

    try {
      await updateTaxSetting({
        id: editingTax.id,
        data: taxForm,
      }).unwrap();
      toast.success('Tax setting updated successfully');
      setIsTaxModalOpen(false);
      resetTaxForm();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update tax setting');
    }
  };

  const handleDeleteTax = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteTaxSetting(id).unwrap();
      toast.success('Tax setting deleted successfully');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete tax setting');
    }
  };

  const handleCreateServiceCharge = async () => {
    if (!serviceChargeForm.name.trim()) {
      toast.error('Service charge name is required');
      return;
    }
    if (serviceChargeForm.rate <= 0) {
      toast.error('Service charge rate must be greater than 0');
      return;
    }
    if (!companyId) {
      toast.error('Company ID is required');
      return;
    }

    try {
      await createServiceChargeSetting({
        ...serviceChargeForm,
        companyId,
      }).unwrap();
      toast.success('Service charge setting created successfully');
      setIsServiceChargeModalOpen(false);
      resetServiceChargeForm();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create service charge setting');
    }
  };

  const handleUpdateServiceCharge = async () => {
    if (!editingServiceCharge) return;

    try {
      await updateServiceChargeSetting({
        id: editingServiceCharge.id,
        data: serviceChargeForm,
      }).unwrap();
      toast.success('Service charge setting updated successfully');
      setIsServiceChargeModalOpen(false);
      resetServiceChargeForm();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update service charge setting');
    }
  };

  const handleDeleteServiceCharge = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteServiceChargeSetting(id).unwrap();
      toast.success('Service charge setting deleted successfully');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete service charge setting');
    }
  };

  const editTax = (tax: TaxSetting) => {
    setEditingTax(tax);
    setTaxForm({
      name: tax.name,
      rate: tax.rate,
      type: tax.type,
      isActive: tax.isActive,
      appliesTo: tax.appliesTo,
    });
    setIsTaxModalOpen(true);
  };

  const editServiceCharge = (serviceCharge: ServiceChargeSetting) => {
    setEditingServiceCharge(serviceCharge);
    setServiceChargeForm({
      name: serviceCharge.name,
      rate: serviceCharge.rate,
      isActive: serviceCharge.isActive,
      appliesTo: serviceCharge.appliesTo,
    });
    setIsServiceChargeModalOpen(true);
  };

  const updateInvoiceForm = (updates: Partial<InvoiceSettings>) => {
    setInvoiceForm((prev: Partial<InvoiceSettings>) => ({
      ...prev,
      ...updates,
    }));
  };

  const tabs = [
    { id: 'general', label: 'General', icon: CogIcon },
    { id: 'taxes', label: 'Tax Settings', icon: ReceiptPercentIcon },
    { id: 'service-charges', label: 'Service Charges', icon: CurrencyDollarIcon },
    { id: 'invoice', label: 'Invoice Settings', icon: DocumentIcon },
    { id: 'payment-methods', label: 'Payment Methods', icon: CreditCardIcon },
    // Only show custom domain tab if feature is enabled in subscription
    ...(isCustomDomainEnabled ? [{ id: 'custom-domain' as const, label: 'Custom Domain', icon: GlobeAltIcon }] : []),
  ];

  const normalizedTaxSettings = Array.isArray(taxSettings)
    ? taxSettings
    : (taxSettings as any)?.items || [];

  const normalizedServiceCharges = Array.isArray(serviceChargeSettings)
    ? serviceChargeSettings
    : (serviceChargeSettings as any)?.items || [];

  useEffect(() => {
    if (invoiceSettings) {
      setInvoiceForm({
        invoicePrefix: invoiceSettings.invoicePrefix,
        invoiceNumber: invoiceSettings.invoiceNumber,
        showLogo: invoiceSettings.showLogo,
        showAddress: invoiceSettings.showAddress,
        showPhone: invoiceSettings.showPhone,
        showEmail: invoiceSettings.showEmail,
        showWebsite: invoiceSettings.showWebsite,
        footerText: invoiceSettings.footerText,
        termsAndConditions: invoiceSettings.termsAndConditions,
        logoUrl: invoiceSettings.logoUrl,
      });
    }
  }, [invoiceSettings]);

  useEffect(() => {
    console.log('Company logo useEffect:', {
      hasCompany: !!company,
      hasLogo: !!company?.logo,
      logoValue: company?.logo?.substring(0, 50) + '...' || 'null',
      companyKeys: company ? Object.keys(company) : [],
    });

    if (company?.logo) {
      // Cloudinary URLs are already full HTTPS URLs, no need to modify
      // Legacy local uploads starting with /uploads/ need base URL prepended
      let logoUrl = company.logo;
      if (logoUrl.startsWith('/uploads/')) {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
        const baseUrl = apiBaseUrl.replace('/api/v1', '');
        logoUrl = `${baseUrl}${logoUrl}`;
      }
      // Cloudinary URLs (https://res.cloudinary.com/...) are used as-is
      console.log('Setting logo preview:', logoUrl.substring(0, 50) + '...');
      setLogoPreview(logoUrl);
    } else {
      // Clear preview if no logo
      console.log('No logo found, clearing preview');
      setLogoPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.logo]);

  const handleLogoUpload = async () => {
    if (!logoFile) {
      toast.error('Please select a logo file');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(logoFile.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 5MB)
    if (logoFile.size > 5 * 1024 * 1024) {
      toast.error('Logo file size must be less than 5MB');
      return;
    }

    try {
      const result = await uploadCompanyLogo(logoFile).unwrap();
      console.log('Logo upload successful, result:', result);
      toast.success('Logo uploaded successfully');
      
      // Set logo preview immediately with the returned URL
      if (result.logoUrl) {
        console.log('Setting logo preview immediately:', result.logoUrl.substring(0, 50) + '...');
        setLogoPreview(result.logoUrl);
      }
      
      // Clear the file input
      setLogoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Refetch company data after a short delay to ensure database is updated
      setTimeout(async () => {
        try {
          console.log('Refetching company data...');
          const refetchedData = await refetchCompany();
          console.log('Company refetched:', {
            hasData: !!refetchedData.data,
            hasLogo: !!refetchedData.data?.logo,
            logoValue: refetchedData.data?.logo?.substring(0, 50) + '...' || 'null',
          });
        } catch (refetchError) {
          console.error('Error refetching company:', refetchError);
        }
      }, 1000);
      
      // Update invoice settings logo URL if available
      if (invoiceForm.showLogo && result.logoUrl) {
        await updateInvoiceSettings({
          companyId,
          data: { logoUrl: result.logoUrl }
        }).unwrap();
      }
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to upload logo';
      console.error('Logo upload error:', error);
      toast.error(errorMessage);
      // Clear preview on error
      setLogoPreview(null);
      setLogoFile(null);
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      // Create preview from file
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // If no file selected, restore company logo if it exists
      if (company?.logo) {
        let logoUrl = company.logo;
        // Handle legacy local uploads
        if (logoUrl.startsWith('/uploads/')) {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
          const baseUrl = apiBaseUrl.replace('/api/v1', '');
          logoUrl = `${baseUrl}${logoUrl}`;
        }
        // Cloudinary URLs are already full URLs, use as-is
        setLogoPreview(logoUrl);
      }
      setLogoFile(null);
    }
  };

  const handleRemoveLogo = async () => {
    try {
      // You might want to add a delete logo endpoint
      setLogoPreview(null);
      setLogoFile(null);
      toast.success('Logo removed');
    } catch (error: any) {
      toast.error('Failed to remove logo');
    }
  };

  // Show company selector for Super Admin if no company selected
  if (isSuperAdmin && !companyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure restaurant settings and preferences
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Select Company</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                As a Super Admin, please select a company to view or manage its settings.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company
                </label>
                <Select
                  options={companies.map((c: any) => ({
                    value: c._id || c.id,
                    label: c.name || 'Unknown Company',
                  }))}
                  value={selectedCompanyId}
                  onChange={(value) => setSelectedCompanyId(value)}
                  placeholder="Select a company..."
                />
              </div>
              {companies.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No companies found. <a href="/dashboard/companies" className="text-primary-600 hover:underline">Create a company</a> first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Show message for non-Super Admin users without company
  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-96 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            No company selected
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            Please select a company to configure settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isSuperAdmin ? 'Manage company settings (Super Admin View)' : 'Configure your restaurant settings and preferences'}
          </p>
          {isSuperAdmin && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selected Company
              </label>
              <Select
                options={companies.map((c: any) => ({
                  value: c._id || c.id,
                  label: c.name || 'Unknown Company',
                }))}
                value={companyId}
                onChange={(value) => setSelectedCompanyId(value)}
                placeholder="Select a company..."
              />
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            <strong>Note:</strong> These are company-wide settings. For branch-specific POS settings (receipt printing, tax rates for POS), visit{' '}
            <a href="/dashboard/pos-settings" className="text-blue-600 dark:text-blue-400 hover:underline">
              POS Settings
            </a>
            .
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Current Branch Public URL Card */}
          {currentBranch && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Your Branch Public Website URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const branchPublicUrl = getBranchPublicUrl(currentBranch!);
                  return branchPublicUrl ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Share this URL with your customers to access your branch's online menu, place orders, and view your restaurant information.
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center gap-2">
                          <LinkIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <input
                            type="text"
                            value={branchPublicUrl}
                            readOnly
                            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm font-mono"
                          />
                        </div>
                        <Button
                          onClick={() => copyPublicUrl(branchPublicUrl)}
                          variant="primary"
                          className="flex items-center gap-2"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                          Copy URL
                        </Button>
                      </div>
                      {(!currentBranch?.publicUrl && (company?.slug && currentBranch?.slug)) && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          This URL is generated from your company slug ({company.slug}) and branch slug ({currentBranch.slug})
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={branchPublicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <GlobeAltIcon className="w-4 h-4" />
                          Open in new tab
                        </a>
                        <span className="text-gray-400 dark:text-gray-600">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          This URL is automatically included in your digital receipts
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                        <strong>Public URL not configured for this branch</strong>
                      </p>
                      <div className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                        {!company?.slug && (
                          <p>⚠️ <strong>Company slug is missing.</strong> Go to <a href="/dashboard/companies" className="underline font-semibold">Companies</a> page to set it.</p>
                        )}
                        {!currentBranch?.slug && (
                          <p>⚠️ <strong>Branch slug is missing.</strong> Go to <a href="/dashboard/branches" className="underline font-semibold">Branches</a> page to set it.</p>
                        )}
                        {company?.slug && currentBranch?.slug && (
                          <p>⚠️ Both slugs are configured but URL generation failed. Please check the configuration.</p>
                        )}
                        {isSuperAdmin ? (
                          <p className="mt-2">
                            {company?.slug && currentBranch?.slug 
                              ? 'You can set a custom URL below if needed.'
                              : 'Configure the missing slugs above, or set a custom URL below.'}
                          </p>
                        ) : (
                          <p className="mt-2">Please contact your administrator to configure the missing slugs.</p>
                        )}
                      </div>
                      {isSuperAdmin && (
                        <div className="mt-3 pt-3 border-t border-yellow-300 dark:border-yellow-700">
                          <p className="text-xs text-yellow-800 dark:text-yellow-400 font-semibold mb-1">Quick Actions:</p>
                          <div className="flex flex-wrap gap-2">
                            {!company?.slug && (
                              <a 
                                href="/dashboard/companies" 
                                className="text-xs px-3 py-1 bg-yellow-100 dark:bg-yellow-900/50 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/70 transition-colors"
                              >
                                Set Company Slug
                              </a>
                            )}
                            {!currentBranch?.slug && (
                              <a 
                                href="/dashboard/branches" 
                                className="text-xs px-3 py-1 bg-yellow-100 dark:bg-yellow-900/50 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/70 transition-colors"
                              >
                                Set Branch Slug
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

                {/* All Branches Public URLs (Super Admin Only) */}
                {isSuperAdmin && branches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  All Branch Public URLs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {branches.map((branch) => (
                    <div key={branch.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {branch.name}
                          </h3>
                          {editingBranchUrl?.branchId === branch.id ? (
                            <div className="mt-2 flex items-center gap-2">
                              <Input
                                value={editingBranchUrl.url}
                                onChange={(e) => setEditingBranchUrl({ ...editingBranchUrl, url: e.target.value })}
                                placeholder="https://yourdomain.com/company-slug/branch-slug"
                                className="flex-1"
                              />
                              <Button
                                onClick={() => handleUpdateBranchUrl(branch.id, editingBranchUrl.url)}
                                size="sm"
                                variant="primary"
                              >
                                Save
                              </Button>
                              <Button
                                onClick={() => setEditingBranchUrl(null)}
                                size="sm"
                                variant="secondary"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="mt-2">
                              {(() => {
                                const branchUrl = branch.publicUrl || generatePublicUrl(company?.slug, branch.slug);
                                return branchUrl ? (
                                  <div className="flex items-center gap-2">
                                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded flex-1 font-mono">
                                      {branchUrl}
                                      {!branch.publicUrl && (company?.slug && branch.slug) && (
                                        <span className="text-xs text-gray-500 ml-2">(from slugs)</span>
                                      )}
                                    </code>
                                    <Button
                                      onClick={() => copyPublicUrl(branchUrl)}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <ClipboardDocumentIcon className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      onClick={() => setEditingBranchUrl({ branchId: branch.id, url: branchUrl })}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                                      No URL configured
                                      {(!company?.slug || !branch.slug) && (
                                        <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                                          (slugs missing)
                                        </span>
                                      )}
                                    </span>
                                    <Button
                                      onClick={() => {
                                        const defaultUrl = generatePublicUrl(
                                          company?.slug, 
                                          branch.slug || branch.name.toLowerCase().replace(/\s+/g, '-')
                                        ) || '';
                                        setEditingBranchUrl({ branchId: branch.id, url: defaultUrl });
                                      }}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <PlusIcon className="w-4 h-4 mr-1" />
                                      Add URL
                                    </Button>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
                )}

                {/* Company-level URL (Fallback) */}
                {!currentBranch && companyPublicUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5" />
                  Company Public Website URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Share this URL with your customers to access your online menu, place orders, and view your restaurant information.
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <input
                        type="text"
                        value={companyPublicUrl}
                        readOnly
                        className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white text-sm font-mono"
                      />
                    </div>
                    <Button
                      onClick={() => copyPublicUrl(companyPublicUrl)}
                      variant="primary"
                      className="flex items-center gap-2"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      Copy URL
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={companyPublicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <GlobeAltIcon className="w-4 h-4" />
                      Open in new tab
                    </a>
                    <span className="text-gray-400 dark:text-gray-600">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      This URL is automatically included in your digital receipts
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
                )}

                {/* Company Logo Upload */}
                <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhotoIcon className="w-5 h-5" />
                Company Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                {logoPreview && (
                  <div className="relative">
                    {logoPreview.startsWith('data:') || logoPreview.startsWith('http') ? (
                      <img
                        src={logoPreview}
                        alt="Company Logo"
                        className="w-32 h-32 object-contain border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 p-2"
                      />
                    ) : (
                      <Image
                        src={logoPreview}
                        alt="Company Logo"
                        width={128}
                        height={128}
                        className="object-contain border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 p-2"
                      />
                    )}
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      type="button"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload Logo
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleLogoFileChange}
                      className="block w-full text-sm text-gray-500 dark:text-gray-400
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100
                        dark:file:bg-blue-900 dark:file:text-blue-300
                        dark:hover:file:bg-blue-800
                        cursor-pointer"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB
                    </p>
                  </div>
                  {logoFile && (
                    <Button
                      onClick={handleLogoUpload}
                      disabled={isUploadingLogo}
                      variant="primary"
                    >
                      {isUploadingLogo ? 'Uploading...' : 'Upload Logo'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GlobeAltIcon className="w-5 h-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency
                </label>
                <Select
                  options={[
                    { value: 'BDT', label: 'Bangladeshi Taka (BDT)' },
                    { value: 'USD', label: 'US Dollar (USD)' },
                    { value: 'EUR', label: 'Euro (EUR)' },
                    { value: 'GBP', label: 'British Pound (GBP)' },
                    { value: 'CAD', label: 'Canadian Dollar (CAD)' },
                    { value: 'AUD', label: 'Australian Dollar (AUD)' },
                    { value: 'INR', label: 'Indian Rupee (INR)' },
                    { value: 'PKR', label: 'Pakistani Rupee (PKR)' },
                  ]}
                  value={companySettings?.currency || 'BDT'}
                  onChange={async (value) => {
                    try {
                      await updateCompanySettings({
                        companyId,
                        data: { currency: value }
                      }).unwrap();
                      toast.success('Currency updated successfully');
                    } catch (error: any) {
                      toast.error(error.data?.message || 'Failed to update currency');
                    }
                  }}
                  disabled={!companyId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timezone
                </label>
                <Select
                  options={[
                    { value: 'Asia/Dhaka', label: 'Bangladesh (BST)' },
                    { value: 'America/New_York', label: 'Eastern Time (ET)' },
                    { value: 'America/Chicago', label: 'Central Time (CT)' },
                    { value: 'America/Denver', label: 'Mountain Time (MT)' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                    { value: 'Europe/London', label: 'London (GMT)' },
                    { value: 'Europe/Paris', label: 'Paris (CET)' },
                    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
                    { value: 'Asia/Kolkata', label: 'India (IST)' },
                    { value: 'Asia/Karachi', label: 'Pakistan (PKT)' },
                  ]}
                  value={companySettings?.timezone || 'Asia/Dhaka'}
                  onChange={async (value) => {
                    try {
                      await updateCompanySettings({
                        companyId,
                        data: { timezone: value }
                      }).unwrap();
                      toast.success('Timezone updated successfully');
                    } catch (error: any) {
                      toast.error(error.data?.message || 'Failed to update timezone');
                    }
                  }}
                  disabled={!companyId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Format
                </label>
                <Select
                  options={[
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                  ]}
                  value={companySettings?.dateFormat || 'MM/DD/YYYY'}
                  onChange={async (value) => {
                    try {
                      await updateCompanySettings({
                        companyId,
                        data: { dateFormat: value }
                      }).unwrap();
                      toast.success('Date format updated successfully');
                    } catch (error: any) {
                      toast.error(error.data?.message || 'Failed to update date format');
                    }
                  }}
                  disabled={!companyId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time Format
                </label>
                <Select
                  options={[
                    { value: '12h', label: '12 Hour (AM/PM)' },
                    { value: '24h', label: '24 Hour' },
                  ]}
                  value={companySettings?.timeFormat || '12h'}
                  onChange={async (value) => {
                    try {
                      await updateCompanySettings({
                        companyId,
                        data: { timeFormat: value as '12h' | '24h' }
                      }).unwrap();
                      toast.success('Time format updated successfully');
                    } catch (error: any) {
                      toast.error(error.data?.message || 'Failed to update time format');
                    }
                  }}
                  disabled={!companyId}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      )}

      {activeTab === 'taxes' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ReceiptPercentIcon className="w-5 h-5" />
                  Tax Settings
                </CardTitle>
                <Button onClick={() => setIsTaxModalOpen(true)}>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Tax
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {normalizedTaxSettings.map((tax: TaxSetting) => (
                  <div key={tax.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">{tax.name}</h3>
                        <Badge variant={tax.isActive ? 'success' : 'secondary'}>
                          {tax.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="info">
                          {tax.type === 'percentage' ? `${tax.rate}%` : `$${tax.rate}`}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Applies to: {tax.appliesTo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editTax(tax)}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTax(tax.id, tax.name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {normalizedTaxSettings.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No tax settings configured
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'service-charges' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CurrencyDollarIcon className="w-5 h-5" />
                  Service Charge Settings
                </CardTitle>
                <Button onClick={() => setIsServiceChargeModalOpen(true)}>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Add Service Charge
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {normalizedServiceCharges.map((charge: ServiceChargeSetting) => (
                  <div key={charge.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">{charge.name}</h3>
                        <Badge variant={charge.isActive ? 'success' : 'secondary'}>
                          {charge.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="info">
                          {charge.rate}%
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Applies to: {charge.appliesTo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editServiceCharge(charge)}
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteServiceCharge(charge.id, charge.name)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {normalizedServiceCharges.length === 0 && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No service charge settings configured
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'invoice' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DocumentIcon className="w-5 h-5" />
              Invoice Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Input
                  label="Invoice Prefix"
                  value={invoiceForm.invoicePrefix ?? ''}
                  onChange={(e) => {
                    updateInvoiceForm({ invoicePrefix: e.target.value });
                  }}
                  onBlur={async () => {
                    if (invoiceForm.invoicePrefix !== undefined) {
                      try {
                        await updateInvoiceSettings({
                          companyId,
                          data: { invoicePrefix: invoiceForm.invoicePrefix }
                        }).unwrap();
                        toast.success('Invoice prefix updated');
                      } catch (error: any) {
                        toast.error(error.data?.message || 'Failed to update invoice prefix');
                      }
                    }
                  }}
                  disabled={!companyId}
                  placeholder="INV"
                />
              </div>

              <div>
                <Input
                  label="Next Invoice Number"
                  type="number"
                  value={invoiceForm.invoiceNumber ?? 1}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value >= 1) {
                      updateInvoiceForm({ invoiceNumber: value });
                    }
                  }}
                  onBlur={async () => {
                    if (invoiceForm.invoiceNumber !== undefined && invoiceForm.invoiceNumber >= 1) {
                      try {
                        await updateInvoiceSettings({
                          companyId,
                          data: { invoiceNumber: invoiceForm.invoiceNumber }
                        }).unwrap();
                        toast.success('Invoice number updated');
                      } catch (error: any) {
                        toast.error(error.data?.message || 'Failed to update invoice number');
                      }
                    } else if (invoiceForm.invoiceNumber !== undefined && invoiceForm.invoiceNumber < 1) {
                        toast.error('Invoice number must be a positive number');
                        updateInvoiceForm({ invoiceNumber: 1 });
                      }
                  }}
                  disabled={!companyId}
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Invoice Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={invoiceForm.showLogo ?? false}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      updateInvoiceForm({ showLogo: checked });
                      try {
                        await updateInvoiceSettings({
                          companyId,
                          data: { 
                            showLogo: checked,
                            logoUrl: checked && company?.logo ? company.logo : invoiceForm.logoUrl
                          }
                        }).unwrap();
                        toast.success('Invoice settings updated');
                      } catch (error: any) {
                        toast.error(error.data?.message || 'Failed to update invoice settings');
                        updateInvoiceForm({ showLogo: !checked }); // Revert on error
                      }
                    }}
                    disabled={!companyId}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show company logo</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={invoiceForm.showAddress ?? false}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      updateInvoiceForm({ showAddress: checked });
                      try {
                        await updateInvoiceSettings({
                          companyId,
                          data: { showAddress: checked },
                        }).unwrap();
                        toast.success('Invoice settings updated');
                      } catch (error: any) {
                        toast.error(error.data?.message || 'Failed to update invoice settings');
                        updateInvoiceForm({ showAddress: !checked }); // Revert on error
                      }
                    }}
                    disabled={!companyId}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show company address</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={invoiceForm.showPhone ?? false}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      updateInvoiceForm({ showPhone: checked });
                      try {
                        await updateInvoiceSettings({
                          companyId,
                          data: { showPhone: checked }
                        }).unwrap();
                        toast.success('Invoice settings updated');
                      } catch (error: any) {
                        toast.error(error.data?.message || 'Failed to update invoice settings');
                        updateInvoiceForm({ showPhone: !checked }); // Revert on error
                      }
                    }}
                    disabled={!companyId}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show phone number</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={invoiceForm.showEmail ?? false}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      updateInvoiceForm({ showEmail: checked });
                      try {
                        await updateInvoiceSettings({
                          companyId,
                          data: { showEmail: checked }
                        }).unwrap();
                        toast.success('Invoice settings updated');
                      } catch (error: any) {
                        toast.error(error.data?.message || 'Failed to update invoice settings');
                        updateInvoiceForm({ showEmail: !checked }); // Revert on error
                      }
                    }}
                    disabled={!companyId}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show email address</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Footer Text
              </label>
              <textarea
                rows={3}
                value={invoiceForm.footerText ?? ''}
                onChange={(e) => {
                  updateInvoiceForm({ footerText: e.target.value });
                }}
                onBlur={async () => {
                  try {
                    await updateInvoiceSettings({
                      companyId,
                      data: { footerText: invoiceForm.footerText }
                    }).unwrap();
                    toast.success('Footer text updated');
                  } catch (error: any) {
                    toast.error(error.data?.message || 'Failed to update footer text');
                  }
                }}
                disabled={!companyId}
                className="input w-full"
                placeholder="Thank you for your business!"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Terms and Conditions
              </label>
              <textarea
                rows={4}
                value={invoiceForm.termsAndConditions ?? ''}
                onChange={(e) => {
                  updateInvoiceForm({ termsAndConditions: e.target.value });
                }}
                onBlur={async () => {
                  try {
                    await updateInvoiceSettings({
                      companyId,
                      data: { termsAndConditions: invoiceForm.termsAndConditions }
                    }).unwrap();
                    toast.success('Terms and conditions updated');
                  } catch (error: any) {
                    toast.error(error.data?.message || 'Failed to update terms and conditions');
                  }
                }}
                disabled={!companyId}
                className="input w-full"
                placeholder="Payment is due within 30 days..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods Tab */}
      {activeTab === 'payment-methods' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5" />
                Payment Methods
              </CardTitle>
              <Button
                onClick={() => {
                  setEditingPaymentMethod(null);
                  setPaymentMethodForm({
                    companyId: companyId,
                    name: '',
                    code: '',
                    displayName: '',
                    description: '',
                    type: 'other',
                    icon: '',
                    color: '#10b981',
                    isActive: true,
                    sortOrder: paymentMethods.length,
                    requiresReference: false,
                    requiresAuthorization: false,
                    allowsPartialPayment: false,
                    allowsChangeDue: true,
                  });
                  setIsPaymentMethodModalOpen(true);
                }}
                className="flex items-center gap-2"
                disabled={!companyId}
              >
                <PlusIcon className="w-4 h-4" />
                Add Payment Method
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Manage company-specific payment methods. System-wide payment methods are available to all companies.
            </p>
          </CardHeader>
          <CardContent>
            {paymentMethodsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading payment methods...</p>
              </div>
            ) : paymentMethods.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CreditCardIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No company-specific payment methods configured</p>
                <p className="text-sm mt-1">Add a payment method or use system-wide methods</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: method.color || '#10b981' }}
                      >
                        {method.icon || <CreditCardIcon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {method.displayName || method.name}
                          </h3>
                          <Badge className={method.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {method.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {!method.companyId && (
                            <Badge className="bg-blue-100 text-blue-800">System</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{method.code}</p>
                        {method.description && (
                          <p className="text-sm text-gray-400 mt-1">{method.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {method.companyId && (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingPaymentMethod(method);
                              setPaymentMethodForm({
                                companyId: companyId,
                                name: method.name,
                                code: method.code,
                                displayName: method.displayName || '',
                                description: method.description || '',
                                type: method.type,
                                icon: method.icon || '',
                                color: method.color || '#10b981',
                                isActive: method.isActive,
                                sortOrder: method.sortOrder,
                                requiresReference: method.requiresReference,
                                requiresAuthorization: method.requiresAuthorization,
                                allowsPartialPayment: method.allowsPartialPayment,
                                allowsChangeDue: method.allowsChangeDue,
                              });
                              setIsPaymentMethodModalOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to delete "${method.name}"?`)) {
                                try {
                                  await deletePaymentMethod(method.id).unwrap();
                                  toast.success('Payment method deleted');
                                  refetchPaymentMethods();
                                } catch (error: any) {
                                  toast.error(error?.data?.message || 'Failed to delete payment method');
                                }
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tax Modal */}
      <Modal
        isOpen={isTaxModalOpen}
        onClose={() => {
          setIsTaxModalOpen(false);
          resetTaxForm();
        }}
        title={editingTax ? 'Edit Tax Setting' : 'Create Tax Setting'}
        className="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="Tax Name"
            value={taxForm.name}
            onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
            placeholder="e.g., Sales Tax"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <Select
                options={[
                  { value: 'percentage', label: 'Percentage' },
                  { value: 'fixed', label: 'Fixed Amount' },
                ]}
                value={taxForm.type}
                onChange={(value) => setTaxForm({ ...taxForm, type: value as 'percentage' | 'fixed' })}
              />
            </div>

            <Input
              label={taxForm.type === 'percentage' ? 'Rate (%)' : 'Fixed Amount'}
              type="number"
              step="0.01"
              value={taxForm.rate}
              onChange={(e) => setTaxForm({ ...taxForm, rate: parseFloat(e.target.value) || 0 })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Applies To
            </label>
            <Select
              options={categoryTypeOptions}
              value={taxForm.appliesTo}
              onChange={(value) => setTaxForm({ ...taxForm, appliesTo: value as any })}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="taxActive"
              checked={taxForm.isActive}
              onChange={(e) => setTaxForm({ ...taxForm, isActive: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="taxActive" className="text-sm text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsTaxModalOpen(false);
                resetTaxForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingTax ? handleUpdateTax : handleCreateTax}>
              {editingTax ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Service Charge Modal */}
      <Modal
        isOpen={isServiceChargeModalOpen}
        onClose={() => {
          setIsServiceChargeModalOpen(false);
          resetServiceChargeForm();
        }}
        title={editingServiceCharge ? 'Edit Service Charge' : 'Create Service Charge'}
        className="max-w-md"
      >
        <div className="space-y-4">
          <Input
            label="Service Charge Name"
            value={serviceChargeForm.name}
            onChange={(e) => setServiceChargeForm({ ...serviceChargeForm, name: e.target.value })}
            placeholder="e.g., Service Charge"
            required
          />

          <Input
            label="Rate (%)"
            type="number"
            step="0.01"
            value={serviceChargeForm.rate}
            onChange={(e) => setServiceChargeForm({ ...serviceChargeForm, rate: parseFloat(e.target.value) || 0 })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Applies To
            </label>
            <Select
              options={[
                { value: 'all', label: 'All Orders' },
                { value: 'dine_in', label: 'Dine In Only' },
                { value: 'takeout', label: 'Takeout Only' },
                { value: 'delivery', label: 'Delivery Only' },
              ]}
              value={serviceChargeForm.appliesTo}
              onChange={(value) => setServiceChargeForm({ ...serviceChargeForm, appliesTo: value as any })}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="serviceChargeActive"
              checked={serviceChargeForm.isActive}
              onChange={(e) => setServiceChargeForm({ ...serviceChargeForm, isActive: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="serviceChargeActive" className="text-sm text-gray-700 dark:text-gray-300">
              Active
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsServiceChargeModalOpen(false);
                resetServiceChargeForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={editingServiceCharge ? handleUpdateServiceCharge : handleCreateServiceCharge}>
              {editingServiceCharge ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Payment Method Modal */}
      <Modal
        isOpen={isPaymentMethodModalOpen}
        onClose={() => {
          setIsPaymentMethodModalOpen(false);
          setEditingPaymentMethod(null);
        }}
        title={editingPaymentMethod ? 'Edit Payment Method' : 'Add Payment Method'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={paymentMethodForm.name}
            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, name: e.target.value })}
            placeholder="e.g., Cash, VISA, bKash"
            required
          />
          <Input
            label="Code"
            value={paymentMethodForm.code}
            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
            placeholder="e.g., cash, visa, bkash"
            required
            disabled={!!editingPaymentMethod}
          />
          <Input
            label="Display Name (Optional)"
            value={paymentMethodForm.displayName}
            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, displayName: e.target.value })}
            placeholder="e.g., Cash Payment"
          />
          <Input
            label="Description (Optional)"
            value={paymentMethodForm.description}
            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, description: e.target.value })}
            placeholder="Brief description"
          />
          <Select
            label="Type"
            value={paymentMethodForm.type}
            onChange={(value) => setPaymentMethodForm({ ...paymentMethodForm, type: value as PaymentMethod['type'] })}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card' },
              { value: 'mobile_wallet', label: 'Mobile Wallet' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'due', label: 'Due/Credit' },
              { value: 'complimentary', label: 'Complimentary' },
              { value: 'other', label: 'Other' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Icon (Optional)"
              value={paymentMethodForm.icon}
              onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, icon: e.target.value })}
              placeholder="Icon name or emoji"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color
              </label>
              <input
                type="color"
                value={paymentMethodForm.color}
                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, color: e.target.value })}
                className="w-full h-10 rounded border border-gray-300 dark:border-gray-600"
              />
            </div>
          </div>
          <Input
            label="Sort Order"
            type="number"
            value={paymentMethodForm.sortOrder}
            onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, sortOrder: parseInt(e.target.value) || 0 })}
          />
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={paymentMethodForm.isActive}
                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={paymentMethodForm.requiresReference}
                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, requiresReference: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Requires Transaction Reference</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={paymentMethodForm.requiresAuthorization}
                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, requiresAuthorization: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Requires Authorization Code</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={paymentMethodForm.allowsPartialPayment}
                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, allowsPartialPayment: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Allows Partial Payment (Split Tender)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={paymentMethodForm.allowsChangeDue}
                onChange={(e) => setPaymentMethodForm({ ...paymentMethodForm, allowsChangeDue: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Allows Change Due</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsPaymentMethodModalOpen(false);
                setEditingPaymentMethod(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!paymentMethodForm.name || !paymentMethodForm.code) {
                  toast.error('Name and Code are required');
                  return;
                }
                try {
                  if (editingPaymentMethod) {
                    await updatePaymentMethod({
                      id: editingPaymentMethod.id,
                      data: paymentMethodForm,
                    }).unwrap();
                    toast.success('Payment method updated');
                  } else {
                    await createPaymentMethod(paymentMethodForm).unwrap();
                    toast.success('Payment method created');
                  }
                  setIsPaymentMethodModalOpen(false);
                  setEditingPaymentMethod(null);
                  refetchPaymentMethods();
                } catch (error: any) {
                  toast.error(error?.data?.message || 'Failed to save payment method');
                }
              }}
              isLoading={isCreatingPaymentMethod || isUpdatingPaymentMethod}
            >
              {editingPaymentMethod ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Custom Domain Tab */}
      {activeTab === 'custom-domain' && (
        <CustomDomainSection companyId={companyId} />
      )}
    </div>
  );
}

// Custom Domain Component - defined after main component
function CustomDomainSection({ companyId }: { companyId: string }) {
  const { data: domainInfo, refetch: refetchDomainInfo } = useGetCustomDomainInfoQuery(companyId, {
    skip: !companyId,
  });
  const [addDomain, { isLoading: isAdding }] = useAddCustomDomainMutation();
  const [verifyDomain, { isLoading: isVerifying }] = useVerifyCustomDomainMutation();
  const [removeDomain, { isLoading: isRemoving }] = useRemoveCustomDomainMutation();
  const [domainInput, setDomainInput] = useState('');
  const [verificationToken, setVerificationToken] = useState('');

  const handleAddDomain = async () => {
    if (!domainInput.trim()) {
      toast.error('Please enter a domain');
      return;
    }

    try {
      await addDomain({ companyId, domain: domainInput.trim() }).unwrap();
      toast.success('Domain added! Please verify it by adding the DNS record.');
      setDomainInput('');
      refetchDomainInfo();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to add domain');
    }
  };

  const handleVerifyDomain = async () => {
    if (!verificationToken.trim()) {
      toast.error('Please enter the verification token');
      return;
    }

    try {
      await verifyDomain({ companyId, token: verificationToken.trim() }).unwrap();
      toast.success('Domain verified successfully!');
      setVerificationToken('');
      refetchDomainInfo();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to verify domain');
    }
  };

  const handleRemoveDomain = async () => {
    if (!confirm('Are you sure you want to remove this custom domain?')) {
      return;
    }

    try {
      await removeDomain(companyId).unwrap();
      toast.success('Custom domain removed');
      refetchDomainInfo();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to remove domain');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GlobeAltIcon className="w-5 h-5" />
            Custom Domain
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>What is a custom domain?</strong>
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
              A custom domain allows you to use your own domain name (e.g., app.yourrestaurant.com) instead of the default subdomain. 
              This feature requires a premium or enterprise subscription plan.
            </p>
          </div>

          {domainInfo?.domain ? (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Domain</span>
                  {domainInfo.verified ? (
                    <Badge className="bg-green-500 text-white">Verified</Badge>
                  ) : (
                    <Badge className="bg-yellow-500 text-white">Pending Verification</Badge>
                  )}
                </div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{domainInfo.domain}</p>
                {domainInfo.verifiedAt && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Verified on {new Date(domainInfo.verifiedAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {!domainInfo.verified && domainInfo.dnsInstructions && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-3">
                    DNS Verification Required
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                    To verify ownership of your domain, add the following TXT record to your DNS settings:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-3 border border-yellow-200 dark:border-yellow-700">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Record Type</p>
                        <p className="text-sm font-mono text-gray-900 dark:text-white">{domainInfo.dnsInstructions.recordType}</p>
                      </div>
                      <div className="flex-1 mx-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Record Name</p>
                        <p className="text-sm font-mono text-gray-900 dark:text-white">{domainInfo.dnsInstructions.recordName}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Record Value</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-mono text-gray-900 dark:text-white break-all">{domainInfo.dnsInstructions.recordValue}</p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(domainInfo.dnsInstructions!.recordValue)}
                            className="flex-shrink-0"
                          >
                            <ClipboardDocumentIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-4">
                    After adding the DNS record, wait a few minutes for DNS propagation, then click "Verify Domain" below.
                  </p>
                </div>
              )}

              {!domainInfo.verified && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Verification Token
                    </label>
                    <Input
                      type="text"
                      value={verificationToken}
                      onChange={(e) => setVerificationToken(e.target.value)}
                      placeholder="Enter verification token from DNS TXT record"
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Copy the token from the DNS TXT record you added
                    </p>
                  </div>
                  <Button
                    onClick={handleVerifyDomain}
                    isLoading={isVerifying}
                    className="w-full"
                  >
                    Verify Domain
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="secondary"
                  onClick={handleRemoveDomain}
                  isLoading={isRemoving}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Remove Custom Domain
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Domain Name
                </label>
                <Input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="app.yourrestaurant.com"
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter your custom domain (e.g., app.example.com)
                </p>
              </div>
              <Button
                onClick={handleAddDomain}
                isLoading={isAdding}
                className="w-full"
              >
                Add Custom Domain
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}