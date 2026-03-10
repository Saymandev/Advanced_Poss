'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { useGetSubscriptionPlansQuery } from '@/lib/api/endpoints/subscriptionsApi';
import { useGetPublicStatsQuery, useGetPublicTestimonialsQuery } from '@/lib/api/endpoints/systemFeedbackApi';
import { cn } from '@/lib/utils';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BellAlertIcon,
  BoltIcon,
  BuildingStorefrontIcon,
  CakeIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  HomeIcon,
  PlayIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  TruckIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
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
const REVERSION_THRESHOLD = 20;

// Helper to get hex color from tailwind class
const getHexColor = (twClass: string) => {
  const colors: Record<string, string> = {
    'blue-500': '#3b82f6',
    'cyan-500': '#06b6d4',
    'indigo-500': '#6366f1',
    'green-500': '#22c55e',
    'emerald-500': '#10b981',
    'orange-500': '#f97316',
    'red-500': '#ef4444',
    'purple-500': '#a855f7',
    'pink-500': '#ec4899',
    'rose-500': '#f43f5e',
    'teal-500': '#14b8a6',
    'yellow-500': '#eab308',
    'violet-500': '#8b5cf6',
    'sky-500': '#0ea5e9',
    'blue-600': '#2563eb',
    'indigo-600': '#4f46e5',
    'purple-600': '#9333ea',
  };
  const key = twClass ? twClass.replace('from-', '').replace('to-', '').replace('via-', '').trim() : '';
  return colors[key] || '#6366f1'; // Default indigo
};

