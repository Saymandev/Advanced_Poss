'use client';

import { useGetCompanySettingsQuery } from '@/lib/api/endpoints/settingsApi';
import { useAppSelector } from '@/lib/store';
import { createContext, ReactNode, useContext, useEffect, useRef } from 'react';

interface CurrencyContextType {
  currency: string;
  isLoading: boolean;
  formatCurrency: (amount: number, overrideCurrency?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'BDT',
  isLoading: false,
  formatCurrency: (amount: number, overrideCurrency?: string) => {
    const currency = overrideCurrency || 'BDT';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },
});

// Global currency storage for utility functions outside React components
let globalCurrency = 'BDT';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, companyContext, isAuthenticated } = useAppSelector((state) => state.auth);
  
  // Super admin doesn't need company-specific settings - use default currency
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'SUPER_ADMIN';
  
  const companyId = 
    companyContext?.companyId || 
    (user as any)?.companyId || 
    '';

  // Only fetch company settings if user is authenticated and has permission
  // Skip for super admin (they don't need company-specific currency)
  // Skip for waiters/employees (they don't have permission)
  const isAuthorized = user?.role === 'owner' || user?.role === 'manager';
  const { data: companySettings, isLoading } = useGetCompanySettingsQuery(
    companyId,
    { skip: !companyId || !isAuthenticated || !isAuthorized || isSuperAdmin }
  );

  const currency = companySettings?.currency || 'BDT'; // Default to BDT to match settings page
  const currencyRef = useRef(currency);

  // Update global currency for utility functions
  useEffect(() => {
    currencyRef.current = currency;
    globalCurrency = currency;
    
    // Also set on window for backward compatibility with existing code
    if (typeof window !== 'undefined') {
      (window as any).__CURRENCY__ = currency;
    }
  }, [currency]);

  const formatCurrency = (amount: number, overrideCurrency?: string): string => {
    const currencyToUse = overrideCurrency || currency;
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyToUse,
      }).format(amount);
    } catch (error) {
      // Fallback if currency code is invalid
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, isLoading, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

// Export global currency getter for utility functions
export function getGlobalCurrency(): string {
  return globalCurrency;
}


