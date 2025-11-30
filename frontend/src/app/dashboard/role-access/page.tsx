'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useGetBranchesQuery } from '@/lib/api/endpoints/branchesApi';
import { useGetRolePermissionsQuery, useUpdateRolePermissionMutation } from '@/lib/api/endpoints/rolePermissionsApi';
import { Staff, useDeleteStaffMutation, useDeactivateStaffMutation, useGetStaffQuery, useUpdateStaffMutation } from '@/lib/api/endpoints/staffApi';
import { useAdminUpdatePasswordMutation, useAdminUpdatePinMutation, useActivateUserMutation } from '@/lib/api/endpoints/usersApi';
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
  ExclamationTriangleIcon,
  EyeIcon,
  KeyIcon,
  LockClosedIcon,
  MapPinIcon,
  PencilIcon,
  ReceiptPercentIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TableCellsIcon,
  TrashIcon,
  TruckIcon,
  UserGroupIcon,
  UsersIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/Input';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';

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

// Base role access definitions (includes all roles for reference)
const allRoleAccess: RoleAccess[] = [
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

// Company-level roles only (exclude SUPER_ADMIN for company dashboards)
const companyRoleAccess = allRoleAccess.filter(role => role.role !== UserRole.SUPER_ADMIN);

export default function RoleAccessPage() {
  const { user } = useAppSelector((state) => state.auth);
  
  // Redirect if user doesn't have role-management feature (auto-redirects to role-specific dashboard)
  useFeatureRedirect('role-management');
  
  const companyId = user?.companyId || '';
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditFeaturesModalOpen, setIsEditFeaturesModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<string>('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [newRole, setNewRole] = useState<string>('');
  const [newBranchId, setNewBranchId] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const [deleteStaff] = useDeleteStaffMutation();
  const [deactivateStaff] = useDeactivateStaffMutation();
  const [activateUser] = useActivateUserMutation();
  const [adminUpdatePin] = useAdminUpdatePinMutation();
  const [adminUpdatePassword] = useAdminUpdatePasswordMutation();
  const [updateRolePermission] = useUpdateRolePermissionMutation();
  
  const [updateStaff] = useUpdateStaffMutation();
  
  // Get role permissions from backend
  const { data: rolePermissionsData, isLoading: isLoadingPermissions, refetch: refetchPermissions } = useGetRolePermissionsQuery(
    undefined,
    { skip: !companyId }
  );
  
  // Get all staff members (exclude super admins - they're system-level, not company-level)
  const { data: staffData, isLoading, refetch } = useGetStaffQuery(
    {
      companyId,
      limit: 500,
      includeOwners: true,
      includeSuperAdmins: false, // Exclude super admins from company dashboard
    },
    { skip: !companyId },
  );
  
  // Get all branches for branch assignment (include both active and inactive)
  const { data: branchesData, isLoading: isLoadingBranches, error: branchesError } = useGetBranchesQuery(
    { companyId, limit: 100 }, // Removed isActive filter to show all branches
    { skip: !companyId },
  );
  
  // Extract branches with proper error handling
  const branches = useMemo(() => {
    if (!branchesData) return [];
    // Handle response structure
    if (branchesData.branches && Array.isArray(branchesData.branches)) {
      return branchesData.branches;
    }
    return [];
  }, [branchesData]);

  // Filter out super admins from staff list (they shouldn't appear in company dashboard)
  // Note: Staff type already excludes super_admin, but keeping filter for safety
  const staff = useMemo(() => {
    const allStaff = staffData?.staff || [];
    return allStaff;
  }, [staffData?.staff]);

  // Merge backend permissions with default role access
  const roleAccess = useMemo(() => {
    const baseRoles = [...companyRoleAccess];
    
    if (rolePermissionsData && rolePermissionsData.length > 0) {
      // Update roles with backend permissions
      return baseRoles.map((role) => {
        const backendPermission = rolePermissionsData.find(
          (perm) => perm.role === role.role
        );
        if (backendPermission) {
          return {
            ...role,
            features: backendPermission.features,
          };
        }
        return role;
      });
    }
    
    return baseRoles;
  }, [rolePermissionsData]);

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
  }, [staff, roleAccess]);

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
    if (!selectedStaff || !newRole) {
      setFormErrors({ role: 'Please select a role' });
      return;
    }

    // Clear previous errors
    setFormErrors({});

    // Security check: Prevent assigning super_admin role from company dashboard
    if (newRole === 'super_admin' || newRole === UserRole.SUPER_ADMIN) {
      toast.error('Super Admin role cannot be assigned from company dashboard');
      return;
    }

    // Security check: Only owners can assign owner role
    if (newRole === 'owner' && user?.role !== 'owner') {
      toast.error('Only owners can assign owner role');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateStaff({
        id: selectedStaff.id,
        role: newRole as any,
      }).unwrap();
      toast.success(`Role updated successfully`);
      setIsRoleModalOpen(false);
      setSelectedStaff(null);
      setNewRole('');
      setFormErrors({});
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update role');
      setFormErrors({ role: error.data?.message || 'Failed to update role' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeBranch = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    // Set to empty string if no branch assigned, otherwise use branchId
    setNewBranchId(staffMember.branchId || '');
    setIsBranchModalOpen(true);
  };

  const handleUpdateBranch = async () => {
    if (!selectedStaff) {
      setFormErrors({ branch: 'Staff member not selected' });
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      await updateStaff({
        id: selectedStaff.id,
        branchId: newBranchId || undefined, // undefined to unassign
      }).unwrap();
      toast.success(`Branch assignment updated successfully`);
      setIsBranchModalOpen(false);
      setSelectedStaff(null);
      setNewBranchId('');
      setFormErrors({});
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update branch assignment');
      setFormErrors({ branch: error.data?.message || 'Failed to update branch assignment' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePin = async () => {
    if (!selectedStaff || !newPin) {
      setFormErrors({ pin: 'PIN is required' });
      return;
    }

    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
      setFormErrors({ pin: 'PIN must be 4-6 digits' });
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      await adminUpdatePin({
        userId: selectedStaff.id,
        newPin,
      }).unwrap();
      toast.success('PIN updated successfully');
      setIsPinModalOpen(false);
      setSelectedStaff(null);
      setNewPin('');
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update PIN');
      setFormErrors({ pin: error.data?.message || 'Failed to update PIN' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!selectedStaff || !newPassword) {
      setFormErrors({ password: 'Password is required' });
      return;
    }

    if (newPassword.length < 8) {
      setFormErrors({ password: 'Password must be at least 8 characters' });
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(newPassword)) {
      setFormErrors({ password: 'Password must contain uppercase, lowercase, number and special character' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setFormErrors({});
    setIsSubmitting(true);

    try {
      await adminUpdatePassword({
        userId: selectedStaff.id,
        newPassword,
      }).unwrap();
      toast.success('Password updated successfully');
      setIsPasswordModalOpen(false);
      setSelectedStaff(null);
      setNewPassword('');
      setConfirmPassword('');
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update password');
      setFormErrors({ password: error.data?.message || 'Failed to update password' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedStaff) return;

    setIsSubmitting(true);
    try {
      await deleteStaff(selectedStaff.id).unwrap();
      toast.success('User deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedStaff(null);
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRestrict = async (staffMember: Staff) => {
    try {
      if (staffMember.isActive) {
        await deactivateStaff(staffMember.id).unwrap();
        toast.success('User restricted successfully');
      } else {
        await activateUser(staffMember.id).unwrap();
        toast.success('User activated successfully');
      }
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update user status');
    }
  };

  const handleEditFeatures = (role: RoleAccess) => {
    setEditingRole(role.role);
    setSelectedFeatures([...role.features]);
    setIsEditFeaturesModalOpen(true);
  };

  const handleToggleFeature = (featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleSaveFeatures = async () => {
    if (!editingRole) return;

    setIsSubmitting(true);
    try {
      await updateRolePermission({
        role: editingRole as any,
        features: selectedFeatures,
      }).unwrap();
      toast.success('Role features updated successfully');
      setIsEditFeaturesModalOpen(false);
      setEditingRole('');
      setSelectedFeatures([]);
      refetchPermissions();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update role features');
    } finally {
      setIsSubmitting(false);
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
      key: 'branch',
      title: 'Branch',
      render: (value: any, row: Staff) => (
        <div className="flex items-center gap-2">
          {row.branch ? (
            <>
              <MapPinIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {row.branch.name}
              </span>
            </>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500 italic">
              Not assigned
            </span>
          )}
        </div>
      ),
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
            title="View details"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          {/* Only owners can manage users */}
          {user?.role === 'owner' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleChangeRole(row)}
                title="Change role"
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleChangeBranch(row)}
                title="Assign branch"
              >
                <MapPinIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedStaff(row);
                  setIsPinModalOpen(true);
                }}
                title="Update PIN"
              >
                <LockClosedIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedStaff(row);
                  setIsPasswordModalOpen(true);
                }}
                title="Update password"
              >
                <KeyIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleRestrict(row)}
                title={row.isActive ? 'Restrict user' : 'Activate user'}
                className={row.isActive ? 'text-yellow-600' : 'text-green-600'}
              >
                {row.isActive ? (
                  <XMarkIcon className="w-4 h-4" />
                ) : (
                  <UsersIcon className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedStaff(row);
                  setIsDeleteModalOpen(true);
                }}
                title="Delete user"
                className="text-red-600 hover:text-red-700"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </>
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

              <div className="flex flex-wrap gap-1 mb-4">
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

              {/* Edit Features Button - Owner Only */}
              {user?.role === 'owner' && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleEditFeatures(role)}
                >
                  <PencilIcon className="w-4 h-4 mr-2" />
                  Edit Features
                </Button>
              )}
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
                  setFormErrors({});
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={isSubmitting || !newRole || newRole === selectedStaff.role}
              >
                {isSubmitting ? 'Updating...' : 'Update Role'}
              </Button>
            </div>
            {formErrors.role && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {formErrors.role}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Change Branch Modal */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={() => {
          setIsBranchModalOpen(false);
          setSelectedStaff(null);
          setNewBranchId('');
          setFormErrors({});
        }}
        title="Assign Branch"
        className="max-w-md"
      >
        {selectedStaff && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Assign branch for <strong>{selectedStaff.firstName} {selectedStaff.lastName}</strong>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                Current branch: {selectedStaff.branch?.name || 'Not assigned'}
              </p>
            </div>

            <div>
              <Select
                label="Branch"
                options={[
                  { value: '', label: 'Unassign (No branch)' },
                  ...branches.map((branch: any) => ({
                    value: branch.id,
                    label: `${branch.name}${branch.isActive === false ? ' (Inactive)' : ''}`
                  }))
                ]}
                value={newBranchId}
                onChange={setNewBranchId}
                error={formErrors.branch}
                disabled={isLoadingBranches}
              />
              {isLoadingBranches && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Loading branches...</p>
              )}
              {!isLoadingBranches && branches.length === 0 && (
                <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                  No active branches found. Please create a branch first.
                </p>
              )}
              {branchesError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Error loading branches. Please try again.
                </p>
              )}
            </div>

            {newBranchId !== (selectedStaff.branchId || '') && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                  Branch Assignment Change
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-400">
                  {selectedStaff.branch?.name || 'Not assigned'} → {newBranchId ? (branches.find((b: any) => b.id === newBranchId)?.name || 'Unknown') : 'Unassigned'}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsBranchModalOpen(false);
                  setSelectedStaff(null);
                  setNewBranchId('');
                  setFormErrors({});
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateBranch}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Branch'}
              </Button>
            </div>
            {formErrors.branch && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-4 h-4" />
                {formErrors.branch}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Update PIN Modal */}
      <Modal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setSelectedStaff(null);
          setNewPin('');
          setFormErrors({});
        }}
        title="Update PIN"
        className="max-w-md"
      >
        {selectedStaff && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Update PIN for <strong>{selectedStaff.firstName} {selectedStaff.lastName}</strong>
              </p>
            </div>

            <Input
              label="New PIN"
              type="password"
              value={newPin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setNewPin(value);
                setFormErrors({ ...formErrors, pin: '' });
              }}
              error={formErrors.pin}
              required
              helperText="Must be 4-6 digits"
              maxLength={6}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setSelectedStaff(null);
                  setNewPin('');
                  setFormErrors({});
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePin}
                disabled={isSubmitting || !newPin || newPin.length < 4}
              >
                {isSubmitting ? 'Updating...' : 'Update PIN'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Update Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setSelectedStaff(null);
          setNewPassword('');
          setConfirmPassword('');
          setFormErrors({});
        }}
        title="Update Password"
        className="max-w-md"
      >
        {selectedStaff && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Update password for <strong>{selectedStaff.firstName} {selectedStaff.lastName}</strong>
              </p>
            </div>

            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setFormErrors({ ...formErrors, password: '' });
              }}
              error={formErrors.password}
              required
              helperText="Must contain uppercase, lowercase, number and special character"
            />

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setFormErrors({ ...formErrors, confirmPassword: '' });
              }}
              error={formErrors.confirmPassword}
              required
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setSelectedStaff(null);
                  setNewPassword('');
                  setConfirmPassword('');
                  setFormErrors({});
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePassword}
                disabled={isSubmitting || !newPassword || newPassword !== confirmPassword}
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedStaff(null);
        }}
        title="Delete User"
        className="max-w-md"
      >
        {selectedStaff && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-300 mb-1">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-sm text-red-800 dark:text-red-400">
                    Are you sure you want to delete <strong>{selectedStaff.firstName} {selectedStaff.lastName}</strong>? 
                    This will permanently remove the user and all associated data.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedStaff(null);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Features Modal */}
      <Modal
        isOpen={isEditFeaturesModalOpen}
        onClose={() => {
          setIsEditFeaturesModalOpen(false);
          setEditingRole('');
          setSelectedFeatures([]);
        }}
        title={`Edit Features - ${roleAccess.find(r => r.role === editingRole)?.name || editingRole}`}
        className="max-w-4xl"
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select which features this role should have access to. Changes will apply to all users with this role.
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-6">
            {categories.map((category) => {
              const categoryFeatures = getFeaturesByCategory(category);
              const selectedCount = categoryFeatures.filter(f => selectedFeatures.includes(f.id)).length;
              const allSelected = categoryFeatures.length > 0 && selectedCount === categoryFeatures.length;
              const someSelected = selectedCount > 0 && selectedCount < categoryFeatures.length;

              return (
                <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{category}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedCount}/{categoryFeatures.length} selected
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (allSelected) {
                            // Deselect all in category
                            setSelectedFeatures(prev => 
                              prev.filter(id => !categoryFeatures.some(f => f.id === id))
                            );
                          } else {
                            // Select all in category
                            const categoryFeatureIds = categoryFeatures.map(f => f.id);
                            setSelectedFeatures(prev => {
                              const newFeatures = [...prev];
                              categoryFeatureIds.forEach(id => {
                                if (!newFeatures.includes(id)) {
                                  newFeatures.push(id);
                                }
                              });
                              return newFeatures;
                            });
                          }
                        }}
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryFeatures.map((feature) => {
                      const isSelected = selectedFeatures.includes(feature.id);
                      return (
                        <label
                          key={feature.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleFeature(feature.id)}
                            className="mt-1 w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <feature.icon className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900 dark:text-white text-sm">
                                {feature.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {feature.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditFeaturesModalOpen(false);
                setEditingRole('');
                setSelectedFeatures([]);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveFeatures}
              disabled={isSubmitting || selectedFeatures.length === 0}
            >
              {isSubmitting ? 'Saving...' : 'Save Features'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
