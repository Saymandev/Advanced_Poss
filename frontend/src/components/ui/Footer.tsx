'use client';

import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 dark:bg-black text-white py-16 px-4 sm:px-6 lg:px-8 mt-12 overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 -tr-y-1/2 tr-x-1/2 w-96 h-96 bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 tr-y-1/2 -tr-x-1/2 w-96 h-96 bg-secondary-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center space-x-2 group">
              <img
                src="https://res.cloudinary.com/dy9yjhmex/image/upload/v1772008704/restogo-logo_yxebls.png"
                alt="Raha Pos Solutions logo"
                className="h-10 w-auto group-hover:scale-105 transition-transform"
              />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Built for the food and hospitality industries, Raha Pos Solutions provides operational continuity with advanced offline sync and cloud-based business management.
            </p>
            
          </div>

          {/* Support Info's */}
          <div>
            <h4 className="text-lg font-bold mb-6 bg-gradient-to-r from-primary-400 to-primary-200 bg-clip-text text-transparent">
              Support Info's
            </h4>
            <ul className="space-y-4 text-gray-400">
              <li>
                <Link href="/help-center" className="hover:text-primary-400 hover:translate-x-1 transition-all inline-block">
                  Help Center & FAQ
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-primary-400 hover:translate-x-1 transition-all inline-block">
                  Pricing Details
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-primary-400 hover:translate-x-1 transition-all inline-block">
                  Raha Features
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-primary-400 hover:translate-x-1 transition-all inline-block">
                  Security Details
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-lg font-bold mb-6 bg-gradient-to-r from-secondary-400 to-secondary-200 bg-clip-text text-transparent">
              Company
            </h4>
            <ul className="space-y-4 text-gray-400">
              <li>
                <Link href="/contact" className="hover:text-secondary-400 hover:translate-x-1 transition-all inline-block">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-secondary-400 hover:translate-x-1 transition-all inline-block">
                  About US
                </Link>
              </li>
              <li>
                <Link href="/#testimonials" className="hover:text-secondary-400 hover:translate-x-1 transition-all inline-block">
                  Testimonials
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-secondary-400 hover:translate-x-1 transition-all inline-block">
                  Blogs
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Policies */}
          <div>
            <h4 className="text-lg font-bold mb-6 bg-gradient-to-r from-green-400 to-green-200 bg-clip-text text-transparent">
              Legal Policies
            </h4>
            <ul className="space-y-4 text-gray-400">
              <li>
                <Link href="/privacy" className="hover:text-green-400 hover:translate-x-1 transition-all inline-block">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-green-400 hover:translate-x-1 transition-all inline-block">
                  Terms of Use
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-green-400 hover:translate-x-1 transition-all inline-block">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/eula" className="hover:text-green-400 hover:translate-x-1 transition-all inline-block">
                  EULA
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
          <p>&copy; {currentYear} Raha Pos Solutions. All rights reserved.</p>
          <p className="mt-4 md:mt-0">
            A Product Of {' '}
            <a 
              href="https://infotigo.com/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary-400 font-semibold hover:text-primary-300 transition-colors"
            >
              Infotigo IT
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
