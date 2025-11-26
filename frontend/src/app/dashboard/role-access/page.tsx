'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Staff, useGetStaffQuery, useUpdateStaffMutation } from '@/lib/api/endpoints/staffApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import {
  BellIcon,
  BuildingStorefrontIcon,
  CalculatorIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CogIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TableCellsIcon,
  TruckIcon,
  UserGroupIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface Feature {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
}

interface RoleAccess {
  role: UserRole;
  name: string;
  description: string;
  features: string[];
  color: string;
}

const features: Feature[] = [
  // Dashboard & Overview
  { id: 'dashboard', name: 'Dashboard', description: 'View dashboard and analytics', icon: ChartBarIcon, category: 'Overview' },
  { id: 'reports', name: 'Reports', description: 'Access reports and analytics', icon: ClipboardDocumentListIcon, category: 'Overview' },

  // User & Staff Management
  { id: 'staff-management', name: 'Staff Management', description: 'Manage staff members', icon: UsersIcon, category: 'Staff' },
  { id: 'role-management', name: 'Role Management', description: 'Manage user roles and permissions', icon: ShieldCheckIcon, category: 'Staff' },
  { id: 'attendance', name: 'Attendance', description: 'Track staff attendance', icon: ClockIcon, category: 'Staff' },

  // Menu & Products
  { id: 'menu-management', name: 'Menu Management', description: 'Manage menu items and categories', icon: ShoppingBagIcon, category: 'Menu' },
  { id: 'categories', name: 'Categories', description: 'Manage menu categories', icon: ClipboardDocumentListIcon, category: 'Menu' },

  // Orders & Tables
  { id: 'order-management', name: 'Order Management', description: 'Manage orders and transactions', icon: ClipboardDocumentListIcon, category: 'Orders' },
  { id: 'table-management', name: 'Table Management', description: 'Manage restaurant tables', icon: TableCellsIcon, category: 'Orders' },
  { id: 'kitchen-display', name: 'Kitchen Display', description: 'Access kitchen display system', icon: BuildingStorefrontIcon, category: 'Orders' },

  // Customer Management
  { id: 'customer-management', name: 'Customer Management', description: 'Manage customer data', icon: UserGroupIcon, category: 'Customers' },
  { id: 'loyalty-program', name: 'Loyalty Program', description: 'Manage loyalty programs', icon: ReceiptPercentIcon, category: 'Customers' },

  // Inventory & Suppliers
  { id: 'inventory', name: 'Inventory Management', description: 'Manage inventory and stock', icon: ClipboardDocumentListIcon, category: 'Inventory' },
  { id: 'suppliers', name: 'Supplier Management', description: 'Manage suppliers', icon: TruckIcon, category: 'Inventory' },
  { id: 'purchase-orders', name: 'Purchase Orders', description: 'Create and manage purchase orders', icon: ClipboardDocumentListIcon, category: 'Inventory' },

  // Financial Management
  { id: 'expenses', name: 'Expense Management', description: 'Track and manage expenses', icon: CurrencyDollarIcon, category: 'Financial' },
  { id: 'accounting', name: 'Accounting', description: 'Access accounting features', icon: CalculatorIcon, category: 'Financial' },
  { id: 'work-periods', name: 'Work Periods', description: 'Manage work periods and cash flow', icon: ClockIcon, category: 'Financial' },

  // System & Settings
  { id: 'settings', name: 'Settings', description: 'Access system settings', icon: CogIcon, category: 'System' },
  { id: 'branches', name: 'Branch Management', description: 'Manage multiple branches', icon: BuildingStorefrontIcon, category: 'System' },
  { id: 'notifications', name: 'Notifications', description: 'Manage system notifications', icon: BellIcon, category: 'System' },
];

const roleAccess: RoleAccess[] = [
  {
    role: UserRole.SUPER_ADMIN,
    name: 'Super Admin',
    description: 'Full system access with all features',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    features: features.map(f => f.id),
  },
  {
    role: UserRole.OWNER,
    name: 'Owner',
    description: 'Full business management access',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    features: [
      'dashboard', 'reports', 'staff-management', 'role-management', 'attendance',
      'menu-management', 'categories', 'order-management', 'table-management', 'kitchen-display',
      'customer-management', 'loyalty-program', 'inventory', 'suppliers', 'purchase-orders',
      'expenses', 'accounting', 'work-periods', 'settings', 'branches', 'notifications'
    ],
  },
  {
    role: UserRole.MANAGER,
    name: 'Manager',
    description: 'Operational management access',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    features: [
      'dashboard', 'reports', 'staff-management', 'attendance', 'menu-management',
      'categories', 'order-management', 'table-management', 'kitchen-display',
      'customer-management', 'loyalty-program', 'inventory', 'suppliers',
      'expenses', 'work-periods', 'notifications'
    ],
  },
  {
    role: UserRole.CHEF,
    name: 'Chef',
    description: 'Kitchen operations access',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    features: [
      'dashboard', 'menu-management', 'categories', 'kitchen-display',
      'inventory', 'purchase-orders', 'notifications'
    ],
  },
  {
    role: UserRole.WAITER,
    name: 'Waiter',
    description: 'Order taking and customer service',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    features: [
      'dashboard', 'order-management', 'table-management', 'customer-management',
      'notifications'
    ],
  },
  {
    role: UserRole.CASHIER,
    name: 'Cashier',
    description: 'Payment processing and order completion',
    color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    features: [
      'dashboard', 'order-management', 'customer-management', 'expenses',
      'work-periods', 'notifications'
    ],
  },
];

export default function RoleAccessPage() {
  const { user } = useAppSelector((state) => state.auth);
  const companyId = user?.companyId || '';
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState<string>('');
  
  // Get all staff members
  const { data: staffData, isLoading, refetch } = useGetStaffQuery(
    {
      companyId,
      limit: 500,
      includeOwners: true,
      includeSuperAdmins: true,
    },
    { skip: !companyId },
  );
  const [updateStaff] = useUpdateStaffMutation();

  const staff = useMemo(() => staffData?.staff || [], [staffData?.staff]);

  // Filter staff by selected role
  const filteredStaff = useMemo(() => {
    if (selectedRole === 'all') return staff;
    return staff.filter((s: Staff) => s.role === selectedRole);
  }, [staff, selectedRole]);

  // Count staff by role
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    roleAccess.forEach((role) => {
      counts[role.role] = staff.filter((s: Staff) => s.role === role.role && s.isActive).length;
    });
    return counts;
  }, [staff]);

  const getFeatureById = (id: string) => features.find(f => f.id === id);

  const getFeaturesByCategory = (category: string) => {
    return features.filter(f => f.category === category);
  };

  const categories = Array.from(new Set(features.map(f => f.category)));

  const handleViewStaff = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setIsViewModalOpen(true);
  };

  const handleChangeRole = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setNewRole(staffMember.role);
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedStaff || !newRole) return;

    try {
      await updateStaff({
        id: selectedStaff.id,
        role: newRole as any,
      }).unwrap();
      toast.success(`Role updated successfully`);
      setIsRoleModalOpen(false);
      setSelectedStaff(null);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update role');
    }
  };

  const staffColumns = [
    {
      key: 'name',
      title: 'Staff Member',
      render: (value: string, row: Staff) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <UsersIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
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
      key: 'role',
      title: 'Current Role',
      render: (value: string) => {
        const role = roleAccess.find(r => r.role === value);
        return (
          <Badge className={role?.color || 'bg-gray-100 text-gray-800'}>
            {role?.name || value}
          </Badge>
        );
      },
    },
    {
      key: 'department',
      title: 'Department',
      render: (value: string) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {value || 'N/A'}
        </span>
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
      render: (value: any, row: Staff) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewStaff(row)}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          {(user?.role === 'super_admin' || user?.role === 'owner') && row.isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleChangeRole(row)}
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (!companyId) {
    return (
      <div className="flex items-center justify-center h-96 text-center">
        <div>
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            No company selected
          </p>
          <p className="text-gray-500 dark:text-gray-400">
            Please select a company to manage role access.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Role Access Control</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage user roles and their access permissions
          </p>
        </div>
      </div>

      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roleAccess.map((role) => (
          <Card key={role.role} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${role.color}`}>
                    <UsersIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {role.features.length} features
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">{roleCounts[role.role] || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Active Users</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {role.description}
              </p>

              <div className="flex flex-wrap gap-1">
                {categories.slice(0, 3).map((category) => {
                  const categoryFeatures = getFeaturesByCategory(category);
                  const hasAccess = categoryFeatures.some(f => role.features.includes(f.id));

                  return hasAccess ? (
                    <Badge key={category} variant="success" className="text-xs">
                      {category}
                    </Badge>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Staff Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Staff Members by Role</CardTitle>
            <div className="w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Roles' },
                  ...roleAccess.map(r => ({ value: r.role, label: r.name }))
                ]}
                value={selectedRole}
                onChange={setSelectedRole}
                placeholder="Filter by role"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredStaff}
            columns={staffColumns}
            loading={isLoading}
            searchable={true}
            selectable={false}
            emptyMessage="No staff members found. Create staff members to assign roles."
          />
        </CardContent>
      </Card>

      {/* Detailed Feature Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Access Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                    Feature
                  </th>
                  {roleAccess.map((role) => (
                    <th key={role.role} className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      {role.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((category) => (
                  <>
                    {/* Category Header */}
                    <tr className="bg-gray-50 dark:bg-gray-800">
                      <td colSpan={roleAccess.length + 1} className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {category}
                      </td>
                    </tr>

                    {/* Features in Category */}
                    {getFeaturesByCategory(category).map((feature) => (
                      <tr key={feature.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <feature.icon className="w-5 h-5 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {feature.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        </td>
                        {roleAccess.map((role) => (
                          <td key={role.role} className="text-center py-3 px-4">
                            {role.features.includes(feature.id) ? (
                              <Badge variant="success" className="text-xs">
                                ✓
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                ✗
                              </Badge>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {roleAccess.map((role) => (
          <Card key={role.role}>
            <CardContent className="p-6 text-center">
              <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${role.color}`}>
                <UsersIcon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                {role.name}
              </h3>
              <p className="text-2xl font-bold text-primary-600 mb-2">
                {roleCounts[role.role] || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Active Users
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {role.features.length} features
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Access Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Access Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {roleAccess.map((role) => {
              const categoryAccess = categories.map((category) => {
                const categoryFeatures = getFeaturesByCategory(category);
                const accessibleFeatures = categoryFeatures.filter(f => role.features.includes(f.id));
                return {
                  category,
                  total: categoryFeatures.length,
                  accessible: accessibleFeatures.length,
                  percentage: (accessibleFeatures.length / categoryFeatures.length) * 100,
                };
              });

              return (
                <div key={role.role} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${role.color}`}>
                      <UsersIcon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {role.name}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryAccess.map((cat) => (
                      <div key={cat.category} className="text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          {cat.category}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-lg font-semibold text-gray-900 dark:text-white">
                            {cat.accessible}/{cat.total}
                          </span>
                          <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                cat.percentage === 100
                                  ? 'bg-green-500'
                                  : cat.percentage > 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* View Staff Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedStaff(null);
        }}
        title="Staff Details"
        className="max-w-2xl"
      >
        {selectedStaff && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <UsersIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedStaff.firstName} {selectedStaff.lastName}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedStaff.email}</p>
                <Badge className={roleAccess.find(r => r.role === selectedStaff.role)?.color || 'bg-gray-100 text-gray-800'} variant="default">
                  {roleAccess.find(r => r.role === selectedStaff.role)?.name || selectedStaff.role}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Role Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Role:</span>{' '}
                    <span className="text-gray-900 dark:text-white">
                      {roleAccess.find(r => r.role === selectedStaff.role)?.name || selectedStaff.role}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Features Access:</span>{' '}
                    <span className="text-gray-900 dark:text-white">
                      {roleAccess.find(r => r.role === selectedStaff.role)?.features.length || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Access Categories</h4>
                <div className="space-y-1">
                  {categories.map((category) => {
                    const categoryFeatures = getFeaturesByCategory(category);
                    const role = roleAccess.find(r => r.role === selectedStaff.role);
                    const accessibleFeatures = categoryFeatures.filter(f => role?.features.includes(f.id));
                    
                    if (accessibleFeatures.length === 0) return null;

                    return (
                      <div key={category} className="text-sm">
                        <span className="text-gray-600 dark:text-gray-400">{category}:</span>{' '}
                        <span className="text-gray-900 dark:text-white">
                          {accessibleFeatures.length}/{categoryFeatures.length}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Available Features</h4>
              <div className="grid grid-cols-2 gap-2">
                {roleAccess
                  .find(r => r.role === selectedStaff.role)
                  ?.features.map((featureId) => {
                    const feature = getFeatureById(featureId);
                    if (!feature) return null;
                    return (
                      <div key={featureId} className="flex items-center gap-2 text-sm">
                        <Badge variant="success" className="text-xs">✓</Badge>
                        <span className="text-gray-700 dark:text-gray-300">{feature.name}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedStaff(null);
          setNewRole('');
        }}
        title="Change Role"
        className="max-w-md"
      >
        {selectedStaff && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Change role for <strong>{selectedStaff.firstName} {selectedStaff.lastName}</strong>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                Current role: {roleAccess.find(r => r.role === selectedStaff.role)?.name || selectedStaff.role}
              </p>
            </div>

            <Select
              label="New Role"
              options={roleAccess.map(role => ({
                value: role.role,
                label: role.name
              }))}
              value={newRole}
              onChange={setNewRole}
            />

            {newRole && newRole !== selectedStaff.role && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Role Change Summary
                </p>
                <div className="space-y-1 text-xs text-blue-800 dark:text-blue-400">
                  <p>
                    <strong>Current:</strong> {roleAccess.find(r => r.role === selectedStaff.role)?.features.length || 0} features
                  </p>
                  <p>
                    <strong>New:</strong> {roleAccess.find(r => r.role === newRole)?.features.length || 0} features
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setSelectedStaff(null);
                  setNewRole('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={!newRole || newRole === selectedStaff.role}
              >
                Update Role
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
