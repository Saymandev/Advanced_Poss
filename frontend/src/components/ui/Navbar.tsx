'use client';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface NavbarProps {
  transparent?: boolean;
}

export function Navbar({ transparent = false }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

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
        <div className="flex justify-between items-center h-14">
          <Link href="/" className="flex items-center space-x-3 group cursor-pointer">
            <div className="relative flex items-center">
              <img
                src="https://res.cloudinary.com/dy9yjhmex/image/upload/v1772008704/restogo-logo_yxebls.png"
                alt="Raha Pos Solutions logo"
                className="h-10 w-auto group-hover:scale-105 transition-transform"
              />
            </div>
          </Link>

          <div className="hidden md:flex items-center space-x-4">
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
          <div className="md:hidden flex items-center space-x-2">
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
