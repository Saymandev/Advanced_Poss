'use client';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { apiSlice } from '@/lib/api/apiSlice';
import { useGetCurrentWorkPeriodQuery } from '@/lib/api/endpoints/workPeriodsApi';
import { logout } from '@/lib/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import {
  ArrowRightOnRectangleIcon,
  ClockIcon,
  CogIcon,
  HomeModernIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useTheme } from 'next-themes';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
export function Topbar() {
  const { user, companyContext: _companyContext } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { data: currentShift, isLoading: shiftLoading } = useGetCurrentWorkPeriodQuery();
  // Sync search input with URL when on order-history page
  useEffect(() => {
    if (pathname === '/dashboard/order-history') {
      setSearchQuery(urlSearch);
    } else {
      setSearchQuery('');
    }
  }, [pathname, urlSearch]);
  const handleLogout = async () => {
    try {
      // Call logout API to clear httpOnly cookies on server
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/auth/logout`, {
          method: 'POST',
          credentials: 'include', // Include cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });
        // Ignore errors - cookies will be cleared by backend
      } catch (error) {
        // Ignore logout API errors - we'll clear local state anyway
      }
    } catch (error) {
      // Ignore errors
    }
    // Clear auth state from Redux
    dispatch(logout());
    // Clear all localStorage (tokens are cleared by backend via httpOnly cookies)
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('companyContext');
    // Clear RTK Query cache
    dispatch(apiSlice.util.resetApiState());
    toast.success('Logged out successfully');
    router.push('/auth/login');
  };
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    // Navigate to order history page with search query
    router.push(`/dashboard/order-history?search=${encodeURIComponent(searchQuery.trim())}`);
    setIsSearchModalOpen(false);
    // Don't clear searchQuery - let it sync from URL
  };
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };
  // Focus search input when modal opens
  useEffect(() => {
    if (isSearchModalOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isSearchModalOpen]);
  return (
    <>
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 w-full">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left side - Search and breadcrumbs could go here */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Desktop Search */}
              <form onSubmit={handleSearch} className="hidden md:block flex-1 max-w-md">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search orders, customers..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-1.5 pl-10 pr-3 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-600 focus:border-primary-600 sm:text-sm sm:leading-6"
                  />
                </div>
              </form>
              {/* Mobile Search Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSearchModalOpen(true)}
                className="md:hidden p-2"
                aria-label="Search"
              >
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
          {/* Right side - User menu and notifications */}
          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2"
            >
              {theme === 'dark' ? (
                <SunIcon className="h-4 w-4" />
              ) : (
                <MoonIcon className="h-4 w-4" />
              )}
            </Button>
             {/* Notifications */}
            <NotificationBell />

            {/* Active Shift Indicator */}
            {!shiftLoading && currentShift && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsShiftModalOpen(true)}
                  className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50 px-3 py-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 transition-all rounded-full"
                >
                  <div className="relative">
                    <ClockIcon className="h-4 w-4" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-ping" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full" />
                  </div>
                  <span className="text-xs font-semibold hidden sm:inline">Active Shift #{currentShift.serial}</span>
                </Button>
              </div>
            )}
            {/* User menu */}
            <div className="relative group">
              <Button
                variant="ghost"
                className="flex items-center gap-2 p-2"
                >
                {user?.avatar ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary-200 dark:border-primary-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={user.avatar}
                      alt={`${user?.firstName} ${user?.lastName}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to icon if image fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = (e.target as HTMLImageElement).parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center"><svg class="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>';
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                    {user?.firstName || user?.lastName ? (
                      <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                        {user.firstName?.charAt(0) || ''}{user.lastName?.charAt(0) || ''}
                      </span>
                    ) : (
                      <UserCircleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    )}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {user?.role ? user.role.replace('_', ' ') : 'Unknown'}
                  </p>
                </div>
              </Button>
              {/* Dropdown menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-1">
                  <button
                    onClick={() => router.push('/dashboard/settings')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <CogIcon className="w-4 h-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/profile')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <UserCircleIcon className="w-4 h-4" />
                    Profile
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
    {/* Mobile Search Modal */}
    <Modal
      isOpen={isSearchModalOpen}
      onClose={() => {
        setIsSearchModalOpen(false);
        setSearchQuery('');
      }}
      title="Search"
      size="full"
      className="z-[60]"
    >
      <form onSubmit={handleSearch} className="p-4">
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search orders, customers..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 py-3 pl-10 pr-10 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-primary-600 focus:border-primary-600 text-base"
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              aria-label="Clear search"
            >
              <XMarkIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            className="flex-1"
            disabled={!searchQuery.trim()}
          >
            Search
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setIsSearchModalOpen(false);
              setSearchQuery('');
            }}
          >
            Cancel
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          Search for orders, customers, and more...
        </p>
       </form>
    </Modal>

    {/* Active Shift Details Modal */}
    <Modal
      isOpen={isShiftModalOpen}
      onClose={() => setIsShiftModalOpen(false)}
      title="Active Shift Details"
      size="md"
    >
      <div className="space-y-4 py-2">
        {currentShift ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Shift Serial</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">#{currentShift.serial}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-lg font-bold text-green-600 dark:text-green-400 capitalize">{currentShift.status}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Start Time</p>
                <p className="text-base font-medium text-gray-900 dark:text-white">
                  {currentShift.startTime ? format(new Date(currentShift.startTime), 'MMM d, yyyy h:mm a') : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Opening Balance</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(currentShift.openingBalance || 0)}
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
              <HomeModernIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-0.5">Note</p>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  This shift is currently active and recording transactions. You can manage shifts from the Work Periods section.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setIsShiftModalOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsShiftModalOpen(false);
                  router.push('/dashboard/work-periods');
                }}
              >
                Manage Shifts
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No active work period found.</p>
          </div>
        )}
      </div>
    </Modal>
    </>
  );
}