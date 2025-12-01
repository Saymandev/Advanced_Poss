/**
 * Hook to format currency using the company's global currency setting
 * This hook automatically uses the currency from company settings via CurrencyContext
 * 
 * @example
 * ```tsx
 * const formatCurrency = useFormatCurrency();
 * const price = formatCurrency(99.99); // Uses company currency
 * const customPrice = formatCurrency(99.99, 'EUR'); // Override with EUR
 * ```
 */
import { useCurrency } from '@/contexts/CurrencyContext';

export function useFormatCurrency() {
  const { formatCurrency } = useCurrency();
  return formatCurrency;
}

