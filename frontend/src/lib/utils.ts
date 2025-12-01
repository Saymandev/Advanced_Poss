import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency amount with automatic company currency detection
 * @param amount - The amount to format
 * @param currency - Optional currency override. If not provided, uses company's global currency setting
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency?: string): string {
  // If currency is explicitly provided, use it
  if (currency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  // Try to get currency from window context (set by CurrencyProvider)
  if (typeof window !== 'undefined' && (window as any).__CURRENCY__) {
    const globalCurrency = (window as any).__CURRENCY__;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: globalCurrency,
    }).format(amount);
  }

  // Fallback to USD if no global currency is set
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined, _format: string = 'PPP'): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'N/A';
  }
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Check if date is valid
  if (!dateObj || isNaN(dateObj.getTime())) {
    return 'N/A';
  }
  
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

