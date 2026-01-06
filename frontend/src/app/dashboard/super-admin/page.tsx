'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useGetDeletedBranchesQuery, usePermanentDeleteBranchMutation, useRestoreBranchMutation } from '@/lib/api/endpoints/branchesApi';
import { useGetCompaniesQuery, useGetSystemStatsQuery } from '@/lib/api/endpoints/companiesApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import { ArrowPathIcon, BuildingOffice2Icon, ExclamationTriangleIcon, ShieldCheckIcon, TrashIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function SuperAdminDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: systemStats, isLoading: isLoadingStats } = useGetSystemStatsQuery();
  const { data: companiesData, isLoading: isLoadingCompanies } = useGetCompaniesQuery({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: deletedBranchesData, isLoading: isLoadingDeleted, refetch: refetchDeleted } = useGetDeletedBranchesQuery({
    page: currentPage,
    limit: itemsPerPage,
  }, {
    refetchOnMountOrArgChange: true,
  });
  const [restoreBranch] = useRestoreBranchMutation();
  const [permanentDeleteBranch] = usePermanentDeleteBranchMutation();

  useEffect(() => {
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      router.replace('/dashboard/super-admin');
    }
  }, [user, router]);

  // Reset to page 1 when changing items per page
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Handle hash navigation to scroll to trash section
  useEffect(() => {
    if (searchParams.get('scroll') === 'trash' || window.location.hash === '#trash') {
      const trashElement = document.getElementById('trash');
      if (trashElement) {
        trashElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [searchParams]);

  // Extract companies array from response (handles both array and object responses)
  const companies = useMemo(() => {
    if (!companiesData) return [];
    // Check if companiesData is an array
    if (Array.isArray(companiesData)) {
      return companiesData;
    }
    // Check if companiesData has a companies property
    if ('companies' in companiesData && Array.isArray(companiesData.companies)) {
      return companiesData.companies;
    }
    return [];
  }, [companiesData]);

  const totalCompanies = companies.length;

  // Extract deleted branches with pagination info
  const deletedBranchesDataProcessed = useMemo(() => {
    if (!deletedBranchesData) {
      return {
        deletedBranches: [],
        totalDeletedBranches: 0,
        currentPage: 1,
        totalPages: 0
      };
    }

    const branches = deletedBranchesData.branches || [];
    const total = deletedBranchesData.total || 0;
    const page = deletedBranchesData.page || 1;
    const limit = deletedBranchesData.limit || itemsPerPage;
    const pages = Math.ceil(total / limit);

    return {
      deletedBranches: branches,
      totalDeletedBranches: total,
      currentPage: page,
      totalPages: pages,
    };
  }, [deletedBranchesData, itemsPerPage]);

  const { deletedBranches, totalDeletedBranches, totalPages } = deletedBranchesDataProcessed;

  const handleRestoreBranch = async (branchId: string, branchName: string) => {
    if (!confirm(`Are you sure you want to restore "${branchName}"?`)) return;

    try {
      await restoreBranch(branchId).unwrap();
      toast.success('Branch restored successfully');
      refetchDeleted();
    } catch (error: any) {
      const errorMessage = error?.data?.message || 'Failed to restore branch';
      toast.error(errorMessage);
    }
  };

  const handlePermanentDelete = async (branchId: string, branchName: string) => {
    if (!confirm(`⚠️ WARNING: This will PERMANENTLY DELETE "${branchName}" and ALL related data. This action CANNOT be undone. Are you sure?`)) return;

    try {
      await permanentDeleteBranch(branchId).unwrap();
      toast.success('Branch permanently deleted with all related data');
      refetchDeleted();
    } catch (error: any) {
      const errorMessage = error?.data?.message || 'Failed to permanently delete branch';
      toast.error(errorMessage);
    }
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <ShieldCheckIcon className="w-8 h-8 text-purple-600" />
          Super Admin Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          System-wide management and analytics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <BuildingOffice2Icon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingCompanies || isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    systemStats?.totalCompanies ?? totalCompanies
                  )}
                </p>
                <p className="text-xs text-gray-500">All companies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <BuildingOffice2Icon className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    systemStats?.activeCompanies ?? 0
                  )}
                </p>
                <p className="text-xs text-gray-500">Currently active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <UsersIcon className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    systemStats?.totalUsers ?? 0
                  )}
                </p>
                <p className="text-xs text-gray-500">Across all companies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Trial Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <BuildingOffice2Icon className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {isLoadingStats ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    systemStats?.trialCompanies ?? 0
                  )}
                </p>
                <p className="text-xs text-gray-500">On trial period</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => router.push('/dashboard/companies')}
              className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BuildingOffice2Icon className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-semibold">Manage Companies</p>
                  <p className="text-sm text-gray-500">View and manage all companies</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => router.push('/dashboard/users')}
              className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UsersIcon className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="font-semibold">Manage Users</p>
                  <p className="text-sm text-gray-500">View all users across companies</p>
                </div>
              </div>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingStats ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
              </div>
            ) : systemStats ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active Companies:</span>
                  <span className="font-semibold text-green-600">{systemStats.activeCompanies}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Trial Companies:</span>
                  <span className="font-semibold text-orange-600">{systemStats.trialCompanies}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Expired Companies:</span>
                  <span className="font-semibold text-red-600">{systemStats.expiredCompanies}</span>
                </div>
                {systemStats.companiesByPlan && Object.keys(systemStats.companiesByPlan).length > 0 && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold mb-2">Companies by Plan:</p>
                    <div className="space-y-2">
                      {Object.entries(systemStats.companiesByPlan).map(([plan, count]) => (
                        <div key={plan} className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{plan || 'none'}:</span>
                          <span className="font-semibold">{count as number}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                No system statistics available.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trashed Branches Management */}
      <Card id="trash">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrashIcon className="w-5 h-5 text-red-600" />
            Trashed Branches ({totalDeletedBranches})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDeleted ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : deletedBranches.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No trashed branches found.
            </p>
          ) : (
            <div className="space-y-4">
              {deletedBranches.map((branch: any) => {
                // Ensure we have the correct ID (MongoDB _id vs id)
                const branchId = branch.id || branch._id || branch._id?.toString();
                console.log('🔍 Branch data:', { branchId, branch });
                return (
                  <div
                    key={branchId}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {branch.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {typeof branch.address === 'string'
                          ? branch.address
                          : `${branch.address?.city || ''}, ${branch.address?.country || ''}`.trim().replace(/^,/, '')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Deleted: {formatDateTime(branch.deletedAt || branch.updatedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRestoreBranch(branchId, branch.name)}
                        className="flex items-center gap-1"
                      >
                        <ArrowPathIcon className="w-4 h-4" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handlePermanentDelete(branchId, branch.name)}
                        className="flex items-center gap-1"
                      >
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        Delete Forever
                      </Button>
                    </div>
                  </div>
                );
              })}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>Show</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <span>per page</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </span>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}