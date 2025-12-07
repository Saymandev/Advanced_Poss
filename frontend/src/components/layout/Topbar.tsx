'use client';

import { Button } from '@/components/ui/Button';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { apiSlice } from '@/lib/api/apiSlice';
import { logout } from '@/lib/slices/authSlice';
import { useAppDispatch, useAppSelector } from '@/lib/store';
import {
  ArrowRightOnRectangleIcon,
  CogIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SunIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function Topbar() {
  const { user, companyContext: _companyContext } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Call logout API to clear httpOnly cookies on server
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/auth/logout`, {
          method: 'POST',
          credentials: 'include', // Include cookies
          headers: {
            'Content-Type': 'application/json',
          },
        });
        // Ignore errors - cookies will be cleared by backend
      } catch (error) {
        // Ignore logout API errors - we'll clear local state anyway
        console.log('Logout API call failed (token may already be invalid):', error);
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


  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-white/95 dark:bg-gray-800/95">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left side - Search and breadcrumbs could go here */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  className="block w-64 rounded-md border-0 bg-gray-50 dark:bg-gray-800 py-1.5 pl-10 pr-3 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
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

            {/* User menu */}
            <div className="relative group">
              <Button
                variant="ghost"
                className="flex items-center gap-2 p-2"
              >
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {user?.role.replace('_', ' ')}
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
  );
}