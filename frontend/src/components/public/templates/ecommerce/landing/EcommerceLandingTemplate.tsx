 /* eslint-disable @next/next/no-img-element */
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useGetCompanyBySlugQuery, useGetCompanyBranchesQuery, useGetCompanyGalleryQuery } from '@/lib/api/endpoints/publicApi';
import Link from 'next/link';
import { MapPinIcon, ClockIcon, PhoneIcon } from '@heroicons/react/24/outline';

export default function EcommerceLandingTemplate() {
  const params = useParams();
  const companySlug = params.companySlug as string;

  const { data: company, isLoading: companyLoading } = useGetCompanyBySlugQuery(companySlug, { skip: !companySlug });
  const { data: branches = [], isLoading: branchesLoading } = useGetCompanyBranchesQuery(companySlug, { skip: !companySlug });
  const { data: gallery = [] } = useGetCompanyGalleryQuery(companySlug, { skip: !companySlug });
  const [currentSlide, setCurrentSlide] = React.useState(0);

  React.useEffect(() => {
    if (gallery.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % gallery.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [gallery.length]);

  if (companyLoading || branchesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-xl text-gray-500">Store not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      {/* Sticky Global Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="h-12 w-12 object-contain rounded-lg shadow-sm" />
            ) : (
              <div className="h-12 w-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">
                {company.name.charAt(0)}
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{company.name}</h1>
          </div>
          <nav className="hidden md:flex gap-6 items-center">
            <Link href={`/${companySlug}/about`} className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">About</Link>
            <Link href={`/${companySlug}/contact`} className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">Contact</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gray-900 text-white h-[600px] md:h-[700px] flex items-center justify-center">
        {/* Slider Backgrounds */}
        {gallery.length > 0 ? (
          gallery.map((img: any, index: number) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
              style={{
                backgroundImage: `url(${img.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="absolute inset-0 bg-gray-900/60 dark:bg-gray-900/80"></div>
            </div>
          ))
        ) : (
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: company.logo ? `url(${company.logo})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className={`absolute inset-0 ${company.logo ? 'bg-gray-900/80 dark:bg-gray-900/90' : 'bg-gray-900'}`}>
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/30 blur-[100px]"></div>
              <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/30 blur-[100px]"></div>
            </div>
          </div>
        )}

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 flex flex-col items-center text-center">
          {gallery.length > 0 && gallery[currentSlide]?.caption ? (
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-white animate-fade-in-up">
              {gallery[currentSlide].caption}
            </h2>
          ) : (
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-white animate-fade-in-up">
              Welcome to <br /> <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">{company.name}</span>
            </h2>
          )}
          
          {gallery.length > 0 && gallery[currentSlide]?.description ? (
            <p className="text-lg md:text-xl lg:text-2xl text-gray-200 max-w-3xl mb-10 leading-relaxed font-light animate-fade-in-up animation-delay-200">
              {gallery[currentSlide].description}
            </p>
          ) : (
            <p className="text-lg md:text-xl lg:text-2xl text-gray-300 max-w-3xl mb-10 leading-relaxed font-light animate-fade-in-up animation-delay-200">
              {company.description || 'Experience premium quality products delivered right to your door. Select a store location below to start shopping.'}
            </p>
          )}
          
          <div className="flex gap-4 animate-fade-in-up animation-delay-400">
             <a href="#locations" className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold text-lg transition-all duration-300 shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] transform hover:-translate-y-1">
               Start Shopping
             </a>
          </div>

          {/* Slider Indicators */}
          {gallery.length > 1 && (
            <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2">
              {gallery.map((_: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${index === currentSlide ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80'}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Locations Section */}
      <section id="locations" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Our Locations</h3>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Select a branch near you to explore our curated collection of premium products.</p>
        </div>

        {branches.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No locations are currently available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {branches.map((branch: any) => (
              <div key={branch.id || branch.slug} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 flex flex-col h-full group hover:-translate-y-1">
                <div className="flex justify-between items-start mb-6">
                  <h4 className="text-2xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{branch.name}</h4>
                  {branch.isActive && (
                    <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full uppercase tracking-wider">Open</span>
                  )}
                </div>
                
                <div className="space-y-4 mb-8 flex-grow">
                  {branch.address && (
                    <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300">
                      <MapPinIcon className="w-5 h-5 flex-shrink-0 text-indigo-500 mt-0.5" />
                      <span className="leading-relaxed">
                        {branch.address.street && `${branch.address.street}, `}
                        {branch.address.city}
                        {branch.address.zipCode && ` ${branch.address.zipCode}`}
                      </span>
                    </div>
                  )}
                  {branch.phone && (
                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                      <PhoneIcon className="w-5 h-5 flex-shrink-0 text-indigo-500" />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                  {branch.openingHours && branch.openingHours.length > 0 && (
                     <div className="flex items-start gap-3 text-gray-600 dark:text-gray-300 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <ClockIcon className="w-5 h-5 flex-shrink-0 text-indigo-500 mt-0.5" />
                        <div className="text-sm space-y-1">
                           {branch.openingHours.slice(0, 2).map((hours: any, idx: number) => (
                             <div key={idx}>
                               <span className="font-medium">{hours.day}:</span> {hours.isClosed ? 'Closed' : `${hours.open} - ${hours.close}`}
                             </div>
                           ))}
                           {branch.openingHours.length > 2 && <div className="text-xs text-gray-400">+{branch.openingHours.length - 2} more days</div>}
                        </div>
                     </div>
                  )}
                </div>

                <Link 
                  href={`/${companySlug}/${branch.slug}/shop`}
                  className={`w-full py-4 rounded-xl font-bold text-center transition-all duration-300 ${branch.isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                >
                  {branch.isActive ? 'Visit Storefront' : 'Currently Closed'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
           <p className="text-gray-500 dark:text-gray-400">© {new Date().getFullYear()} {company.name}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
