'use client';

/* eslint-disable @next/next/no-img-element */

import { Button } from '@/components/ui/Button';
import { useGetSubscriptionPlansQuery } from '@/lib/api/endpoints/subscriptionsApi';
import {
  ArrowRightIcon,
  BellAlertIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const features = [
  {
    icon: ChartBarIcon,
    title: 'Real-time Analytics',
    description: 'Get instant insights with powerful analytics and beautiful charts'
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Mobile First',
    description: 'Fully responsive design works perfectly on all devices'
  },
  {
    icon: UserGroupIcon,
    title: 'Team Management',
    description: 'Manage staff with role-based access control'
  },
  {
    icon: CreditCardIcon,
    title: 'Payment Processing',
    description: 'Accept all major payment methods securely'
  },
  {
    icon: BellAlertIcon,
    title: 'Smart Notifications',
    description: 'Stay updated with real-time alerts and notifications'
  },
  {
    icon: CloudArrowUpIcon,
    title: 'Cloud Backup',
    description: 'Your data is automatically backed up and secure'
  },
];

// Legacy pricing plans removed - now fetched from API

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Restaurant Owner',
    image: 'https://i.pravatar.cc/150?img=1',
    content: 'This POS system transformed our restaurant operations. The interface is intuitive and our staff loves it!',
    rating: 5,
  },
  {
    name: 'Michael Chen',
    role: 'Café Manager',
    image: 'https://i.pravatar.cc/150?img=2',
    content: 'Real-time analytics helped us increase revenue by 30%. Best investment we made this year.',
    rating: 5,
  },
  {
    name: 'Emily Rodriguez',
    role: 'Chain Director',
    image: 'https://i.pravatar.cc/150?img=3',
    content: 'Managing multiple locations is now effortless. The reporting features are exceptional.',
    rating: 5,
  },
];

export default function LandingPage() {
  const { data: plansData, isLoading: isLoadingPlans, error } = useGetSubscriptionPlansQuery({});
  
  // Debug logging
  useEffect(() => {
    if (plansData) {
      console.log('📦 Plans Data:', { 
        isArray: Array.isArray(plansData), 
        type: typeof plansData,
        data: plansData 
      });
    }
    if (error) {
      console.error('❌ Plans API Error:', error);
    }
  }, [plansData, error]);
  
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
  
  // Debug logging for plans processing
  useEffect(() => {
    if (plansData !== undefined) {
      console.log('🔍 Plans Processing:', { 
        plansCount: plans.length, 
        activePlansCount: activePlans.length,
        plansData,
        plans: plans.map((p: any) => ({ name: p.name, isActive: p.isActive, displayName: p.displayName }))
      });
    }
  }, [plans, activePlans, plansData]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg z-50 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
                Advanced POS
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-gray-700 dark:text-gray-300">Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700">
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
                <Button size="sm">Start</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white mb-6 animate-fade-in">
              Modern POS System
              <span className="block bg-gradient-to-r from-primary-600 via-secondary-600 to-primary-600 bg-clip-text text-transparent">
                for Smart Restaurants
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto animate-slide-in">
              Streamline your restaurant operations with our powerful, intuitive, and feature-rich point of sale system
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
              <Link href="/auth/register">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                  Watch Demo
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">10K+</div>
                <div className="text-gray-600 dark:text-gray-300">Active Restaurants</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">99.9%</div>
                <div className="text-gray-600 dark:text-gray-300">Uptime Guarantee</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-shadow">
                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">24/7</div>
                <div className="text-gray-600 dark:text-gray-300">Customer Support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Powerful features to run your restaurant smoothly
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Choose the perfect plan for your business
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
                
                // Use admin-managed featureList if available, otherwise generate from features
                let featureList: string[] = [];
                
                if (plan.featureList && plan.featureList.length > 0) {
                  // Use backend-managed feature list
                  featureList = plan.featureList;
                } else {
                  // Fallback: Generate from plan.features (for backward compatibility)
                  if (plan.features?.pos) featureList.push('Unlimited orders & access accounts');
                  if (plan.features?.accounting) featureList.push('Realtime restaurant sales status');
                  if (plan.features?.inventory) featureList.push('Stock, Inventory & Accounting');
                  if (plan.features?.crm) featureList.push('Customer Loyalty & Discount');
                  featureList.push('Daily SMS & Email sales report');
                  if (plan.features?.multiBranch) featureList.push('Kitchen & Customer Display System');
                  featureList.push('Mobile, Tablet and any OS friendly');
                  featureList.push('Cloud data backup & security');
                  if (plan.features?.aiInsights) featureList.push('AI Insight and analytics');
                  if (index === 1 && plan.features?.multiBranch) {
                    featureList.push('Online Ordering');
                    featureList.push('Table Touch QR Ordering');
                    featureList.push('Customer Feedback System');
                    featureList.push('Target SMS marketing');
                    featureList.push('Priority 24/7 Call & Agent Support');
                  }
                }
                
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-xl shadow-xl p-8 transition-all border-2 ${
                      isPopular
                        ? 'border-primary-400 bg-gray-800 dark:bg-gray-800 scale-105'
                        : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-2xl'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 right-4">
                        <span className="bg-primary-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-6">
                      <h3 className={`text-2xl font-bold mb-2 ${isPopular ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {(plan.displayName || plan.name).toUpperCase()}
                      </h3>
                      
                      <div className="">
                        <div className={`text-4xl font-bold ${isPopular ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`}>
                          {plan.currency} {plan.price.toLocaleString()}
                          {plan.price > 0 && <span className="text-xl">/{plan.billingCycle}</span>}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          *Per Branch
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          + Installation & Training Fees
                        </div>
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
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Loved by Restaurant Owners
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              See what our customers have to say
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6 italic">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-3xl p-12 shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Ready to Transform Your Restaurant?
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Join thousands of restaurants already using Advanced POS
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto bg-white text-primary-600 hover:bg-gray-100">
                  Start Your Free Trial
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Button>
              </Link>
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
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
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
