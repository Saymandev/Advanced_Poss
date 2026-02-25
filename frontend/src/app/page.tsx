'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { useGetSubscriptionPlansQuery } from '@/lib/api/endpoints/subscriptionsApi';
import { useGetPublicStatsQuery, useGetPublicTestimonialsQuery } from '@/lib/api/endpoints/systemFeedbackApi';
import { cn } from '@/lib/utils';
import {
  ArrowRightIcon,
  BellAlertIcon,
  BoltIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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

// Hero Image Slider Component
const HeroImageSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  // Gorgeous restaurant images - using high-quality Unsplash images
  const images = [
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1920&q=80', // Hotel
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1920&q=80', // Cafe
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=1920&q=80', // Bakery
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80', // Restaurant
    'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1920&q=80', // Bar
    'https://images.unsplash.com/photo-1565123409695-7b5ef63a2efb?w=1920&q=80', // Food Truck
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000); // Change image every 5 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  return (
    <div 
      className="absolute inset-0 z-0 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Image Slides */}
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Enhanced gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80 z-10"></div>
            <img
              src={image}
              alt={`Restaurant ${index + 1}`}
              className="w-full h-full object-cover scale-105 transition-transform duration-1000"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows - Hidden on mobile, visible on tablet+ */}
      <button
        onClick={goToPrevious}
        className="hidden sm:flex absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 bg-white/25 hover:bg-white/40 backdrop-blur-md rounded-full p-2 md:p-3 transition-all duration-300 hover:scale-110 shadow-lg"
        aria-label="Previous image"
      >
        <ChevronLeftIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
      </button>
      <button
        onClick={goToNext}
        className="hidden sm:flex absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 bg-white/25 hover:bg-white/40 backdrop-blur-md rounded-full p-2 md:p-3 transition-all duration-300 hover:scale-110 shadow-lg"
        aria-label="Next image"
      >
        <ChevronRightIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
      </button>

      {/* Dots Indicator - Responsive positioning */}
      <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-1.5 md:h-2 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-6 md:w-8 bg-white shadow-lg'
                : 'w-1.5 md:w-2 bg-white/60 hover:bg-white/80'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-black relative overflow-hidden">

      {/* Navigation */}
      <nav 
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300 border-b",
          isScrolled 
            ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50 shadow-md py-2" 
            : "bg-white/10 dark:bg-gray-900/10 backdrop-blur-md border-white/10 py-3"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative flex items-center">
                <img
                  src="https://res.cloudinary.com/dy9yjhmex/image/upload/v1772008704/restogo-logo_yxebls.png"
                  alt="Raha Pos Solutions logo"
                  className="h-10 w-auto"
                />
              </div>
              
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className={cn(
                  "transition-colors",
                  isScrolled 
                    ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" 
                    : "text-white hover:bg-white/10"
                )}>
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
                <Button variant="ghost" size="sm" className={cn(
                  isScrolled ? "text-gray-700 dark:text-gray-300" : "text-white"
                )}>
                  Login
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="bg-gradient-to-r from-primary-600 to-secondary-600">Start</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-24 pb-16 sm:pb-22 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-[85vh] sm:min-h-[90vh] flex items-center">
        {/* Image Slider Background */}
        <HeroImageSlider />
        
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="text-center">
            {/* Badge */}
            {!isLoadingStats && activeCompaniesCount > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-4 sm:py-1.5 mb-4 sm:mb-6 rounded-full bg-white/25 backdrop-blur-md border border-white/40 animate-fade-in shadow-xl">
                <StarIcon className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-300" />
                <span className="text-xs sm:text-sm font-semibold text-white">
                  Trusted by {activeCompaniesCount >= 1000 ? `${(activeCompaniesCount / 1000).toFixed(1)}K+` : `${activeCompaniesCount}+`} Restaurants
                </span>
              </div>
            )}

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold text-white mb-4 sm:mb-6 leading-tight drop-shadow-2xl px-2">
              <span className="block mb-1 sm:mb-2">Modern POS System</span>
              <span className="block bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient drop-shadow-lg">
                for Smart Restaurants
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-white/95 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed font-light drop-shadow-lg px-4">
              Streamline your restaurant operations with our powerful, intuitive, and feature-rich point of sale system. 
              <span className="block mt-2 text-sm sm:text-base md:text-lg lg:text-xl text-white/85">
                Everything you need to run your restaurant efficiently, all in one place.
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 px-4">
              <Link href="/auth/register" className="group w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-2xl hover:shadow-primary-500/50 transition-all duration-300 transform hover:scale-105">
                  Start Free Trial
                  <ArrowRightIcon className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/login" className="group w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 border-2 border-white/30 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white hover:border-white/50 transition-all duration-300">
                  <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  Watch Demo
                </Button>
              </Link>
            </div>

            {/* Stats - Responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 md:mt-24 px-4">
              <div className="group relative bg-white/15 dark:bg-white/5 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 border border-white/30 hover:border-white/50 hover:-translate-y-1 sm:hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent mb-2 sm:mb-3">
                    {isLoadingStats ? (
                      <span className="inline-block w-16 sm:w-20 h-8 sm:h-12 bg-gray-200 animate-pulse rounded"></span>
                    ) : statsData?.activeCompanies ? (
                      statsData.activeCompanies >= 1000
                        ? `${(statsData.activeCompanies / 1000).toFixed(1)}K+`
                        : `${statsData.activeCompanies}+`
                    ) : (
                      '0+'
                    )}
                  </div>
                  <div className="text-white/80 font-medium text-sm sm:text-base md:text-lg">Active Restaurants</div>
                </div>
              </div>
              <div className="group relative bg-white/15 dark:bg-white/5 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 border border-white/30 hover:border-white/50 hover:-translate-y-1 sm:hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary-500/10 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-secondary-400 to-primary-400 bg-clip-text text-transparent mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2 justify-center">
                    {isLoadingStats ? (
                      <span className="inline-block w-16 sm:w-20 h-8 sm:h-12 bg-gray-200 animate-pulse rounded"></span>
                    ) : statsData?.averageRating ? (
                      <>
                        {statsData.averageRating.toFixed(1)}
                        <StarIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-500 fill-yellow-500" />
                      </>
                    ) : (
                      <>
                        4.9
                        <StarIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-500 fill-yellow-500" />
                      </>
                    )}
                  </div>
                  <div className="text-white/80 font-medium text-sm sm:text-base md:text-lg">Average Rating</div>
                </div>
              </div>
              <div className="group relative bg-white/15 dark:bg-white/5 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 border border-white/30 hover:border-white/50 hover:-translate-y-1 sm:hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2 sm:mb-3">
                    {isLoadingStats ? (
                      <span className="inline-block w-16 sm:w-20 h-8 sm:h-12 bg-gray-200 animate-pulse rounded"></span>
                    ) : statsData?.totalCustomers ? (
                      statsData.totalCustomers >= 1000
                        ? `${(statsData.totalCustomers / 1000).toFixed(1)}K+`
                        : `${statsData.totalCustomers}+`
                    ) : (
                      '0+'
                    )}
                  </div>
                  <div className="text-white/80 font-medium text-sm sm:text-base md:text-lg">Happy Customers</div>
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
      <section id="pricing" className="relative pt-24 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
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
            <div className={`grid grid-cols-1 ${activePlans.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'} ${activePlans.length >= 2 ? 'lg:grid-cols-3' : ''} gap-6 max-w-7xl mx-auto items-start`}>
              {activePlans.map((plan: any, index: number) => {
                const isPopular = plan.isPopular || index === 1;
                
                // Use featureNames from backend (mapped from enabledFeatureKeys selected in super admin)
                // This shows the actual feature names like "Dashboard", "Reports", "Staff Management"
                const featureList: string[] = plan.featureNames && plan.featureNames.length > 0
                  ? plan.featureNames
                  : (plan.featureList && plan.featureList.length > 0 ? plan.featureList : []);
                
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 transition-all duration-300 border-2 ${
                      isPopular
                        ? 'border-primary-400 bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 scale-105'
                        : 'border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl hover:shadow-xl hover:border-primary-300 dark:hover:border-primary-700'
                    } group flex flex-col min-h-0`}
                  >
                    {/* Background gradient for popular plan */}
                    {isPopular && (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-secondary-900/20 to-primary-900/20 opacity-50 pointer-events-none rounded-3xl"></div>
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

                    

                    <div className="space-y-3 mb-4 relative z-10">
                      {featureList.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                          {featureList.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <CheckCircleIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                                isPopular ? 'text-white' : 'text-green-500'
                              }`} />
                              <span className={`text-sm ${isPopular ? 'text-gray-200' : 'text-gray-600 dark:text-gray-300'}`}>
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`text-sm italic ${isPopular ? 'text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                          No features configured
                        </div>
                      )}
                    </div>

                    {/* Plan Limits */}
                    {plan.limits && (
                      <div className={`relative z-10 space-y-3 pt-4 mt-2 border-t ${isPopular ? 'border-gray-700' : 'border-gray-200 dark:border-gray-700'} mb-8`}>
                        <h4 className={`font-semibold text-sm mb-3 ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                          Plan Limits
                        </h4>
                        
                        {/* Resource Limits */}
                        <div className="space-y-2">
                          {plan.limits.maxTables !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Max Tables:</span>
                              <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {plan.limits.maxTables === -1 ? 'Unlimited' : plan.limits.maxTables}
                              </span>
                            </div>
                          )}
                          {plan.limits.maxBranches !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Max Branches:</span>
                              <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {plan.limits.maxBranches === -1 ? 'Unlimited' : plan.limits.maxBranches}
                              </span>
                            </div>
                          )}
                          {plan.limits.maxMenuItems !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Max Menu Items:</span>
                              <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {plan.limits.maxMenuItems === -1 ? 'Unlimited' : plan.limits.maxMenuItems}
                              </span>
                            </div>
                          )}
                          {plan.limits.maxUsers !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Max Users:</span>
                              <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {plan.limits.maxUsers === -1 ? 'Unlimited' : plan.limits.maxUsers}
                              </span>
                            </div>
                          )}
                          {plan.limits.maxCustomers !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Max Customers:</span>
                              <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {plan.limits.maxCustomers === -1 ? 'Unlimited' : plan.limits.maxCustomers}
                              </span>
                            </div>
                          )}
                          {plan.limits.storageGB !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Storage:</span>
                              <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                {plan.limits.storageGB === -1 || plan.limits.storageGB === 0 ? 'Unlimited' : `${plan.limits.storageGB} GB`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Public Ordering Limits */}
                        {(plan.limits.publicOrderingEnabled !== undefined || plan.limits.maxPublicBranches !== undefined) && (
                          <div className="space-y-2 pt-2 border-t border-gray-600/30 dark:border-gray-600/30">
                            <h5 className={`font-medium text-xs mb-1 ${isPopular ? 'text-gray-300' : 'text-gray-700 dark:text-gray-400'}`}>
                              Public Ordering Limits
                            </h5>
                            {plan.limits.publicOrderingEnabled !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Enable Public Ordering:</span>
                                <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                  {plan.limits.publicOrderingEnabled ? 'Yes' : 'No'}
                                </span>
                              </div>
                            )}
                            {plan.limits.maxPublicBranches !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Max Public Branches:</span>
                                <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                  {plan.limits.maxPublicBranches === -1 ? 'Unlimited' : plan.limits.maxPublicBranches}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Review System Limits */}
                        {(plan.limits.reviewsEnabled !== undefined || plan.limits.reviewModerationRequired !== undefined || plan.limits.maxReviewsPerMonth !== undefined) && (
                          <div className="space-y-2 pt-2 border-t border-gray-600/30 dark:border-gray-600/30">
                            <h5 className={`font-medium text-xs mb-1 ${isPopular ? 'text-gray-300' : 'text-gray-700 dark:text-gray-400'}`}>
                              Review System Limits
                            </h5>
                            {plan.limits.reviewsEnabled !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Enable Reviews:</span>
                                <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                  {plan.limits.reviewsEnabled ? 'Yes' : 'No'}
                                </span>
                              </div>
                            )}
                            {plan.limits.reviewModerationRequired !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Review Moderation:</span>
                                <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                  {plan.limits.reviewModerationRequired ? 'Required' : 'Not Required'}
                                </span>
                              </div>
                            )}
                            {plan.limits.maxReviewsPerMonth !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Max Reviews Per Month:</span>
                                <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                  {plan.limits.maxReviewsPerMonth === -1 ? 'Unlimited' : plan.limits.maxReviewsPerMonth}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Additional Features */}
                        {(plan.limits.customDomainEnabled !== undefined || plan.limits.whitelabelEnabled !== undefined || plan.limits.prioritySupportEnabled !== undefined) && (
                          <div className="space-y-2 pt-2 border-t border-gray-600/30 dark:border-gray-600/30">
                            {plan.limits.customDomainEnabled !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Custom Domain Enabled:</span>
                                <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                  {plan.limits.customDomainEnabled ? 'Yes' : 'No'}
                                </span>
                              </div>
                            )}
                            {plan.limits.whitelabelEnabled !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Whitelabel Enabled:</span>
                                <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                  {plan.limits.whitelabelEnabled ? 'Yes' : 'No'}
                                </span>
                              </div>
                            )}
                            {plan.limits.prioritySupportEnabled !== undefined && (
                              <div className="flex justify-between text-xs">
                                <span className={isPopular ? 'text-gray-300' : 'text-gray-600 dark:text-gray-400'}>Priority Support:</span>
                                <span className={`font-medium ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                  {plan.limits.prioritySupportEnabled ? 'Yes' : 'No'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className='mt-auto pt-6 pb-2 relative z-10'>
                      <Link href="/auth/register" >
                        <button
                          className={`w-full py-3 rounded-lg font-semibold transition-all relative z-10 ${
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
              
              {/* Custom Plan Card */}
              <div className="relative rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 transition-all duration-500 border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 backdrop-blur-xl hover:shadow-2xl hover:-translate-y-2 hover:border-primary-300 dark:hover:border-primary-700 group flex flex-col items-center justify-center min-h-[500px]">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-6">
                    <SparklesIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                    Custom Plan
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-sm">
                    Need a tailored solution? Let's create a custom plan that fits your unique business requirements.
                  </p>
                  <Link href="/contact">
                    <button
                      className="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold transition-all bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Contact Us
                    </button>
                  </Link>
                </div>
              </div>
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
              Join thousands of restaurants already using Raha Pos Solutions. Start your free trial today and experience the difference.
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
                <img
                  src="https://res.cloudinary.com/dy9yjhmex/image/upload/v1772008704/restogo-logo_yxebls.png"
                  alt="Raha Pos Solutions logo"
                  className=" h-10 w-auto"
                />
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
            <p>&copy; {
               new Date().getFullYear()
              } Raha Pos Solutions. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
