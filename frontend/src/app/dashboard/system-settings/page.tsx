'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  SystemSettings,
  useGetSystemSettingsQuery,
  useUpdateSystemSettingsMutation,
} from '@/lib/api/endpoints/settingsApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import {
  CheckCircleIcon,
  CloudArrowDownIcon,
  CogIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// Helper function to deep clone objects (prevents read-only property errors)
// Moved outside component to prevent recreation on every render
const deepClone = <T,>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

export default function SystemSettingsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      router.replace('/dashboard/super-admin');
    }
  }, [user, router]);

  const [activeTab, setActiveTab] = useState<
    'maintenance' | 'defaults' | 'security' | 'email' | 'sms' | 'backup' | 'features'
  >('maintenance');

  const { data: systemSettings, isLoading, refetch } = useGetSystemSettingsQuery(undefined, {
    skip: user?.role !== UserRole.SUPER_ADMIN,
  });

  const [updateSystemSettings, { isLoading: isUpdating }] = useUpdateSystemSettingsMutation();

  const [formData, setFormData] = useState<Partial<SystemSettings>>({});

  useEffect(() => {
    if (systemSettings) {
      // Create a deep clone to ensure all nested objects are mutable
      setFormData(deepClone(systemSettings));
    }
  }, [systemSettings]);

  const handleSave = async () => {
    // Validation
    if (formData.defaultCompanySettings?.currency && formData.defaultCompanySettings.currency.length > 10) {
      toast.error('Currency code must be 10 characters or less');
      return;
    }
    
    if (formData.security?.minLength && (formData.security.minLength < 4 || formData.security.minLength > 128)) {
      toast.error('Minimum password length must be between 4 and 128 characters');
      return;
    }
    
    if (formData.security?.maxAttempts && (formData.security.maxAttempts < 1 || formData.security.maxAttempts > 20)) {
      toast.error('Max login attempts must be between 1 and 20');
      return;
    }
    
    if (formData.email?.smtpPort && (formData.email.smtpPort < 1 || formData.email.smtpPort > 65535)) {
      toast.error('SMTP port must be between 1 and 65535');
      return;
    }
    
    try {
      await updateSystemSettings(formData).unwrap();
      toast.success('System settings updated successfully');
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to update system settings';
      toast.error(errorMessage);
      console.error('System settings update error:', error);
    }
  };

  // Fixed updateField to properly handle nested objects without mutating read-only properties
  const updateField = (path: string, value: any) => {
    const keys = path.split('.');
    setFormData((prev) => {
      // Create a deep copy of the previous state
      const newData = deepClone(prev);
      
      // Navigate through the nested structure, creating new objects as needed
      let current: any = newData;
      
      // Navigate to the parent of the target property
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        // If the key doesn't exist, create a new empty object
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        } else {
          // Create a copy of the existing object to avoid mutation
          current[key] = { ...current[key] };
        }
        current = current[key];
      }
      
      // Set the final property value
      const finalKey = keys[keys.length - 1];
      current[finalKey] = value;
      
      return newData;
    });
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading system settings...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'maintenance', label: 'Maintenance', icon: ExclamationTriangleIcon },
    { id: 'defaults', label: 'Default Settings', icon: CogIcon },
    { id: 'security', label: 'Security', icon: LockClosedIcon },
    { id: 'email', label: 'Email', icon: EnvelopeIcon },
    { id: 'sms', label: 'SMS', icon: DevicePhoneMobileIcon },
    { id: 'backup', label: 'Backup', icon: CloudArrowDownIcon },
    { id: 'features', label: 'Features', icon: CheckCircleIcon },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <ShieldCheckIcon className="w-8 h-8 text-purple-600" />
          System Settings
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Configure global system-wide settings
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Maintenance Tab */}
        {activeTab === 'maintenance' && (
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Maintenance Mode
                  </label>
                  <p className="text-sm text-gray-500 mt-1">
                    When enabled, all users (except super admins) will see a maintenance message
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.maintenanceMode || false}
                    onChange={(e) => updateField('maintenanceMode', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <Input
                label="Maintenance Message"
                value={formData.maintenanceMessage || ''}
                onChange={(e) => updateField('maintenanceMessage', e.target.value)}
                placeholder="System is under maintenance. Please try again later."
              />
            </CardContent>
          </Card>
        )}

        {/* Default Settings Tab */}
        {activeTab === 'defaults' && (
          <Card>
            <CardHeader>
              <CardTitle>Default Company Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Default Currency"
                  value={formData.defaultCompanySettings?.currency || ''}
                  onChange={(e) =>
                    updateField('defaultCompanySettings.currency', e.target.value)
                  }
                  placeholder="BDT"
                />
                <Input
                  label="Default Timezone"
                  value={formData.defaultCompanySettings?.timezone || ''}
                  onChange={(e) =>
                    updateField('defaultCompanySettings.timezone', e.target.value)
                  }
                  placeholder="Asia/Dhaka"
                />
                <Input
                  label="Default Date Format"
                  value={formData.defaultCompanySettings?.dateFormat || ''}
                  onChange={(e) =>
                    updateField('defaultCompanySettings.dateFormat', e.target.value)
                  }
                  placeholder="DD/MM/YYYY"
                />
                <Select
                  label="Default Time Format"
                  value={formData.defaultCompanySettings?.timeFormat || '12h'}
                  onChange={(value) =>
                    updateField('defaultCompanySettings.timeFormat', value)
                  }
                  options={[
                    { value: '12h', label: '12 Hour' },
                    { value: '24h', label: '24 Hour' },
                  ]}
                />
                <Input
                  label="Default Language"
                  value={formData.defaultCompanySettings?.language || ''}
                  onChange={(e) =>
                    updateField('defaultCompanySettings.language', e.target.value)
                  }
                  placeholder="en"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Password Policy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Minimum Password Length"
                  type="number"
                  value={formData.security?.minLength || 8}
                  onChange={(e) =>
                    updateField('security.minLength', parseInt(e.target.value) || 8)
                  }
                />
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.security?.requireUppercase || false}
                      onChange={(e) =>
                        updateField('security.requireUppercase', e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Require Uppercase Letters
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.security?.requireLowercase || false}
                      onChange={(e) =>
                        updateField('security.requireLowercase', e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Require Lowercase Letters
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.security?.requireNumbers || false}
                      onChange={(e) =>
                        updateField('security.requireNumbers', e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Require Numbers
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.security?.requireSpecialChars || false}
                      onChange={(e) =>
                        updateField('security.requireSpecialChars', e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Require Special Characters
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Login Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Max Login Attempts"
                  type="number"
                  value={formData.security?.maxAttempts || 5}
                  onChange={(e) =>
                    updateField('security.maxAttempts', parseInt(e.target.value) || 5)
                  }
                />
                <Input
                  label="Lockout Duration (minutes)"
                  type="number"
                  value={formData.security?.lockoutDuration || 30}
                  onChange={(e) =>
                    updateField('security.lockoutDuration', parseInt(e.target.value) || 30)
                  }
                />
                <Input
                  label="Session Timeout (minutes)"
                  type="number"
                  value={formData.sessionTimeout || 60}
                  onChange={(e) =>
                    updateField('sessionTimeout', parseInt(e.target.value) || 60)
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rate Limiting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Rate Limiting
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.rateLimiting?.enabled || false}
                      onChange={(e) => updateField('rateLimiting.enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>
                <Input
                  label="Requests per Window"
                  type="number"
                  value={formData.rateLimiting?.max || 100}
                  onChange={(e) =>
                    updateField('rateLimiting.max', parseInt(e.target.value) || 100)
                  }
                />
                <Input
                  label="Window Size (ms)"
                  type="number"
                  value={formData.rateLimiting?.windowMs || 60000}
                  onChange={(e) =>
                    updateField('rateLimiting.windowMs', parseInt(e.target.value) || 60000)
                  }
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Email Service
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.email?.enabled || false}
                    onChange={(e) => updateField('email.enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <Select
                label="Email Provider"
                value={formData.email?.provider || 'smtp'}
                onChange={(value) => updateField('email.provider', value)}
                options={[
                  { value: 'smtp', label: 'SMTP' },
                  { value: 'sendgrid', label: 'SendGrid' },
                  { value: 'ses', label: 'AWS SES' },
                ]}
              />
              <Input
                label="From Email"
                type="email"
                value={formData.email?.fromEmail || ''}
                onChange={(e) => updateField('email.fromEmail', e.target.value)}
              />
              <Input
                label="From Name"
                value={formData.email?.fromName || ''}
                onChange={(e) => updateField('email.fromName', e.target.value)}
              />
              {formData.email?.provider === 'smtp' && (
                <>
                  <Input
                    label="SMTP Host"
                    value={formData.email?.smtpHost || ''}
                    onChange={(e) => updateField('email.smtpHost', e.target.value)}
                  />
                  <Input
                    label="SMTP Port"
                    type="number"
                    value={formData.email?.smtpPort || 587}
                    onChange={(e) =>
                      updateField('email.smtpPort', parseInt(e.target.value) || 587)
                    }
                  />
                  <Input
                    label="SMTP Username"
                    value={formData.email?.smtpUser || ''}
                    onChange={(e) => updateField('email.smtpUser', e.target.value)}
                  />
                  <Input
                    label="SMTP Password"
                    type="password"
                    value={formData.email?.smtpPassword || ''}
                    onChange={(e) => updateField('email.smtpPassword', e.target.value)}
                  />
                </>
              )}
              {(formData.email?.provider === 'sendgrid' ||
                formData.email?.provider === 'ses') && (
                <Input
                  label="API Key"
                  type="password"
                  value={formData.email?.apiKey || ''}
                  onChange={(e) => updateField('email.apiKey', e.target.value)}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* SMS Tab */}
        {activeTab === 'sms' && (
          <Card>
            <CardHeader>
              <CardTitle>SMS Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable SMS Service
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.sms?.enabled || false}
                    onChange={(e) => updateField('sms.enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <Select
                label="SMS Provider"
                value={formData.sms?.provider || 'twilio'}
                onChange={(value) => updateField('sms.provider', value)}
                options={[
                  { value: 'twilio', label: 'Twilio' },
                  { value: 'bulksmsbd', label: 'BulkSMSBD' },
                  { value: 'aws-sns', label: 'AWS SNS' },
                ]}
              />
              {formData.sms?.provider === 'twilio' && (
                <>
                  <Input
                    label="Account SID"
                    value={formData.sms?.accountSid || ''}
                    onChange={(e) => updateField('sms.accountSid', e.target.value)}
                  />
                  <Input
                    label="Auth Token"
                    type="password"
                    value={formData.sms?.authToken || ''}
                    onChange={(e) => updateField('sms.authToken', e.target.value)}
                  />
                  <Input
                    label="From Number"
                    value={formData.sms?.fromNumber || ''}
                    onChange={(e) => updateField('sms.fromNumber', e.target.value)}
                  />
                </>
              )}
              {formData.sms?.provider === 'bulksmsbd' && (
                <>
                  <Input
                    label="API Key"
                    type="password"
                    value={formData.sms?.apiKey || ''}
                    onChange={(e) => updateField('sms.apiKey', e.target.value)}
                  />
                  <Input
                    label="Sender ID"
                    value={formData.sms?.senderId || ''}
                    onChange={(e) => updateField('sms.senderId', e.target.value)}
                  />
                  <Input
                    label="Endpoint (optional)"
                    value={formData.sms?.endpoint || ''}
                    onChange={(e) => updateField('sms.endpoint', e.target.value)}
                    placeholder="https://bulksmsbd.net/api/smsapi"
                  />
                  <Input
                    label="Default Country (e.g., BD)"
                    value={formData.sms?.defaultCountry || 'BD'}
                    onChange={(e) => updateField('sms.defaultCountry', e.target.value)}
                  />
                </>
              )}
              {formData.sms?.provider === 'aws-sns' && (
                <Input
                  label="API Key"
                  type="password"
                  value={formData.sms?.apiKey || ''}
                  onChange={(e) => updateField('sms.apiKey', e.target.value)}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Backup Tab */}
        {activeTab === 'backup' && (
          <Card>
            <CardHeader>
              <CardTitle>Backup Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable Automatic Backups
                </label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.backup?.enabled || false}
                    onChange={(e) => updateField('backup.enabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <Select
                label="Backup Frequency"
                value={formData.backup?.frequency || 'daily'}
                onChange={(value) => updateField('backup.frequency', value)}
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
              />
              <Input
                label="Retention Period (days)"
                type="number"
                value={formData.backup?.retentionDays || 30}
                onChange={(e) =>
                  updateField('backup.retentionDays', parseInt(e.target.value) || 30)
                }
              />
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.backup?.autoCleanup || false}
                  onChange={(e) => updateField('backup.autoCleanup', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Automatically Cleanup Old Backups
                </span>
              </label>
            </CardContent>
          </Card>
        )}

        {/* Features Tab */}
        {activeTab === 'features' && (
          <Card>
            <CardHeader>
              <CardTitle>System Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.features?.enableNewRegistrations !== false}
                  onChange={(e) =>
                    updateField('features.enableNewRegistrations', e.target.checked)
                  }
                  className="w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable New Registrations
                  </span>
                  <p className="text-xs text-gray-500">
                    Allow new companies to register
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.features?.requireEmailVerification !== false}
                  onChange={(e) =>
                    updateField('features.requireEmailVerification', e.target.checked)
                  }
                  className="w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Require Email Verification
                  </span>
                  <p className="text-xs text-gray-500">
                    Users must verify their email before accessing the system
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.features?.enableTwoFactor || false}
                  onChange={(e) => updateField('features.enableTwoFactor', e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable Two-Factor Authentication
                  </span>
                  <p className="text-xs text-gray-500">
                    Allow users to enable 2FA for additional security
                  </p>
                </div>
              </label>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        {(
          <div className="flex justify-end">
            <Button onClick={handleSave} isLoading={isUpdating} size="lg">
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

