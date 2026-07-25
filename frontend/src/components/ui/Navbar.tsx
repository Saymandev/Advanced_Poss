'use client';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useIndustry } from '@/contexts/IndustryContext';

interface NavbarProps {
  transparent?: boolean;
}

export function Navbar({ transparent = false }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { activeIndustry, setActiveIndustry } = useIndustry();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navbarClasses = cn(
    "fixed top-0 w-full z-50 transition-all duration-300 border-b",
    isScrolled 
      ? "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50 shadow-md py-2" 
      : transparent 
        ? "bg-white/10 dark:bg-gray-900/10 backdrop-blur-md border-white/10 py-3"
        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 py-2"
  );

  const textClasses = cn(
    "transition-colors",
    (isScrolled || !transparent)
      ? "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" 
      : "text-white hover:bg-white/10"
  );

  return (
    <nav className={navbarClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap md:flex-nowrap justify-between items-center py-2 md:py-0 md:h-14 gap-y-3">
          <Link href="/" className="flex items-center space-x-3 group cursor-pointer w-1/2 md:w-1/3">
            <div className="relative flex items-center">
              <img
                src="https://res.cloudinary.com/dy9yjhmex/image/upload/v1772008704/restogo-logo_yxebls.png"
                alt="Raha Pos Solutions logo"
                className="h-10 w-auto group-hover:scale-105 transition-transform"
              />
            </div>
          </Link>

          {/* Global Industry Switcher */}
          <div className="flex justify-center w-full md:w-1/3 order-last md:order-none">
            <div className={cn(
              "flex items-center rounded-full p-1 border transition-colors shadow-inner",
              (isScrolled || !transparent) ? "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700" : "bg-black/20 border-white/20 backdrop-blur-md"
            )}>
              <button
                onClick={() => setActiveIndustry('restaurant')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                  activeIndustry === 'restaurant'
                    ? (isScrolled || !transparent) ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "bg-white/90 text-primary-600 shadow-sm"
                    : (isScrolled || !transparent) ? "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100" : "text-white/70 hover:text-white"
                )}
              >
                🍽️ Restaurant
              </button>
              <button
                onClick={() => setActiveIndustry('retail')}
                className={cn(
                  "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                  activeIndustry === 'retail'
                    ? (isScrolled || !transparent) ? "bg-white dark:bg-gray-700 text-primary-600 shadow-sm" : "bg-white/90 text-primary-600 shadow-sm"
                    : (isScrolled || !transparent) ? "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100" : "text-white/70 hover:text-white"
                )}
              >
                🛍️ Retail
              </button>
            </div>
          </div>

          <div className="hidden md:flex items-center justify-end space-x-4 w-1/3">
            <Link href="/auth/login">
              <Button variant="ghost" className={textClasses}>
                Login
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button className="bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile menu - simplified for now */}
          <div className="md:hidden flex items-center justify-end space-x-2 w-1/2">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className={textClasses}>
                Login
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="bg-gradient-to-r from-primary-600 to-secondary-600">
                Join
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
