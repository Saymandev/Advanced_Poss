'use client';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { UserRole } from '@/lib/enums/user-role.enum';
import {
    BellIcon,
    BuildingStorefrontIcon,
    CalculatorIcon,
    ChartBarIcon,
    ClipboardDocumentListIcon,
    ClockIcon,
    CogIcon,
    CurrencyDollarIcon,
    ReceiptPercentIcon,
    ShieldCheckIcon,
    ShoppingBagIcon,
    TableCellsIcon,
    TruckIcon,
    UserGroupIcon,
    UsersIcon
} from '@heroicons/react/24/outline';

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
  const getFeatureById = (id: string) => features.find(f => f.id === id);

  const getFeaturesByCategory = (category: string) => {
    return features.filter(f => f.category === category);
  };

  const categories = Array.from(new Set(features.map(f => f.category)));

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
              <div className="flex items-center gap-3 mb-4">
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
                {role.features.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Features
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
    </div>
  );
}
