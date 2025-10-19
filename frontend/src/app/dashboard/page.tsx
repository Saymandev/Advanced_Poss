'use client';

import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { User } from '@/lib/slices/authSlice';
import { RootState } from '@/lib/store';
import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { useSelector } from 'react-redux';

export default function DashboardPage() {
  const auth = useSelector((state: RootState) => state.auth) as { user: User | null; isAuthenticated: boolean };
  const { user, isAuthenticated } = auth;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                RestaurantPOS
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            ✅ Successfully Logged In!
          </h1>
          
          {isAuthenticated && user && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                User Information
              </h2>
              
              <div className="space-y-4 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Name:</span>
                  <span className="text-gray-900 dark:text-white">{user.firstName} {user.lastName}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Email:</span>
                  <span className="text-gray-900 dark:text-white">{user.email}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Role:</span>
                  <span className="text-gray-900 dark:text-white capitalize">{user.role}</span>
                </div>
                
                {user.companyId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Company ID:</span>
                    <span className="text-gray-900 dark:text-white">{user.companyId}</span>
                  </div>
                )}
                
                {user.branchId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Branch ID:</span>
                    <span className="text-gray-900 dark:text-white">{user.branchId}</span>
                  </div>
                )}
                
                {user.isSuperAdmin && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Admin Status:</span>
                    <span className="text-red-600 dark:text-red-400 font-semibold">Super Admin</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <p className="text-gray-600 dark:text-gray-400 mt-8">
            Dashboard design will be implemented based on your requirements.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
