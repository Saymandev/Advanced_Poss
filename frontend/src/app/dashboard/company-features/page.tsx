'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { useGetCompaniesQuery } from '@/lib/api/endpoints/companiesApi';
import {
  RolePermission,
  useGetCompanyRolePermissionsQuery,
  useUpdateCompanyRolePermissionMutation,
} from '@/lib/api/endpoints/rolePermissionsApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import {
  CheckCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

// Import features list - must match role-access page
const features = [
  { id: 'dashboard', name: 'Dashboard', category: 'Overview' },
  { id: 'reports', name: 'Reports', category: 'Overview' },
  { id: 'staff-management', name: 'Staff Management', category: 'Staff' },
  { id: 'role-management', name: 'Role Management', category: 'Staff' },
  { id: 'attendance', name: 'Attendance', category: 'Staff' },
  { id: 'menu-management', name: 'Menu Management', category: 'Menu' },
  { id: 'categories', name: 'Categories', category: 'Menu' },
  { id: 'qr-menus', name: 'QR Menus', category: 'Menu' },
  // Orders & Tables
  { id: 'order-management', name: 'Order Management', category: 'Orders' },
  { id: 'delivery-management', name: 'Delivery Management', category: 'Orders' },
  { id: 'table-management', name: 'Table Management', category: 'Orders' },
  { id: 'kitchen-display', name: 'Kitchen Display', category: 'Orders' },
  { id: 'customer-display', name: 'Customer Display', category: 'Orders' },
  { id: 'pos-settings', name: 'POS Settings', category: 'Orders' },
  { id: 'printer-management', name: 'Printer Management', category: 'Orders' },
  { id: 'digital-receipts', name: 'Digital Receipts', category: 'Orders' },
  // Customers
  { id: 'customer-management', name: 'Customer Management', category: 'Customers' },
  { id: 'loyalty-program', name: 'Loyalty Program', category: 'Customers' },
  { id: 'marketing', name: 'Marketing', category: 'Customers' },
  // AI Features
  { id: 'ai-menu-optimization', name: 'AI Menu Optimization', category: 'AI Features' },
  { id: 'ai-customer-loyalty', name: 'Customer Loyalty AI', category: 'AI Features' },
  // Inventory
  { id: 'inventory', name: 'Inventory Management', category: 'Inventory' },
  { id: 'suppliers', name: 'Supplier Management', category: 'Inventory' },
  { id: 'purchase-orders', name: 'Purchase Orders', category: 'Inventory' },
  // Financial
  { id: 'expenses', name: 'Expense Management', category: 'Financial' },
  { id: 'accounting', name: 'Accounting', category: 'Financial' },
  { id: 'work-periods', name: 'Work Periods', category: 'Financial' },
  // System
  { id: 'settings', name: 'Settings', category: 'System' },
  { id: 'branches', name: 'Branch Management', category: 'System' },
  { id: 'notifications', name: 'Notifications', category: 'System' },
];

type CompanyRole = 'owner' | 'manager' | 'chef' | 'waiter' | 'cashier';

const ROLE_OPTIONS: { value: CompanyRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'chef', label: 'Chef' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'cashier', label: 'Cashier' },
];

