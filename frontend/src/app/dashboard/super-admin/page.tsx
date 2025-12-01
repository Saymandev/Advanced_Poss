'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useGetCompaniesQuery, useGetSystemStatsQuery } from '@/lib/api/endpoints/companiesApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import { BuildingOffice2Icon, ShieldCheckIcon, UsersIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

export default function SuperAdminDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const { data: systemStats, isLoading: isLoadingStats } = useGetSystemStatsQuery();
  const { data: companiesData, isLoading: isLoadingCompanies } = useGetCompaniesQuery({});

  useEffect(() => {
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      router.replace('/dashboard/super-admin');
    }
  }, [user, router]);

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
                    '0'
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
    </div>
  );
}

