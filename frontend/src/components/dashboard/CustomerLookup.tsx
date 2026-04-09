'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useLazySearchCustomersQuery } from '@/lib/api/endpoints/customersApi';
import { useAppSelector } from '@/lib/store';
import { useEffect, useMemo, useState } from 'react';

interface CustomerLookupProps {
  onSelect: (customer: any) => void;
  selectedCustomerId?: string;
}

export default function CustomerLookup({ onSelect, selectedCustomerId }: CustomerLookupProps) {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [triggerSearch, { data: searchResults, isFetching }] = useLazySearchCustomersQuery();

  const companyId = (user as any)?.companyId || (companyContext as any)?.companyId;
  const branchId = user?.branchId || (companyContext as any)?.branchId;

  const resolvedResults = useMemo(() => {
    if (Array.isArray(searchResults)) return searchResults;
    if (!searchResults) return [] as any[];
    if (Array.isArray((searchResults as any).customers)) {
      return (searchResults as any).customers;
    }
    return [] as any[];
  }, [searchResults]);

  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2) return;

    const handle = setTimeout(() => {
      triggerSearch({ 
        query: term, 
        branchId: branchId || undefined,
        companyId: companyId || undefined
      });
    }, 250);

    return () => clearTimeout(handle);
  }, [searchTerm, triggerSearch, branchId, companyId]);

  return (
    <div className="space-y-4 pt-2">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Search existing customers
        </label>
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, phone, or email..."
          className="bg-white dark:bg-slate-950/70 border-gray-300 dark:border-slate-850 text-gray-900 dark:text-slate-100"
        />
      </div>

      {searchTerm.trim().length > 0 && searchTerm.trim().length < 2 && (
        <p className="text-xs text-gray-500 dark:text-slate-400">
          Enter at least two characters to search...
        </p>
      )}

      {isFetching ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-slate-900/60" />
          ))}
        </div>
      ) : resolvedResults.length > 0 ? (
        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
          {resolvedResults.map((customer: any) => {
            const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.name || 'Unnamed Customer';
            const phone = customer.phoneNumber || customer.phone || '';
            const isActive = selectedCustomerId === (customer.id || customer._id);
            
            return (
              <button
                key={customer.id || customer._id}
                type="button"
                onClick={() => onSelect(customer)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition text-sm ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100'
                    : 'border-gray-200 dark:border-slate-850 bg-white dark:bg-slate-950/70 text-gray-900 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{fullName}</p>
                    {phone && <p className="text-[11px] text-slate-500">{phone}</p>}
                  </div>
                  <Badge className="bg-gray-100 dark:bg-slate-900/40 text-[10px] px-1.5 py-0">
                    {customer.totalOrders ? `${customer.totalOrders} orders` : 'Select'}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      ) : searchTerm.trim().length >= 2 ? (
        <p className="text-xs text-gray-500 dark:text-slate-400">No customers found.</p>
      ) : null}
      
      {searchTerm.trim().length > 0 && (
        <div className="border-t border-gray-100 dark:border-slate-800 pt-2">
          <Button 
            type="button"
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-slate-500 hover:text-slate-700"
            onClick={() => setSearchTerm('')}
          >
            Clear Search
          </Button>
        </div>
      )}
    </div>
  );
}
