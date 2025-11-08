'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
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
} from '@/lib/api/endpoints/settingsApi';
import { useAppSelector } from '@/lib/store';
import {
  CogIcon,
  CurrencyDollarIcon,
  DocumentIcon,
  GlobeAltIcon,
  PencilIcon,
  PlusIcon,
  ReceiptPercentIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
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
  const { companyContext } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState<'general' | 'taxes' | 'service-charges' | 'invoice'>('general');

  // General Settings
  const { data: companySettings } = useGetCompanySettingsQuery(
    companyContext?.companyId || '', 
    { skip: !companyContext?.companyId }
  );
  const [updateCompanySettings, { isLoading: updatingCompany }] = useUpdateCompanySettingsMutation();

  // Tax Settings
  const { data: taxSettings = [] } = useGetTaxSettingsQuery(
    companyContext?.companyId || '', 
    { skip: !companyContext?.companyId }
  );
  const [createTaxSetting] = useCreateTaxSettingMutation();
  const [updateTaxSetting] = useUpdateTaxSettingMutation();
  const [deleteTaxSetting] = useDeleteTaxSettingMutation();

  // Service Charge Settings
  const { data: serviceChargeSettings = [] } = useGetServiceChargeSettingsQuery(
    companyContext?.companyId || '', 
    { skip: !companyContext?.companyId }
  );
  const [createServiceChargeSetting] = useCreateServiceChargeSettingMutation();
  const [updateServiceChargeSetting] = useUpdateServiceChargeSettingMutation();
  const [deleteServiceChargeSetting] = useDeleteServiceChargeSettingMutation();

  // Invoice Settings
  const { data: invoiceSettings } = useGetInvoiceSettingsQuery(
    companyContext?.companyId || '', 
    { skip: !companyContext?.companyId }
  );
  const [updateInvoiceSettings, { isLoading: updatingInvoice }] = useUpdateInvoiceSettingsMutation();

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

  const handleCreateTax = async () => {
    if (!taxForm.name.trim()) {
      toast.error('Tax name is required');
      return;
    }
    if (taxForm.rate <= 0) {
      toast.error('Tax rate must be greater than 0');
      return;
    }
    if (!companyContext?.companyId) {
      toast.error('Company ID is required');
      return;
    }

    try {
      await createTaxSetting({
        ...taxForm,
        companyId: companyContext.companyId,
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
    if (!companyContext?.companyId) {
      toast.error('Company ID is required');
      return;
    }

    try {
      await createServiceChargeSetting({
        ...serviceChargeForm,
        companyId: companyContext.companyId,
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

  const tabs = [
    { id: 'general', label: 'General', icon: CogIcon },
    { id: 'taxes', label: 'Tax Settings', icon: ReceiptPercentIcon },
    { id: 'service-charges', label: 'Service Charges', icon: CurrencyDollarIcon },
    { id: 'invoice', label: 'Invoice Settings', icon: DocumentIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure your restaurant settings and preferences
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
                    { value: 'USD', label: 'US Dollar (USD)' },
                    { value: 'EUR', label: 'Euro (EUR)' },
                    { value: 'GBP', label: 'British Pound (GBP)' },
                    { value: 'CAD', label: 'Canadian Dollar (CAD)' },
                    { value: 'AUD', label: 'Australian Dollar (AUD)' },
                  ]}
                  value={companySettings?.currency || 'USD'}
                  onChange={async (value) => {
                    try {
                      await updateCompanySettings({
                        companyId: companyContext?.companyId || '',
                        data: { currency: value }
                      }).unwrap();
                      toast.success('Currency updated successfully');
                    } catch (error: any) {
                      toast.error(error.data?.message || 'Failed to update currency');
                    }
                  }}
                  disabled={updatingCompany || !companyContext?.companyId}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timezone
                </label>
                <Select
                  options={[
                    { value: 'America/New_York', label: 'Eastern Time (ET)' },
                    { value: 'America/Chicago', label: 'Central Time (CT)' },
                    { value: 'America/Denver', label: 'Mountain Time (MT)' },
                    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
                    { value: 'Europe/London', label: 'London (GMT)' },
                    { value: 'Europe/Paris', label: 'Paris (CET)' },
                    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
                  ]}
                  value={companySettings?.timezone || 'America/New_York'}
                  onChange={async (value) => {
                    try {
                      await updateCompanySettings({
                        companyId: companyContext?.companyId || '',
                        data: { timezone: value }
                      }).unwrap();
                      toast.success('Timezone updated successfully');
                    } catch (error: any) {
                      toast.error(error.data?.message || 'Failed to update timezone');
                    }
                  }}
                  disabled={updatingCompany || !companyContext?.companyId}
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
                        companyId: companyContext?.companyId || '',
                        data: { dateFormat: value }
                      }).unwrap();
                      toast.success('Date format updated successfully');
                    } catch (error: any) {
                      toast.error(error.data?.message || 'Failed to update date format');
                    }
                  }}
                  disabled={updatingCompany || !companyContext?.companyId}
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
                        companyId: companyContext?.companyId || '',
                        data: { timeFormat: value as '12h' | '24h' }
                      }).unwrap();
                      toast.success('Time format updated successfully');
                    } catch (error: any) {
                      toast.error(error.data?.message || 'Failed to update time format');
                    }
                  }}
                  disabled={updatingCompany || !companyContext?.companyId}
                />
              </div>
            </div>
          </CardContent>
        </Card>
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
                {taxSettings.map((tax) => (
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
                {taxSettings.length === 0 && (
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
                {serviceChargeSettings.map((charge) => (
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
                {serviceChargeSettings.length === 0 && (
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
              <Input
                label="Invoice Prefix"
                value={invoiceSettings?.invoicePrefix || ''}
                onChange={async (e) => {
                  try {
                    await updateInvoiceSettings({
                      companyId: companyContext?.companyId || '',
                      data: { invoicePrefix: e.target.value }
                    }).unwrap();
                  } catch (error: any) {
                    toast.error(error.data?.message || 'Failed to update invoice prefix');
                  }
                }}
                disabled={updatingInvoice || !companyContext?.companyId}
                placeholder="INV"
              />

              <Input
                label="Next Invoice Number"
                type="number"
                value={invoiceSettings?.invoiceNumber || 1}
                onChange={async (e) => {
                  const value = parseInt(e.target.value);
                  if (isNaN(value) || value < 1) {
                    toast.error('Invoice number must be a positive number');
                    return;
                  }
                  try {
                    await updateInvoiceSettings({
                      companyId: companyContext?.companyId || '',
                      data: { invoiceNumber: value }
                    }).unwrap();
                  } catch (error: any) {
                    toast.error(error.data?.message || 'Failed to update invoice number');
                  }
                }}
                disabled={updatingInvoice || !companyContext?.companyId}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Invoice Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={invoiceSettings?.showLogo || false}
                    onChange={async (e) => {
                      try {
                        await updateInvoiceSettings({
                          companyId: companyContext?.companyId || '',
                          data: { showLogo: e.target.checked }
                        }).unwrap();
                      } catch (error: any) {
                        toast.error(error.data?.message || 'Failed to update invoice settings');
                      }
                    }}
                    disabled={updatingInvoice || !companyContext?.companyId}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show company logo</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={invoiceSettings?.showAddress || false}
                    onChange={async (e) => {
                      try {
                        await updateInvoiceSettings({
                          companyId: companyContext?.companyId || '',
                          data: { showAddress: e.target.checked }
                        }).unwrap();
                      } catch (error: any) {
                        toast.error(error.data?.message || 'Failed to update invoice settings');
                      }
                    }}
                    disabled={updatingInvoice || !companyContext?.companyId}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show company address</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={invoiceSettings?.showPhone || false}
                    onChange={async (e) => {
                      try {
                        await updateInvoiceSettings({
                          companyId: companyContext?.companyId || '',
                          data: { showPhone: e.target.checked }
                        }).unwrap();
                      } catch (error: any) {
                        toast.error(error.data?.message || 'Failed to update invoice settings');
                      }
                    }}
                    disabled={updatingInvoice || !companyContext?.companyId}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show phone number</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={invoiceSettings?.showEmail || false}
                    onChange={async (e) => {
                      try {
                        await updateInvoiceSettings({
                          companyId: companyContext?.companyId || '',
                          data: { showEmail: e.target.checked }
                        }).unwrap();
                      } catch (error: any) {
                        toast.error(error.data?.message || 'Failed to update invoice settings');
                      }
                    }}
                    disabled={updatingInvoice || !companyContext?.companyId}
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
                value={invoiceSettings?.footerText || ''}
                onChange={async (e) => {
                  try {
                    await updateInvoiceSettings({
                      companyId: companyContext?.companyId || '',
                      data: { footerText: e.target.value }
                    }).unwrap();
                  } catch (error: any) {
                    toast.error(error.data?.message || 'Failed to update footer text');
                  }
                }}
                disabled={updatingInvoice || !companyContext?.companyId}
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
                value={invoiceSettings?.termsAndConditions || ''}
                onChange={async (e) => {
                  try {
                    await updateInvoiceSettings({
                      companyId: companyContext?.companyId || '',
                      data: { termsAndConditions: e.target.value }
                    }).unwrap();
                  } catch (error: any) {
                    toast.error(error.data?.message || 'Failed to update terms and conditions');
                  }
                }}
                disabled={updatingInvoice || !companyContext?.companyId}
                className="input w-full"
                placeholder="Payment is due within 30 days..."
              />
            </div>
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
              options={[
                { value: 'all', label: 'All Items' },
                { value: 'food', label: 'Food Only' },
                { value: 'beverage', label: 'Beverages Only' },
                { value: 'alcohol', label: 'Alcohol Only' },
              ]}
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
    </div>
  );
}