export default function CompanyFeaturesPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      router.replace('/dashboard/super-admin');
    }
  }, [user, router]);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<CompanyRole>('owner');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const { data: companiesData } = useGetCompaniesQuery({});
  const companies = useMemo(() => {
    if (!companiesData) return [];
    if (Array.isArray(companiesData)) return companiesData;
    return companiesData.companies || [];
  }, [companiesData]);

  const selectedCompany = companies.find((c: any) => (c._id || c.id) === selectedCompanyId);

  const { data: rolePermissionsData, isLoading, refetch } = useGetCompanyRolePermissionsQuery(
    selectedCompanyId,
    { skip: !selectedCompanyId }
  );

  const [updateRolePermission, { isLoading: isUpdating }] = useUpdateCompanyRolePermissionMutation();

  // Update selected features when role permissions are loaded or role changes
  useEffect(() => {
    if (rolePermissionsData && rolePermissionsData.length > 0) {
      const rolePerm = rolePermissionsData.find((p: RolePermission) => p.role === selectedRole);
      if (rolePerm) {
        setSelectedFeatures(rolePerm.features || []);
      } else {
        setSelectedFeatures([]);
      }
    }
  }, [rolePermissionsData, selectedRole]);

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleSave = async () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company');
      return;
    }

    try {
      await updateRolePermission({
        companyId: selectedCompanyId,
        data: {
          role: selectedRole,
          features: selectedFeatures,
        },
      }).unwrap();
      toast.success(`Feature access updated for ${selectedRole} role`);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update feature access');
    }
  };

  const featuresByCategory = useMemo(() => {
    const grouped: Record<string, typeof features> = {};
    features.forEach((feature) => {
      if (!grouped[feature.category]) {
        grouped[feature.category] = [];
      }
      grouped[feature.category].push(feature);
    });
    return grouped;
  }, []);

  // const currentRolePermission = useMemo(() => {
  //   if (!rolePermissionsData || rolePermissionsData.length === 0) return null;
  //   return rolePermissionsData.find((p: RolePermission) => p.role === selectedRole) || null;
  // }, [rolePermissionsData, selectedRole]);

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
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <ShieldCheckIcon className="w-8 h-8 text-purple-600" />
          Company Feature Access Management
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage feature access for any company's roles
        </p>
      </div>

      {/* Company Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Company</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedCompanyId}
            onChange={(value) => {
              setSelectedCompanyId(value);
              setSelectedRole('owner');
              setSelectedFeatures([]);
            }}
            options={[
              { value: '', label: 'Select a company...' },
              ...companies.map((c: any) => ({
                value: c._id || c.id,
                label: c.name,
              })),
            ]}
            className="w-full max-w-md"
          />
          {selectedCompany && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Managing features for: <span className="font-semibold">{selectedCompany.name}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {selectedCompanyId && (
        <>
          {/* Role Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Role</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedRole}
                onChange={(value) => {
                  setSelectedRole(value as CompanyRole);
                }}
                options={ROLE_OPTIONS}
                className="w-full max-w-md"
              />
            </CardContent>
          </Card>

          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading permissions...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Feature Management */}
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>
                    Feature Access for{' '}
                    <span className="capitalize">{selectedRole}</span> Role
                  </CardTitle>
                  <Button
                    onClick={handleSave}
                    isLoading={isUpdating}
                    disabled={!selectedCompanyId}
                  >
                    Save Changes
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                      <div key={category}>
                        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
                          {category}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryFeatures.map((feature) => {
                            const isEnabled = selectedFeatures.includes(feature.id);
                            return (
                              <label
                                key={feature.id}
                                className={`
                                  flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                                  ${isEnabled
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                  }
                                `}
                              >
                                <input
                                  type="checkbox"
                                  checked={isEnabled}
                                  onChange={() => toggleFeature(feature.id)}
                                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {feature.name}
                                  </p>
                                  <p className="text-xs text-gray-500">{feature.id}</p>
                                </div>
                                {isEnabled && (
                                  <CheckCircleIcon className="w-5 h-5 text-primary-600" />
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick Actions */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedFeatures(features.map((f) => f.id));
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedFeatures([]);
                      }}
                    >
                      Clear All
                    </Button>
                    <div className="ml-auto">
                      <Badge variant="info">
                        {selectedFeatures.length} of {features.length} features enabled
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Current Permissions Overview */}
              {rolePermissionsData && rolePermissionsData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>All Roles Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {ROLE_OPTIONS.map((roleOption) => {
                        const perm = rolePermissionsData.find(
                          (p: RolePermission) => p.role === roleOption.value
                        );
                        const featureCount = perm?.features?.length || 0;
                        return (
                          <div
                            key={roleOption.value}
                            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold capitalize">{roleOption.label}</span>
                              <Badge variant={featureCount > 0 ? 'success' : 'danger'}>
                                {featureCount} features
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500">
                              {featureCount === 0
                                ? 'No features enabled'
                                : `${featureCount} feature${featureCount === 1 ? '' : 's'} enabled`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

