'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { useGetSubscriptionPlansQuery } from '@/lib/api/endpoints/subscriptionsApi';
import { useGetPublicStatsQuery, useGetPublicTestimonialsQuery } from '@/lib/api/endpoints/systemFeedbackApi';
import {
  ArrowRightIcon,
  BellAlertIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  PlayIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

// Feature mapping from feature keys to display information
const featureMapping: Record<string, { icon: any; title: string; description: string; gradient: string }> = {
  'dashboard': { icon: ChartBarIcon, title: 'Real-time Dashboard', description: 'Get instant insights with powerful analytics and beautiful charts', gradient: 'from-blue-500 to-cyan-500' },
  'reports': { icon: ChartBarIcon, title: 'Advanced Reports', description: 'Comprehensive reporting and analytics for your business', gradient: 'from-blue-500 to-cyan-500' },
  'staff-management': { icon: UserGroupIcon, title: 'Staff Management', description: 'Manage your team with role-based access control', gradient: 'from-green-500 to-emerald-500' },
  'role-management': { icon: UserGroupIcon, title: 'Role Management', description: 'Customize roles and permissions for your team', gradient: 'from-green-500 to-emerald-500' },
  'attendance': { icon: UserGroupIcon, title: 'Attendance Tracking', description: 'Track staff attendance and work hours', gradient: 'from-green-500 to-emerald-500' },
  'menu-management': { icon: DevicePhoneMobileIcon, title: 'Menu Management', description: 'Create and manage your restaurant menu easily', gradient: 'from-purple-500 to-pink-500' },
  'categories': { icon: DevicePhoneMobileIcon, title: 'Menu Categories', description: 'Organize your menu with categories', gradient: 'from-purple-500 to-pink-500' },
  'qr-menus': { icon: DevicePhoneMobileIcon, title: 'QR Code Menus', description: 'Generate QR codes for contactless ordering', gradient: 'from-purple-500 to-pink-500' },
  'order-management': { icon: CreditCardIcon, title: 'Order Management', description: 'Handle all orders efficiently from one place', gradient: 'from-orange-500 to-red-500' },
  'delivery-management': { icon: CreditCardIcon, title: 'Delivery Management', description: 'Manage delivery orders and track deliveries', gradient: 'from-orange-500 to-red-500' },
  'table-management': { icon: CreditCardIcon, title: 'Table Management', description: 'Manage restaurant tables and reservations', gradient: 'from-orange-500 to-red-500' },
  'kitchen-display': { icon: BellAlertIcon, title: 'Kitchen Display', description: 'Real-time kitchen order display system', gradient: 'from-indigo-500 to-blue-500' },
  'customer-display': { icon: BellAlertIcon, title: 'Customer Display', description: 'Display orders and information to customers', gradient: 'from-indigo-500 to-blue-500' },
  'pos-settings': { icon: CreditCardIcon, title: 'POS Settings', description: 'Configure your POS system settings', gradient: 'from-orange-500 to-red-500' },
  'printer-management': { icon: CloudArrowUpIcon, title: 'Printer Management', description: 'Manage receipt and kitchen printers', gradient: 'from-teal-500 to-cyan-500' },
  'digital-receipts': { icon: CloudArrowUpIcon, title: 'Digital Receipts', description: 'Send digital receipts to customers', gradient: 'from-teal-500 to-cyan-500' },
  'customer-management': { icon: UserGroupIcon, title: 'Customer Management', description: 'Manage customer database and relationships', gradient: 'from-green-500 to-emerald-500' },
  'loyalty-program': { icon: StarIcon, title: 'Loyalty Program', description: 'Reward customers with loyalty points and rewards', gradient: 'from-yellow-500 to-orange-500' },
  'marketing': { icon: SparklesIcon, title: 'Marketing Tools', description: 'Promote your restaurant with marketing campaigns', gradient: 'from-pink-500 to-rose-500' },
  'ai-menu-optimization': { icon: BoltIcon, title: 'AI Menu Optimization', description: 'Optimize your menu with AI-powered insights', gradient: 'from-yellow-500 to-orange-500' },
  'ai-customer-loyalty': { icon: BoltIcon, title: 'AI Customer Loyalty', description: 'AI-powered customer retention strategies', gradient: 'from-yellow-500 to-orange-500' },
  'inventory': { icon: ChartBarIcon, title: 'Inventory Management', description: 'Track inventory levels and stock movements', gradient: 'from-blue-500 to-cyan-500' },
  'suppliers': { icon: UserGroupIcon, title: 'Supplier Management', description: 'Manage suppliers and purchase orders', gradient: 'from-green-500 to-emerald-500' },
  'purchase-orders': { icon: CreditCardIcon, title: 'Purchase Orders', description: 'Create and manage purchase orders', gradient: 'from-orange-500 to-red-500' },
  'expenses': { icon: ChartBarIcon, title: 'Expense Tracking', description: 'Track and manage business expenses', gradient: 'from-blue-500 to-cyan-500' },
  'accounting': { icon: ChartBarIcon, title: 'Accounting', description: 'Comprehensive accounting and financial management', gradient: 'from-blue-500 to-cyan-500' },
  'work-periods': { icon: ChartBarIcon, title: 'Work Periods', description: 'Manage work shifts and periods', gradient: 'from-blue-500 to-cyan-500' },
  'settings': { icon: ShieldCheckIcon, title: 'System Settings', description: 'Configure system-wide settings', gradient: 'from-red-500 to-rose-500' },
  'branches': { icon: GlobeAltIcon, title: 'Multi-Branch', description: 'Manage multiple branches from one dashboard', gradient: 'from-violet-500 to-purple-500' },
  'notifications': { icon: BellAlertIcon, title: 'Smart Notifications', description: 'Stay updated with real-time alerts and notifications', gradient: 'from-indigo-500 to-blue-500' },
};

export default function LandingPage() {
  const { data: plansData, isLoading: isLoadingPlans } = useGetSubscriptionPlansQuery({});
  const { data: statsData, isLoading: isLoadingStats } = useGetPublicStatsQuery();
  const { data: testimonialsData = [], isLoading: isLoadingTestimonials } = useGetPublicTestimonialsQuery({ limit: 3 });
  
  // Get available plans from API - handle both array and object responses
  const plans = useMemo(() => {
    if (!plansData) return [];
    // Handle different response structures
    if (Array.isArray(plansData)) return plansData;
    
    // Check for nested data structures: data.data or data.plans
    const nestedData = (plansData as any)?.data;
    if (Array.isArray(nestedData)) return nestedData;
    if (Array.isArray(nestedData?.data)) return nestedData.data;
    if (Array.isArray(nestedData?.plans)) return nestedData.plans;
    
    // Fallback to direct plans property
    return (plansData as any)?.plans || [];
  }, [plansData]);
  
  const activePlans = useMemo(() => {
    return plans.filter((plan: any) => plan.isActive !== false).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [plans]);
  
  // Generate features from plans' enabledFeatureKeys
  const features = useMemo(() => {
    const featureKeysSet = new Set<string>();
    
    // Collect all unique feature keys from all active plans
    activePlans.forEach((plan: any) => {
      if (plan.enabledFeatureKeys && Array.isArray(plan.enabledFeatureKeys)) {
        plan.enabledFeatureKeys.forEach((key: string) => {
          if (featureMapping[key]) {
            featureKeysSet.add(key);
          }
        });
      }
    });
    
    // Convert to array and map to display features
    const uniqueFeatures = Array.from(featureKeysSet)
      .map(key => ({
        key,
        ...featureMapping[key]
      }))
      .filter(Boolean); // Remove any undefined entries
    
    // If no features from plans, return some default features
    if (uniqueFeatures.length === 0) {
      return [
        { key: 'dashboard', icon: ChartBarIcon, title: 'Real-time Dashboard', description: 'Get instant insights with powerful analytics', gradient: 'from-blue-500 to-cyan-500' },
        { key: 'order-management', icon: CreditCardIcon, title: 'Order Management', description: 'Handle all orders efficiently', gradient: 'from-orange-500 to-red-500' },
        { key: 'menu-management', icon: DevicePhoneMobileIcon, title: 'Menu Management', description: 'Create and manage your restaurant menu', gradient: 'from-purple-500 to-pink-500' },
        { key: 'inventory', icon: ChartBarIcon, title: 'Inventory Management', description: 'Track inventory levels and stock', gradient: 'from-blue-500 to-cyan-500' },
        { key: 'customer-management', icon: UserGroupIcon, title: 'Customer Management', description: 'Manage customer database', gradient: 'from-green-500 to-emerald-500' },
        { key: 'reports', icon: ChartBarIcon, title: 'Advanced Reports', description: 'Comprehensive reporting and analytics', gradient: 'from-blue-500 to-cyan-500' },
      ];
    }
    
    // Limit to 9 features for display
    return uniqueFeatures.slice(0, 9);
  }, [activePlans]);
  
  // Format testimonials from API - no fallback, only use real data
  const testimonials = useMemo(() => {
    if (!testimonialsData || testimonialsData.length === 0) {
      return [];
    }
    
    return testimonialsData.map((feedback: any) => {
      const user = feedback.userId || {};
      const company = feedback.companyId || {};
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      const name = feedback.isAnonymous 
        ? 'Anonymous' 
        : `${firstName} ${lastName}`.trim() || 'Customer';
      
      return {
        name,
        role: company.name ? `${company.name} Owner` : 'Restaurant Owner',
        image: feedback.isAnonymous 
          ? 'https://i.pravatar.cc/150?img=0' 
          : `https://i.pravatar.cc/150?img=${Math.abs(name.charCodeAt(0)) % 10}`,
        content: feedback.message || feedback.title || 'Great experience!',
        rating: feedback.rating || 5,
      };
    });
  }, [testimonialsData]);
  
  // Get active companies count for badge
  const activeCompaniesCount = useMemo(() => {
    if (!statsData || !statsData.activeCompanies) return 0;
    return statsData.activeCompanies;
  }, [statsData]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-black relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-300 dark:bg-primary-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-300 dark:bg-secondary-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-soft-light filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl z-50 border-b border-gray-200/50 dark:border-gray-800/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <SparklesIcon className="w-10 h-10 text-primary-600 dark:text-primary-400 group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-primary-400 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                Advanced POS
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                  Get Started
                </Button>
              </Link>
            </div>
            {/* Mobile menu */}
            <div className="md:hidden flex items-center space-x-2">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="bg-gradient-to-r from-primary-600 to-secondary-600">Start</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-22 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center relative z-10">
            {/* Badge */}
            {!isLoadingStats && activeCompaniesCount > 0 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-gradient-to-r from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30 border border-primary-200 dark:border-primary-800 animate-fade-in">
                <StarIcon className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                  Trusted by {activeCompaniesCount >= 1000 ? `${(activeCompaniesCount / 1000).toFixed(1)}K+` : `${activeCompaniesCount}+`} Restaurants
                </span>
              </div>
            )}

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-gray-900 dark:text-white mb-6 leading-tight">
              <span className="block mb-2">Modern POS System</span>
              <span className="block bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                for Smart Restaurants
              </span>
            </h1>
            <p className="text-xl md:text-2xl lg:text-3xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed font-light">
              Streamline your restaurant operations with our powerful, intuitive, and feature-rich point of sale system. 
              <span className="block mt-2 text-lg md:text-xl text-gray-500 dark:text-gray-400">
                Everything you need to run your restaurant efficiently, all in one place.
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/auth/register" className="group">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-2xl hover:shadow-primary-500/50 transition-all duration-300 transform hover:scale-105">
                  Start Free Trial
                  <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/login" className="group">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 py-6 border-2 hover:border-primary-500 dark:hover:border-primary-400 transition-all duration-300">
                  <PlayIcon className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
              <div className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 hover:border-primary-300 dark:hover:border-primary-700 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-transparent dark:from-primary-900/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mb-3">
                    {isLoadingStats ? (
                      <span className="inline-block w-20 h-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                    ) : statsData?.activeCompanies ? (
                      statsData.activeCompanies >= 1000
                        ? `${(statsData.activeCompanies / 1000).toFixed(1)}K+`
                        : `${statsData.activeCompanies}+`
                    ) : (
                      '0+'
                    )}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 font-medium text-lg">Active Restaurants</div>
                </div>
              </div>
              <div className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 hover:border-primary-300 dark:hover:border-primary-700 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary-50 to-transparent dark:from-secondary-900/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-secondary-600 to-primary-600 bg-clip-text text-transparent mb-3 flex items-center gap-2 justify-center">
                    {isLoadingStats ? (
                      <span className="inline-block w-20 h-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                    ) : statsData?.averageRating ? (
                      <>
                        {statsData.averageRating.toFixed(1)}
                        <StarIcon className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                      </>
                    ) : (
                      <>
                        4.9
                        <StarIcon className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                      </>
                    )}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 font-medium text-lg">Average Rating</div>
                </div>
              </div>
              <div className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 hover:border-primary-300 dark:hover:border-primary-700 hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-transparent dark:from-purple-900/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                    {isLoadingStats ? (
                      <span className="inline-block w-20 h-12 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                    ) : statsData?.totalCustomers ? (
                      statsData.totalCustomers >= 1000
                        ? `${(statsData.totalCustomers / 1000).toFixed(1)}K+`
                        : `${statsData.totalCustomers}+`
                    ) : (
                      '0+'
                    )}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300 font-medium text-lg">Happy Customers</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative pt-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 dark:opacity-10"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800">
              <SparklesIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">Powerful Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-6">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Everything You Need
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Powerful features to run your restaurant smoothly and efficiently
            </p>
          </div>

          {isLoadingPlans ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-lg animate-pulse"
                >
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-6"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : features.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No features available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {features.map((feature, index) => (
                <div
                  key={feature.key || index}
                  className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-200/50 dark:border-gray-700/50 hover:border-primary-300 dark:hover:border-primary-700 overflow-hidden"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-500`}></div>
                
                {/* Icon */}
                <div className={`relative w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-lg`}>
                  <feature.icon className="w-8 h-8 text-white" />
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity`}></div>
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
                
                {/* Decorative element */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            ))}
            </div>
          )}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative pt-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-200 dark:bg-primary-900/30 rounded-full filter blur-3xl opacity-20"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary-200 dark:bg-secondary-900/30 rounded-full filter blur-3xl opacity-20"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-secondary-100 dark:bg-secondary-900/30 border border-secondary-200 dark:border-secondary-800">
              <CreditCardIcon className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
              <span className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Flexible Plans</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-6">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Simple, Transparent Pricing
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Choose the perfect plan for your business. Start free, upgrade anytime.
            </p>
          </div>

          {isLoadingPlans ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : activePlans.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-600 dark:text-gray-400 mb-2">No pricing plans available at the moment.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {plans.length > 0 && activePlans.length === 0 && 'All plans are currently inactive.'}
                {plans.length === 0 && 'Please check back later or contact support.'}
              </p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${activePlans.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6 max-w-5xl mx-auto`}>
              {activePlans.map((plan: any, index: number) => {
                const isPopular = plan.isPopular || index === 1;
                
                // Use admin-managed featureList from backend (fully dynamic - no hardcoding)
                // Super admin can manage this via subscription plan management
                const featureList: string[] = plan.featureList && plan.featureList.length > 0 
                  ? plan.featureList 
                  : []; // Empty array if no features configured (super admin should configure via backend)
                
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl shadow-2xl p-10 transition-all duration-500 border-2 ${
                      isPopular
                        ? 'border-primary-400 bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 scale-105 hover:scale-110'
                        : 'border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl hover:shadow-2xl hover:-translate-y-2 hover:border-primary-300 dark:hover:border-primary-700'
                    } overflow-hidden group`}
                  >
                    {/* Background gradient for popular plan */}
                    {isPopular && (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-secondary-900/20 to-primary-900/20 opacity-50"></div>
                    )}
                    
                    {/* Popular badge */}
                    {isPopular && (
                      <div className="absolute -top-4 right-6 z-10">
                        <span className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                          <StarIcon className="w-3 h-3" />
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className={`text-2xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {(plan.displayName || plan.name).toUpperCase()}
                      </h3>
                      
                      {/* Feature count badge if using enabledFeatureKeys */}
                      {plan.enabledFeatureKeys && plan.enabledFeatureKeys.length > 0 && (
                        <div className="mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isPopular 
                              ? 'bg-white/20 text-white' 
                              : 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300'
                          }`}>
                            {plan.enabledFeatureKeys.length} Features Included
                          </span>
                        </div>
                      )}
                      
                      <div className="">
                        <div className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`}>
                          {plan.price === 0 ? (
                            <span>Free</span>
                          ) : (
                            <>
                              {plan.currency} {plan.price.toLocaleString()}
                              {plan.price > 0 && <span className="text-xl">/{plan.billingCycle}</span>}
                            </>
                          )}
                        </div>
                        {plan.trialPeriod && plan.trialPeriod > 0 && (
                          <div className={`text-sm font-semibold mt-2 ${
                            isPopular ? 'text-yellow-300' : 'text-primary-600 dark:text-primary-400'
                          }`}>
                            {plan.trialPeriod === 168 
                              ? '✓ 7 Days Free Trial' 
                              : `${Math.round(plan.trialPeriod / 24)} Days Free Trial`}
                          </div>
                        )}
                        {plan.price > 0 && (
                          <>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              *Per Branch
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              + Installation & Training Fees
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    

                    <div className="space-y-3">
                      {featureList.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <CheckCircleIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                            isPopular ? 'text-white' : 'text-green-500'
                          }`} />
                          <span className={`text-sm ${isPopular ? 'text-gray-200' : 'text-gray-600 dark:text-gray-300'}`}>
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className='space-y-1'>
                    <Link href="/auth/register" >
                      <button
                        className={`w-full py-3 rounded-lg font-semibold my-6 transition-all ${
                          isPopular
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-white text-gray-900 hover:bg-gray-100 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
                        }`}
                      >
                        Get Started
                      </button>
                    </Link>
                    </div>
                   
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-0 w-96 h-96 bg-yellow-200 dark:bg-yellow-900/20 rounded-full filter blur-3xl opacity-10"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-200 dark:bg-pink-900/20 rounded-full filter blur-3xl opacity-10"></div>
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
              <StarIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">Customer Reviews</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white mb-6">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Loved by Restaurant Owners
              </span>
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              See what our customers have to say about their experience
            </p>
          </div>

          {isLoadingTestimonials ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-8 rounded-2xl shadow-lg animate-pulse"
                >
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-24"></div>
                  <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full mr-4"></div>
                    <div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-32"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : testimonials.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-200/50 dark:border-gray-700/50 hover:border-primary-300 dark:hover:border-primary-700 overflow-hidden"
                >
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-transparent to-secondary-50/50 dark:from-primary-900/10 dark:to-secondary-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    {/* Quote icon */}
                    <div className="absolute -top-2 -left-2 text-6xl text-primary-200 dark:text-primary-900/30 font-serif opacity-50">"</div>
                    
                    {/* Rating stars */}
                    <div className="flex items-center mb-6 gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className="w-5 h-5 text-yellow-400 fill-yellow-400"
                        />
                      ))}
                    </div>
                    
                    {/* Testimonial content */}
                    <p className="text-gray-700 dark:text-gray-300 mb-8 italic text-lg leading-relaxed relative z-10">
                      "{testimonial.content}"
                    </p>
                    
                    {/* Author info */}
                    <div className="flex items-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="relative">
                        <img
                          src={testimonial.image}
                          alt={testimonial.name}
                          className="w-14 h-14 rounded-full ring-2 ring-primary-200 dark:ring-primary-800 group-hover:ring-primary-400 dark:group-hover:ring-primary-600 transition-all"
                        />
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-lg">
                          {testimonial.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {testimonial.role}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">No testimonials available yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-secondary-600 to-primary-600"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="bg-white/10 dark:bg-white/5 backdrop-blur-2xl rounded-3xl p-12 md:p-16 shadow-2xl border border-white/20">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
              <SparklesIcon className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">Join Us Today</span>
            </div>
            
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-6 leading-tight">
              Ready to Transform Your Restaurant?
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-2xl mx-auto">
              Join thousands of restaurants already using Advanced POS. Start your free trial today and experience the difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="group">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 py-6 bg-white text-primary-600 hover:bg-gray-100 shadow-2xl hover:shadow-white/50 transition-all duration-300 transform hover:scale-105">
                  Start Your Free Trial
                  <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            
            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                <span>7-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="w-5 h-5" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <SparklesIcon className="w-6 h-6 text-primary-400" />
                <span className="text-xl font-bold">Advanced POS</span>
              </div>
              <p className="text-gray-400">
                The most powerful restaurant management system
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help-center" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Advanced POS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
