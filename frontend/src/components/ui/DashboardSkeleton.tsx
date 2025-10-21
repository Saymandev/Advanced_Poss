import { CardSkeleton, Skeleton, StatsSkeleton } from './Skeleton';

export const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar Skeleton */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" width={32} height={32} />
            <div className="space-y-2">
              <Skeleton height={20} width="60%" />
              <Skeleton height={12} width="80%" />
            </div>
          </div>
          
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" width={32} height={32} />
            <div className="space-y-2">
              <Skeleton height={16} width="70%" />
              <Skeleton height={12} width="50%" />
            </div>
          </div>
          
          {/* Navigation Items */}
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton variant="circular" width={20} height={20} />
                <Skeleton height={16} width="70%" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Topbar Skeleton */}
        <div className="fixed top-0 right-0 left-64 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton height={40} width={256} />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="circular" width={32} height={32} />
                <Skeleton variant="circular" width={32} height={32} />
                <div className="flex items-center gap-2">
                  <Skeleton height={16} width={80} />
                  <Skeleton height={12} width={60} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <main className="pt-16 py-6">
          <div className="mx-auto w-full px-4">
            <div className="space-y-6">
              {/* Page Header */}
              <div className="space-y-2">
                <Skeleton height={32} width="40%" />
                <Skeleton height={20} width="60%" />
              </div>

              {/* Stats Cards */}
              <StatsSkeleton count={4} />

              {/* Content Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CardSkeleton count={2} />
              </div>

              {/* Table Skeleton */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <div className="p-6">
                  <Skeleton height={24} width="30%" className="mb-4" />
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton variant="circular" width={40} height={40} />
                        <div className="flex-1 space-y-2">
                          <Skeleton height={16} width="60%" />
                          <Skeleton height={12} width="40%" />
                        </div>
                        <Skeleton height={32} width={80} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
