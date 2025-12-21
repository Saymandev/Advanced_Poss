'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useUploadMenuImagesMutation } from '@/lib/api/endpoints/menuItemsApi';
import {
  CreateSubscriptionPaymentMethodDto,
  PaymentGateway,
  PaymentMethodType,
  SubscriptionPaymentMethod,
  useCreateSubscriptionPaymentMethodMutation,
  useDeleteSubscriptionPaymentMethodMutation,
  useGetAllSubscriptionPaymentMethodsQuery,
  useToggleSubscriptionPaymentMethodStatusMutation,
  useUpdateSubscriptionPaymentMethodMutation,
} from '@/lib/api/endpoints/subscriptionPaymentsApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function SubscriptionPaymentMethodsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      router.replace('/dashboard/super-admin');
    }
  }, [user, router]);

  const { data: paymentMethods = [], isLoading, refetch } = useGetAllSubscriptionPaymentMethodsQuery();
  const [createPaymentMethod, { isLoading: isCreating }] = useCreateSubscriptionPaymentMethodMutation();
  const [updatePaymentMethod, { isLoading: isUpdating }] = useUpdateSubscriptionPaymentMethodMutation();
  const [deletePaymentMethod, { isLoading: isDeleting }] = useDeleteSubscriptionPaymentMethodMutation();
  const [toggleStatus, { isLoading: isToggling }] = useToggleSubscriptionPaymentMethodStatusMutation();
  const [uploadImages] = useUploadMenuImagesMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<SubscriptionPaymentMethod | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<Partial<CreateSubscriptionPaymentMethodDto>>({
    gateway: PaymentGateway.STRIPE,
    type: PaymentMethodType.CARD,
    name: '',
    code: '',
    displayName: '',
    description: '',
    icon: '',
    logo: '',
    isActive: true,
    isDefault: false,
    supportedCountries: [],
    supportedCurrencies: [],
    sortOrder: 0,
    config: {},
    metadata: {},
  });

  useEffect(() => {
    if (editingMethod) {
      setFormData({
        gateway: editingMethod.gateway,
        type: editingMethod.type,
        name: editingMethod.name,
        code: editingMethod.code,
        displayName: editingMethod.displayName || '',
        description: editingMethod.description || '',
        icon: editingMethod.icon || '',
        logo: editingMethod.logo || '',
        isActive: editingMethod.isActive,
        isDefault: editingMethod.isDefault || false,
        supportedCountries: editingMethod.supportedCountries || [],
        supportedCurrencies: editingMethod.supportedCurrencies || [],
        sortOrder: editingMethod.sortOrder || 0,
        config: editingMethod.config || {},
        metadata: editingMethod.metadata || {},
      });
      // Set previews for existing images
      setIconPreview(editingMethod.icon || null);
      setLogoPreview(editingMethod.logo || null);
      setIconFile(null);
      setLogoFile(null);
    } else {
      setFormData({
        gateway: PaymentGateway.STRIPE,
        type: PaymentMethodType.CARD,
        name: '',
        code: '',
        displayName: '',
        description: '',
        icon: '',
        logo: '',
        isActive: true,
        isDefault: false,
        supportedCountries: [],
        supportedCurrencies: [],
        sortOrder: 0,
        config: {},
        metadata: {},
      });
      setIconPreview(null);
      setLogoPreview(null);
      setIconFile(null);
      setLogoFile(null);
    }
  }, [editingMethod]);

  const handleOpenModal = (method?: SubscriptionPaymentMethod) => {
    if (method) {
      setEditingMethod(method);
    } else {
      setEditingMethod(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingMethod(null);
    setIconFile(null);
    setLogoFile(null);
    setIconPreview(null);
    setLogoPreview(null);
    if (iconInputRef.current) iconInputRef.current.value = '';
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIconFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('images', file);

    const result = await uploadImages(formData).unwrap();
    if (result.success && result.images && result.images.length > 0) {
      return result.images[0].url;
    }
    throw new Error('Failed to upload image');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Upload images if new files are selected
      let iconUrl = formData.icon;
      let logoUrl = formData.logo;

      if (iconFile) {
        toast.loading('Uploading icon...', { id: 'icon-upload' });
        try {
          iconUrl = await uploadImageToCloudinary(iconFile);
          toast.success('Icon uploaded successfully', { id: 'icon-upload' });
        } catch (error: any) {
          toast.error('Failed to upload icon', { id: 'icon-upload' });
          return;
        }
      }

      if (logoFile) {
        toast.loading('Uploading logo...', { id: 'logo-upload' });
        try {
          logoUrl = await uploadImageToCloudinary(logoFile);
          toast.success('Logo uploaded successfully', { id: 'logo-upload' });
        } catch (error: any) {
          toast.error('Failed to upload logo', { id: 'logo-upload' });
          return;
        }
      }

      const submitData = {
        ...formData,
        icon: iconUrl,
        logo: logoUrl,
      };

      if (editingMethod) {
        await updatePaymentMethod({
          id: editingMethod.id,
          data: submitData,
        }).unwrap();
        toast.success('Payment method updated successfully');
      } else {
        await createPaymentMethod(submitData).unwrap();
        toast.success('Payment method created successfully');
      }
      handleCloseModal();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save payment method');
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) {
      toast.error('Payment method ID is missing');
      return;
    }
    if (!confirm('Are you sure you want to delete this payment method?')) {
      return;
    }
    try {
      await deletePaymentMethod(id).unwrap();
      toast.success('Payment method deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete payment method');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleStatus(id).unwrap();
      toast.success('Payment method status updated');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to toggle status');
    }
  };

  const gatewayOptions = Object.values(PaymentGateway).map((gateway) => ({
    value: gateway,
    label: gateway.charAt(0).toUpperCase() + gateway.slice(1).replace(/_/g, ' '),
  }));

  const typeOptions = Object.values(PaymentMethodType).map((type) => ({
    value: type,
    label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
  }));

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Payment Methods</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage payment methods available for subscription purchases
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} variant="primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Payment Method
        </Button>
      </div>

      {/* Payment Methods List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No payment methods found</p>
            <Button onClick={() => handleOpenModal()} variant="primary" className="mt-4">
              <PlusIcon className="h-5 w-5 mr-2" />
              Add First Payment Method
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paymentMethods.map((method) => (
            <Card key={method.id || (method as any)._id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{method.displayName || method.name}</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {method.description || `${method.gateway} - ${method.type}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {method.isDefault && (
                    <Badge variant="info" className="bg-blue-500 text-white">
                      Default
                    </Badge>
                    )}
                    <Badge variant={method.isActive ? 'success' : 'secondary'}>
                      {method.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Gateway:</span>
                    <span className="font-medium">{method.gateway}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="font-medium">{method.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Code:</span>
                    <span className="font-medium">{method.code}</span>
                  </div>
                  {method.supportedCountries.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Countries:</span>
                      <span className="font-medium">{method.supportedCountries.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Sort Order:</span>
                    <span className="font-medium">{method.sortOrder}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    onClick={() => handleToggleStatus(method.id || (method as any)._id)}
                    variant="ghost"
                    size="sm"
                    disabled={isToggling}
                  >
                    {method.isActive ? (
                      <XCircleIcon className="h-4 w-4 text-red-500" />
                    ) : (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleOpenModal(method)}
                    variant="ghost"
                    size="sm"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(method.id || (method as any)._id)}
                    variant="ghost"
                    size="sm"
                    disabled={isDeleting}
                  >
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingMethod ? 'Edit Payment Method' : 'Create Payment Method'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Gateway *
              </label>
              <Select
                options={gatewayOptions}
                value={formData.gateway}
                onChange={(value) => setFormData({ ...formData, gateway: value as PaymentGateway })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type *
              </label>
              <Select
                options={typeOptions}
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value as PaymentMethodType })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., PayPal, bKash"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Code * (unique identifier)
            </label>
            <Input
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              placeholder="e.g., paypal, bkash"
              required
              disabled={!!editingMethod}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Display Name
            </label>
            <Input
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="e.g., PayPal - Fast & Secure"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the payment method"
            />
          </div>

          {/* Icon Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Icon
            </label>
            <div className="flex items-center gap-4">
              {iconPreview && (
                <div className="relative">
                  <img
                    src={iconPreview}
                    alt="Icon preview"
                    className="w-20 h-20 object-contain rounded border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIconPreview(null);
                      setIconFile(null);
                      if (iconInputRef.current) iconInputRef.current.value = '';
                      if (!editingMethod) {
                        setFormData({ ...formData, icon: '' });
                      }
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleIconUpload}
                  className="hidden"
                  id="icon-upload"
                />
                <label
                  htmlFor="icon-upload"
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <ArrowUpTrayIcon className="w-5 h-5" />
                  {iconPreview ? 'Change Icon' : 'Upload Icon'}
                </label>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Logo
            </label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-20 h-20 object-contain rounded border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview(null);
                      setLogoFile(null);
                      if (logoInputRef.current) logoInputRef.current.value = '';
                      if (!editingMethod) {
                        setFormData({ ...formData, logo: '' });
                      }
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex-1">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <ArrowUpTrayIcon className="w-5 h-5" />
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </label>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
              </div>
            </div>
          </div>

          {/* Payment Gateway Credentials/Config */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Payment Gateway Credentials
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Configure API credentials and settings for this payment gateway. These are stored securely.
            </p>

            <div className="space-y-4">
              {/* Show MANUAL gateway fields first if selected */}
              {formData.gateway === PaymentGateway.MANUAL && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Number / Phone Number *
                    </label>
                    <Input
                      value={(formData.config as any)?.accountNumber || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: {
                            ...(formData.config || {}),
                            accountNumber: e.target.value,
                          },
                        })
                      }
                      placeholder="017XXXXXXXX or Account Number"
                      required
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      The account number or phone number where users will send payments (bKash, Nagad, etc.)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payment Instructions (Optional)
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={3}
                      value={(formData.config as any)?.instructions || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: {
                            ...(formData.config || {}),
                            instructions: e.target.value,
                          },
                        })
                      }
                      placeholder="Additional instructions for users (e.g., 'Send money to this number and include reference number')"
                    />
                  </div>
                </>
              )}

              {formData.gateway === PaymentGateway.STRIPE && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Stripe Secret Key
                    </label>
                    <Input
                      type="password"
                      value={(formData.config as any)?.secretKey || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: {
                            ...(formData.config || {}),
                            secretKey: e.target.value,
                          },
                        })
                      }
                      placeholder="sk_test_..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Stripe Publishable Key
                    </label>
                    <Input
                      type="password"
                      value={(formData.config as any)?.publishableKey || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: {
                            ...(formData.config || {}),
                            publishableKey: e.target.value,
                          },
                        })
                      }
                      placeholder="pk_test_..."
                    />
                  </div>
                </>
              )}

              {formData.gateway === PaymentGateway.PAYPAL && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      PayPal Client ID
                    </label>
                    <Input
                      type="password"
                      value={(formData.config as any)?.clientId || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: {
                            ...(formData.config || {}),
                            clientId: e.target.value,
                          },
                        })
                      }
                      placeholder="PayPal Client ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      PayPal Secret
                    </label>
                    <Input
                      type="password"
                      value={(formData.config as any)?.secret || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: {
                            ...(formData.config || {}),
                            secret: e.target.value,
                          },
                        })
                      }
                      placeholder="PayPal Secret"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Mode
                    </label>
                    <Select
                      options={[
                        { value: 'sandbox', label: 'Sandbox (Test)' },
                        { value: 'live', label: 'Live (Production)' },
                      ]}
                      value={(formData.config as any)?.mode || 'sandbox'}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          config: {
                            ...(formData.config || {}),
                            mode: value,
                          },
                        })
                      }
                    />
                  </div>
                </>
              )}

              {(formData.gateway === PaymentGateway.BKASH || formData.gateway === PaymentGateway.NAGAD) && (
                <>
                  {formData.gateway === PaymentGateway.BKASH && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          bKash App Key
                        </label>
                        <Input
                          type="password"
                          value={(formData.config as any)?.appKey || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...(formData.config || {}),
                                appKey: e.target.value,
                              },
                            })
                          }
                          placeholder="bKash App Key"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          bKash App Secret
                        </label>
                        <Input
                          type="password"
                          value={(formData.config as any)?.appSecret || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...(formData.config || {}),
                                appSecret: e.target.value,
                              },
                            })
                          }
                          placeholder="bKash App Secret"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          bKash Username
                        </label>
                        <Input
                          value={(formData.config as any)?.username || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...(formData.config || {}),
                                username: e.target.value,
                              },
                            })
                          }
                          placeholder="bKash Username"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          bKash Password
                        </label>
                        <Input
                          type="password"
                          value={(formData.config as any)?.password || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...(formData.config || {}),
                                password: e.target.value,
                              },
                            })
                          }
                          placeholder="bKash Password"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          bKash Account Number (for manual payments)
                        </label>
                        <Input
                          value={(formData.config as any)?.accountNumber || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...(formData.config || {}),
                                accountNumber: e.target.value,
                              },
                            })
                          }
                          placeholder="017XXXXXXXX"
                        />
                      </div>
                    </>
                  )}

                  {formData.gateway === PaymentGateway.NAGAD && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nagad Merchant ID
                        </label>
                        <Input
                          value={(formData.config as any)?.merchantId || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...(formData.config || {}),
                                merchantId: e.target.value,
                              },
                            })
                          }
                          placeholder="Nagad Merchant ID"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nagad Public Key
                        </label>
                        <Input
                          type="password"
                          value={(formData.config as any)?.publicKey || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...(formData.config || {}),
                                publicKey: e.target.value,
                              },
                            })
                          }
                          placeholder="Nagad Public Key"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nagad Private Key
                        </label>
                        <Input
                          type="password"
                          value={(formData.config as any)?.privateKey || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...(formData.config || {}),
                                privateKey: e.target.value,
                              },
                            })
                          }
                          placeholder="Nagad Private Key"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nagad Account Number (for manual payments)
                        </label>
                        <Input
                          value={(formData.config as any)?.accountNumber || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              config: {
                                ...(formData.config || {}),
                                accountNumber: e.target.value,
                              },
                            })
                          }
                          placeholder="019XXXXXXXX"
                        />
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isSandbox"
                      checked={(formData.config as any)?.isSandbox !== false}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          config: {
                            ...(formData.config || {}),
                            isSandbox: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="isSandbox" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Use Sandbox/Test Environment
                    </label>
                  </div>
                </>
              )}

              {/* Generic config fields for other gateways */}
              {![PaymentGateway.STRIPE, PaymentGateway.PAYPAL, PaymentGateway.BKASH, PaymentGateway.NAGAD, PaymentGateway.MANUAL].includes(
                formData.gateway!,
              ) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Additional Configuration (JSON)
                  </label>
                  <textarea
                    value={JSON.stringify(formData.config || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData({
                          ...formData,
                          config: parsed,
                        });
                      } catch {
                        // Invalid JSON, ignore
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    rows={6}
                    placeholder='{"apiKey": "...", "secretKey": "..."}'
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter configuration as JSON</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Supported Countries (comma-separated ISO codes, leave empty for worldwide)
            </label>
            <Input
              value={formData.supportedCountries?.join(', ') || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  supportedCountries: e.target.value
                    .split(',')
                    .map((c) => c.trim().toUpperCase())
                    .filter((c) => c),
                })
              }
              placeholder="BD, US, GB (leave empty for worldwide)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Supported Currencies (comma-separated ISO codes, leave empty for all)
            </label>
            <Input
              value={formData.supportedCurrencies?.join(', ') || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  supportedCurrencies: e.target.value
                    .split(',')
                    .map((c) => c.trim().toUpperCase())
                    .filter((c) => c),
                })
              }
              placeholder="USD, BDT, EUR (leave empty for all)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sort Order
            </label>
            <Input
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              min="0"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active (visible to users)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault || false}
                onChange={(e) => {
                  // If setting this as default, unset others
                  if (e.target.checked) {
                    // Note: In a real scenario, you'd want to unset other defaults on the backend
                    setFormData({ ...formData, isDefault: true });
                  } else {
                    setFormData({ ...formData, isDefault: false });
                  }
                }}
                className="rounded border-gray-300"
              />
              <label htmlFor="isDefault" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Set as Default Payment Method (auto-selected for users)
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isCreating || isUpdating}>
              {editingMethod ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

