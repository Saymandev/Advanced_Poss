'use client';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useGetCompaniesQuery } from '@/lib/api/endpoints/companiesApi';
import { useGetAllUsersSystemWideQuery } from '@/lib/api/endpoints/usersApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
  BuildingOffice2Icon,
  CheckCircleIcon,
  EyeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
const ALL_ROLES = [
  { value: 'all', label: 'All Roles' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'chef', label: 'Chef' },
  { value: 'waiter', label: 'Waiter' },
  { value: 'cashier', label: 'Cashier' },
];
export default function SystemUsersPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  useEffect(() => {
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      router.replace('/dashboard/super-admin');
    }
  }, [user, router]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { data: usersData, isLoading } = useGetAllUsersSystemWideQuery({
    page: currentPage,
    limit: itemsPerPage,
    search: searchQuery || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    status: statusFilter !== 'all' ? (statusFilter === 'active' ? 'active' : 'inactive') : undefined,
  });
  const { data: companiesData } = useGetCompaniesQuery({});
  const companies = useMemo(() => {
    if (!companiesData) return [];
    if (Array.isArray(companiesData)) return companiesData;
    return companiesData.companies || [];
  }, [companiesData]);
  const users = useMemo(() => {
    if (!usersData) return [];
    return usersData.users || [];
  }, [usersData]);
  const totalUsers = usersData?.total || 0;
  const filteredUsers = useMemo(() => {
    let filtered = users;
    // Filter by company if selected
    if (companyFilter !== 'all') {
      filtered = filtered.filter((u: any) => {
        const userCompanyId = u.companyId?._id || u.companyId?.id || u.companyId;
        return userCompanyId === companyFilter || userCompanyId?.toString() === companyFilter;
      });
    }
    return filtered;
  }, [users, companyFilter]);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);
  const openViewModal = (userData: any) => {
    setSelectedUser(userData);
    setIsViewModalOpen(true);
  };
  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, string> = {
      super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      owner: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      manager: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      chef: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      waiter: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      cashier: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    };
    return roleMap[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };
  const getRoleLabel = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  const columns = [
    {
      key: 'name',
      title: 'User',
      render: (_value: any, userData: any) => (
        <div className="flex items-center gap-3">
          {userData.avatar ? (
            <img
              src={userData.avatar}
              alt={`${userData.firstName} ${userData.lastName}`}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
              {userData.firstName?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">
              {userData.firstName} {userData.lastName}
            </p>
            <p className="text-sm text-gray-500">{userData.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      title: 'Role',
      render: (_value: any, userData: any) => (
        <Badge className={getRoleBadge(userData.role)}>
          {getRoleLabel(userData.role)}
        </Badge>
      ),
    },
    {
      key: 'company',
      title: 'Company',
      render: (_value: any, userData: any) => {
        const company = userData.companyId || userData.company;
        const companyName = typeof company === 'object' ? company?.name : 'N/A';
        return (
          <div className="flex items-center gap-2">
            <BuildingOffice2Icon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {companyName || 'No Company'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'branch',
      title: 'Branch',
      render: (_value: any, userData: any) => {
        const branch = userData.branchId || userData.branch;
        const branchName = typeof branch === 'object' ? branch?.name : 'N/A';
        return (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {branchName || 'No Branch'}
          </span>
        );
      },
    },
    {
      key: 'phone',
      title: 'Contact',
      render: (_value: any, userData: any) => (
        <div className="flex items-center gap-2">
          {userData.phone && (
            <>
              <PhoneIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">{userData.phone}</span>
            </>
          )}
          {!userData.phone && (
            <span className="text-sm text-gray-400">Not provided</span>
          )}
        </div>
      ),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (_value: any, userData: any) => (
        <Badge variant={userData.isActive ? 'success' : 'danger'}>
          {userData.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_value: any, userData: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => openViewModal(userData)}
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="View Details"
          >
            <EyeIcon className="w-5 h-5" />
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
            <UsersIcon className="w-8 h-8 text-purple-600" />
            System-wide User Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            View and manage all users across all companies
          </p>
        </div>
      </div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <UsersIcon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-xs text-gray-500">Across all companies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredUsers.filter((u: any) => u.isActive).length}
                </p>
                <p className="text-xs text-gray-500">Currently active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <BuildingOffice2Icon className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{companies.length}</p>
                <p className="text-xs text-gray-500">Total companies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Super Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredUsers.filter((u: any) => u.role === 'super_admin').length}
                </p>
                <p className="text-xs text-gray-500">System administrators</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full"
            />
            <Select
              value={roleFilter}
              onChange={(value) => {
                setRoleFilter(value);
                setCurrentPage(1);
              }}
              options={ALL_ROLES}
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
              value={companyFilter}
              onChange={(value) => {
                setCompanyFilter(value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Companies' },
                ...companies.map((c: any) => ({
                  value: c._id || c.id,
                  label: c.name,
                })),
              ]}
            />
            <div className="flex items-center justify-end">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Users Table */}
      <DataTable
        data={paginatedUsers}
        columns={columns}
        loading={isLoading}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil(filteredUsers.length / itemsPerPage),
          itemsPerPage,
          totalItems: filteredUsers.length,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="system-users"
        onExport={(format, items) => {
          }}
        emptyMessage="No users found."
      />
      {/* View User Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedUser(null);
        }}
        title={`${selectedUser?.firstName} ${selectedUser?.lastName}` || 'User Details'}
        className="max-w-2xl"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              {selectedUser.avatar ? (
                <img
                  src={selectedUser.avatar}
                  alt={`${selectedUser.firstName} ${selectedUser.lastName}`}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                  {selectedUser.firstName?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <Badge variant={selectedUser.isActive ? 'success' : 'danger'}>
                  {selectedUser.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{selectedUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{selectedUser.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Role</p>
                <Badge className={getRoleBadge(selectedUser.role)}>
                  {getRoleLabel(selectedUser.role)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email Verified</p>
                <Badge variant={selectedUser.isEmailVerified ? 'success' : 'warning'}>
                  {selectedUser.isEmailVerified ? 'Verified' : 'Not Verified'}
                </Badge>
              </div>
            </div>
            {(selectedUser.companyId || selectedUser.company) && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Company</p>
                <div className="flex items-center gap-2">
                  <BuildingOffice2Icon className="w-5 h-5 text-gray-400" />
                  <p className="font-medium">
                    {typeof selectedUser.companyId === 'object'
                      ? selectedUser.companyId?.name
                      : typeof selectedUser.company === 'object'
                      ? selectedUser.company?.name
                      : 'N/A'}
                  </p>
                </div>
              </div>
            )}
            {(selectedUser.branchId || selectedUser.branch) && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Branch</p>
                <p className="font-medium">
                  {typeof selectedUser.branchId === 'object'
                    ? selectedUser.branchId?.name
                    : typeof selectedUser.branch === 'object'
                    ? selectedUser.branch?.name
                    : 'N/A'}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Employee ID</p>
                <p className="font-medium">{selectedUser.employeeId || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Login</p>
                <p className="font-medium">
                  {selectedUser.lastLogin ? formatDateTime(selectedUser.lastLogin) : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium">
                  {selectedUser.createdAt ? formatDateTime(selectedUser.createdAt) : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Updated</p>
                <p className="font-medium">
                  {selectedUser.updatedAt ? formatDateTime(selectedUser.updatedAt) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}