export default function LandingPage() {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };
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
  
  // Hardcoded features for the landing page marketing
  const features = useMemo(() => {
    return [
      { 
        key: 'offline-sync', 
        icon: CloudArrowUpIcon, 
        title: 'Unbreakable Offline Sync', 
        description: 'Keep taking orders and printing receipts without internet. Raha automatically syncs your data the second you are back online.', 
        gradient: 'from-blue-500 to-cyan-500' 
      },
      { 
        key: 'hotel-management', 
        icon: GlobeAltIcon, 
        title: 'Hotel & Room Management', 
        description: 'Manage room bookings, guest check-ins, and seamlessly route restaurant or bar charges directly to the final room bill.', 
        gradient: 'from-indigo-500 to-blue-500' 
      },
      { 
        key: 'inventory', 
        icon: ChartBarIcon, 
        title: 'Inventory & Recipe Costing', 
        description: 'Track ingredients down to the exact gram. Stop food theft, monitor wastage, and see your true profit margins in real time.', 
        gradient: 'from-green-500 to-emerald-500' 
      },
      { 
        key: 'kds', 
        icon: BellAlertIcon, 
        title: 'Seamless Kitchen Sync (KDS)', 
        description: 'Fire orders instantly from the waiter\'s device straight to the kitchen. Eliminate lost paper tickets and speed up service.', 
        gradient: 'from-orange-500 to-red-500' 
      },
      { 
        key: 'multi-branch', 
        icon: UserGroupIcon, 
        title: 'Multi Branch & Franchise Management', 
        description: 'Control multiple restaurant or hotel locations from a single master dashboard. Compare branch performance instantly.', 
        gradient: 'from-purple-500 to-pink-500' 
      },
      { 
        key: 'delivery', 
        icon: DevicePhoneMobileIcon, 
        title: 'Delivery & Takeaway Hub', 
        description: 'Manage dine in, takeaway, and delivery orders effortlessly from a single, organized screen at the front counter.', 
        gradient: 'from-rose-500 to-pink-500' 
      },
      { 
        key: 'accounting', 
        icon: ChartBarIcon, 
        title: 'Accounting & Ledgers', 
        description: 'Ditch the messy spreadsheets. Track daily expenses, supplier payouts, and overall cash flow directly inside your dashboard.', 
        gradient: 'from-teal-500 to-emerald-500' 
      },
      { 
        key: 'marketing', 
        icon: SparklesIcon, 
        title: 'SMS & Email Marketing', 
        description: 'Turn first time visitors into regulars. Bring your best customers back with automated, targeted promotional campaigns.', 
        gradient: 'from-yellow-500 to-orange-500' 
      },
      { 
        key: 'staff', 
        icon: ShieldCheckIcon, 
        title: 'Staff & Shift Tracking', 
        description: 'Monitor employee attendance, manage daily shifts, and secure your entire system with strict role-based access limits.', 
        gradient: 'from-violet-500 to-purple-500' 
      },
    ];
  }, []);
  
  // Smart Data Reversion Logic
  const isRealDataReady = useMemo(() => {
    return (statsData?.activeCompanies || 0) >= REVERSION_THRESHOLD;
  }, [statsData]);

  // Hardcoded testimonials for local relevance
  const mockTestimonials = useMemo(() => {
    return [
      {
        name: 'Tanvir Hossain',
        role: 'Kabana Restaurant, Banani',
        image: 'https://i.pravatar.cc/150?img=11',
        content: 'Raha transformed how we handle our rush hours. The kitchen sync is flawless and we haven\'t lost an order since we switched.',
        rating: 5,
      },
      {
        name: 'Fatima Ahmed',
        role: 'Ahmed Bakery & Sweets, Dhanmondi',
        image: 'https://i.pravatar.cc/150?img=5',
        content: 'The inventory tracking is a life saver. I can see exactly where my ingredients are going and wastage has dropped significantly.',
        rating: 5,
      },
      {
        name: 'Ariful Islam',
        role: 'Blue Horizon Resort, Cox\'s Bazar',
        image: 'https://i.pravatar.cc/150?img=12',
        content: 'Managing room bookings and restaurant charges in one place is exactly what we needed. Our guests love the unified billing.',
        rating: 5,
      },
      {
        name: 'Mohammad Rahim',
        role: 'Rahims Food Court, Mirpur',
        image: 'https://i.pravatar.cc/150?img=13',
        content: 'The best thing about Raha is the reliability. Even during internet outages, our POS never stops working and syncs perfectly later.',
        rating: 5,
      },
      {
        name: 'Nasrin Sultana',
        role: 'Green Leaf Cafe, Sylhet',
        image: 'https://i.pravatar.cc/150?img=9',
        content: 'I love how I can monitor all my branches from one dashboard in Dhaka. It gives me complete control over my business growth.',
        rating: 5,
      },
      {
        name: 'Kamrul Hasan',
        role: 'The Grand Buffet, Chittagong',
        image: 'https://i.pravatar.cc/150?img=14',
        content: 'Raha\'s table management and waiter app helped us serve 30% more tables during weekends. Truly a smart investment.',
        rating: 5,
      },
    ];
  }, []);

  // Format real testimonials from API
  const realTestimonials = useMemo(() => {
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

  // Use real data if threshold met, else mock data
  const testimonials = useMemo(() => {
    return isRealDataReady && realTestimonials.length > 0 ? realTestimonials : mockTestimonials;
  }, [isRealDataReady, realTestimonials, mockTestimonials]);

  const [testimonialIndex, setTestimonialIndex] = useState(0);
  const visibleTestimonials = useMemo(() => {
    // Show 3 at once, circular
    const result = [];
    for (let i = 0; i < 3; i++) {
        result.push(testimonials[(testimonialIndex + i) % testimonials.length]);
    }
    return result;
  }, [testimonialIndex, testimonials]);

  const nextTestimonial = () => setTestimonialIndex((prev) => (prev + 1) % testimonials.length);
  const prevTestimonial = () => setTestimonialIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  
  // Get active companies count for badge
  const activeCompaniesCount = useMemo(() => {
    if (isRealDataReady) return statsData?.activeCompanies || 0;
    return 30; // Marketing value
  }, [isRealDataReady, statsData]);
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
              <span className="block mb-2 sm:mb-4 text-3xl sm:text-4xl md:text-5xl opacity-90 font-medium tracking-tight animate-fade-in">Built for Every Type of</span>
              <span className="block leading-[1.1]">
                <span className="inline-block bg-gradient-to-r from-yellow-200 via-orange-300 to-yellow-200 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient animate-reveal-up animate-title-glow px-1" style={{ animationDelay: '200ms' }}>
                  Restaurant
                </span>
                <span className="inline-block mx-2 sm:mx-3 text-white/80 font-light italic text-2xl sm:text-3xl md:text-4xl lg:text-5xl lg:align-middle animate-ampersand animate-fade-in" style={{ animationDelay: '400ms' }}>&</span>
                <span className="inline-block bg-gradient-to-r from-orange-300 via-yellow-200 to-orange-300 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient animate-reveal-up animate-title-glow px-1" style={{ animationDelay: '600ms' }}>
                  Hospitality
                </span>
                <span className="block mt-1 sm:mt-2 text-4xl sm:text-5xl md:text-6xl lg:text-7xl animate-fade-in" style={{ animationDelay: '800ms' }}>Business</span>
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-white/95 mb-8 sm:mb-12 max-w-4xl mx-auto leading-relaxed font-light drop-shadow-lg px-4">
              Whether you run a busy corner cafe or a multi room resort, Raha adapts to your workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 px-4">
              <Link href="/contact" className="group w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-2xl hover:shadow-primary-500/50 transition-all duration-300 transform hover:scale-105">
                  Book A Meeting
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 md:mt-24 px-4">
              <div className="group relative bg-white/15 dark:bg-white/5 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 border border-white/30 hover:border-white/50 hover:-translate-y-1 sm:hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent mb-2 sm:mb-3">
                    {isRealDataReady ? statsData?.activeCompanies : '30+'}
                  </div>
                  <div className="text-white/80 font-medium text-sm sm:text-base md:text-lg">Active Businesses</div>
                </div>
              </div>
              <div className="group relative bg-white/15 dark:bg-white/5 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 border border-white/30 hover:border-white/50 hover:-translate-y-1 sm:hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-secondary-500/10 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-secondary-400 to-primary-400 bg-clip-text text-transparent mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2 justify-center">
                    {isRealDataReady ? (statsData?.averageRating?.toFixed(1) || '5.0') : '5.0'}
                    <StarIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-500 fill-yellow-500" />
                  </div>
                  <div className="text-white/80 font-medium text-sm sm:text-base md:text-lg">Average Rating</div>
                </div>
              </div>
              <div className="group relative bg-white/15 dark:bg-white/5 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl hover:shadow-3xl transition-all duration-300 border border-white/30 hover:border-white/50 hover:-translate-y-1 sm:hover:-translate-y-2">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2 sm:mb-3">
                    {isRealDataReady ? (statsData?.totalCustomers || '0') : '29'}
                  </div>
                  <div className="text-white/80 font-medium text-sm sm:text-base md:text-lg">Happy Clients</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative pt-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[500px] h-[500px] bg-primary-200/20 dark:bg-primary-900/10 rounded-full blur-[120px] pointer-events-none animate-slow-drift"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-secondary-200/20 dark:bg-secondary-900/10 rounded-full blur-[120px] pointer-events-none animate-slow-drift" style={{ animationDelay: '-5s' }}></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 animate-fade-in">
              <SparklesIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-semibold text-primary-700 dark:text-primary-300 uppercase tracking-wider">Powerful Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Everything You Need
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Powerful tools designed to run your hospitality business smoothly, efficiently, and profitably.
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
                  className="group relative"
                  onMouseMove={handleMouseMove}
                >
                  <div className="glass-card-premium p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden h-full">
                    <div className="spotlight-overlay"></div>
                    <svg className="border-trace-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id={`gradient-${feature.key || index}`} x1="0%" y1="100%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor={getHexColor(feature.gradient.split(' ')[0])} />
                          <stop offset="100%" stopColor={getHexColor(feature.gradient.split(' ')[1] || feature.gradient.split(' ')[2] || 'blue-500')} />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M 6,100 L 94,100 Q 100,100 100,94 L 100,6 Q 100,0 94,0 L 6,0 Q 0,0 0,6 L 0,94 Q 0,100 6,100 Z"
                        pathLength="1000"
                        className="border-trace-path"
                        style={{ 
                          stroke: `url(#gradient-${feature.key || index})`,
                          animationDelay: `${index * -1.2}s`
                        } as any}
                      />
                    </svg>

                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-500`}></div>
                    
                    {/* Icon */}
                    <motion.div 
                      whileHover={{ scale: 1.15, rotate: 8, y: -5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 12 }}
                      className={`relative w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-xl z-20`}
                    >
                      <feature.icon className="w-8 h-8 text-white animate-soft-float" />
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition-opacity`}></div>
                    </motion.div>
                    
                    {/* Content */}
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm md:text-base">
                      {feature.description}
                    </p>
                    
                    {/* Decorative element */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </div>
            ))}
            </div>
          )}
        </div>
      </section>

      {/* Built For Your Business Section */}
      <section id="who-we-serve" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900/50 overflow-hidden">
        {/* Background blobs for depth */}
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-200/20 dark:bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-200/20 dark:bg-purple-900/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 animate-fade-in">
              <UserGroupIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Who We Serve</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Built For Your Business
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Tailored POS solutions optimized for the unique workflows of every hospitality sector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Restaurants & Fine Dining',
                description: 'Master your table turnover, recipe costing, and kitchen communication.',
                icon: BuildingStorefrontIcon,
                gradient: 'from-orange-500 to-red-500'
              },
              {
                title: 'Cafes, Bakeries & Juice Bars',
                description: 'Lightning-fast checkouts, custom order modifiers and scale integrations.',
                icon: CakeIcon,
                gradient: 'from-yellow-500 to-orange-500'
              },
              {
                title: 'Hotels, Resorts & Guest Houses',
                description: 'Unified room bookings, seamless check ins and connected room service billing.',
                icon: HomeIcon,
                gradient: 'from-blue-500 to-indigo-500'
              },
              {
                title: 'Food Trucks & Cloud Kitchens',
                description: 'Maximize your delivery integrations and rely on offline sync on the move.',
                icon: TruckIcon,
                gradient: 'from-emerald-500 to-teal-500'
              },
              {
                title: 'Community Centers & Banquet Halls',
                description: 'Complete venue reservation, bulk catering and large scale event ledgers.',
                icon: AcademicCapIcon,
                gradient: 'from-purple-500 to-pink-500',
                isComingSoon: true
              }
            ].map((item, index) => (
              <div
                key={index}
                className="group relative"
                onMouseMove={handleMouseMove}
              >
                <div className="glass-card-premium p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 overflow-hidden h-full">
                  <div className="spotlight-overlay"></div>
                  <svg className="border-trace-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={`gradient-serve-${index}`} x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={getHexColor(item.gradient.split(' ')[0])} />
                        <stop offset="100%" stopColor={getHexColor(item.gradient.split(' ')[1])} />
                      </linearGradient>
                    </defs>
                    <path 
                      d="M 6,100 L 94,100 Q 100,100 100,94 L 100,6 Q 100,0 94,0 L 6,0 Q 0,0 0,6 L 0,94 Q 0,100 6,100 Z"
                      pathLength="1000"
                      className="border-trace-path"
                      style={{ 
                        stroke: `url(#gradient-serve-${index})`,
                        animationDelay: `${index * -1.5}s`
                      } as any}
                    />
                  </svg>

                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5, y: -4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 12 }}
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-6 shadow-lg z-20`}
                  >
                    <item.icon className="w-7 h-7 text-white" />
                  </motion.div>
                  
                  {item.isComingSoon && (
                    <div className="absolute top-4 right-4 z-10">
                      <span className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-indigo-200 dark:border-indigo-800">
                        Coming Soon
                      </span>
                    </div>
                  )}

                  <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                    {item.description}
                  </p>

                  {/* Bottom accent gradient */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
                </div>
              </div>
            ))}
          </div>
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
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 transition-all duration-500">
                {visibleTestimonials.map((testimonial, index) => (
                  <div
                    key={`${testimonial.name}-${index}`}
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

              {/* Slider Controls */}
              <div className="flex justify-center mt-12 gap-4">
                <button
                  onClick={prevTestimonial}
                  className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
                  aria-label="Previous testimonials"
                >
                  <ChevronLeftIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
                <div className="flex items-center gap-2">
                   {testimonials.map((_, i) => (
                     <div 
                      key={i}
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        i === testimonialIndex ? "w-8 bg-primary-500" : "w-2 bg-gray-300 dark:bg-gray-700"
                      )}
                     />
                   ))}
                </div>
                <button
                  onClick={nextTestimonial}
                  className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700"
                  aria-label="Next testimonials"
                >
                  <ChevronRightIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
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
              Ready to modernize your operations?
            </h2>
            <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              Join the growing community of smart hospitality owners upgrading to Raha. Book your free personalized demo today to see how we can help you scale your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="group">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto text-lg px-8 py-6 bg-white text-primary-600 hover:bg-gray-100 shadow-2xl hover:shadow-white/50 transition-all duration-300 transform hover:scale-105">
                  Book Your Free Demo
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
            <p>&copy; {new Date().getFullYear()} Raha Pos Solutions. All rights reserved.</p>
            <p className="mt-2 text-sm">A product of <a href="https://infotigo.com/" target="_blank" rel="noopener noreferrer" className="text-primary-400 font-semibold hover:text-primary-300 transition-colors">Infotigo IT</a></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
