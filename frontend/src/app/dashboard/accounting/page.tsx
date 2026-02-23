'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import {
    useGetAccountBalancesQuery,
    useGetTransactionsQuery,
    useWithdrawProfitMutation,
} from '@/lib/api/endpoints/transactionsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    ArrowTrendingDownIcon,
    CurrencyDollarIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function AccountingPage() {
  useFeatureRedirect('accounting');
  
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (user && !['owner', 'super_admin', 'manager'].includes(user.role.toLowerCase())) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number | ''>('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  // Fetch Balances
  const { data: balances = [], isLoading: isLoadingBalances, refetch: refetchBalances } =
    useGetAccountBalancesQuery();

  // Fetch Transactions Ledger
  const [page, setPage] = useState(1);
  const { data: transactionsData, isLoading: isLoadingLedger, refetch: refetchLedger } =
    useGetTransactionsQuery({ limit: 10, page });

  const [withdrawProfit, { isLoading: isWithdrawing }] = useWithdrawProfitMutation();

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentMethod || !withdrawAmount || withdrawAmount <= 0) {
      toast.error('Please select an account and enter a valid amount');
      return;
    }

    const selectedAccount = balances.find((b) => b._id === selectedPaymentMethod);
    if (!selectedAccount) {
      toast.error('Selected account not found');
      return;
    }

    if (withdrawAmount > selectedAccount.currentBalance) {
      toast.error(`Cannot withdraw more than available balance (${formatCurrency(selectedAccount.currentBalance)})`);
      return;
    }

    try {
      await withdrawProfit({
        paymentMethodId: selectedPaymentMethod,
        amount: Number(withdrawAmount),
        notes: withdrawNotes,
      }).unwrap();

      toast.success('Profit withdrawn successfully');
      setIsWithdrawModalOpen(false);
      setWithdrawAmount('');
      setWithdrawNotes('');
      setSelectedPaymentMethod('');
      refetchBalances();
      refetchLedger();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to withdraw profit');
    }
  };

  const ledgerColumns = [
    {
      key: 'transactionNumber',
      title: 'Trx No',
      render: (_: any, t: any) => t.transactionNumber,
    },
    {
      key: 'date',
      title: 'Date',
      render: (_: any, t: any) => formatDate(t.date),
    },
    {
      key: 'paymentMethod',
      title: 'Account',
      render: (_: any, t: any) => t.paymentMethodId?.name || 'Unknown',
    },
    {
      key: 'type',
      title: 'Type',
      render: (_: any, t: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            t.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {t.type}
        </span>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      render: (_: any, t: any) => t.category.replace('_', ' '),
    },
    {
      key: 'description',
      title: 'Description',
      render: (_: any, t: any) => t.description || t.notes || '-',
    },
    {
      key: 'amount',
      title: 'Amount',
      render: (_: any, t: any) => (
        <span className={`font-medium ${t.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
          {t.type === 'IN' ? '+' : '-'}{formatCurrency(t.amount)}
        </span>
      ),
    },
    {
      key: 'balanceAfter',
      title: 'Balance After',
      render: (_: any, t: any) => formatCurrency(t.balanceAfter),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Accounting Ledger
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track your real-time cash flow and account balances.
          </p>
        </div>
        
        {user && ['owner', 'super_admin'].includes(user.role.toLowerCase()) && (
          <button
            onClick={() => setIsWithdrawModalOpen(true)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg hover:from-red-700 hover:to-rose-700 transition-all shadow-md active:scale-95"
          >
            <ArrowTrendingDownIcon className="w-5 h-5 mr-2" />
            Withdraw Profit
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {isLoadingBalances ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100/50 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
          ))
        ) : balances.length === 0 ? (
          <div className="col-span-full text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
            <CurrencyDollarIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No active accounts</h3>
            <p className="text-gray-500 dark:text-gray-400">Add payment methods in settings to see balances.</p>
          </div>
        ) : (
          balances.map((account) => (
            <Card key={account._id}>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{account.name}</p>
                    <p
                      className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-gray-900 dark:text-white truncate"
                      title={String(account.currentBalance)}
                    >
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.currentBalance)}
                    </p>
                    <span className="inline-block text-xs uppercase tracking-wider bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded mt-1 truncate max-w-full">
                      {account.code} · {account.type.replace('_', ' ')}
                    </span>
                  </div>
                  <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-indigo-500 flex-shrink-0 opacity-70" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden mt-8">
        <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
        </div>
        <DataTable
          columns={ledgerColumns}
          data={transactionsData?.transactions || []}
          loading={isLoadingLedger}
          pagination={{
            currentPage: transactionsData?.page || 1,
            totalPages: Math.ceil((transactionsData?.total || 0) / (transactionsData?.limit || 10)),
            totalItems: transactionsData?.total || 0,
            itemsPerPage: transactionsData?.limit || 10,
            onPageChange: setPage,
          }}
        />
      </div>

      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <ArrowTrendingDownIcon className="w-5 h-5 mr-2 text-rose-500" />
                Withdraw Profit
              </h3>
              <button
                onClick={() => setIsWithdrawModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <PlusIcon className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleWithdraw} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Account
                </label>
                <select
                  required
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-colors"
                >
                  <option value="">Select Account...</option>
                  {balances.filter(b => b.currentBalance > 0).map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name} ({formatCurrency(account.currentBalance)} available)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount to Withdraw
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-medium text-gray-500">
                    ৳
                  </span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-colors"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes / Reference
                </label>
                <textarea
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white transition-colors resize-none h-24"
                  placeholder="E.g., Monthly owner draw for January"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawing}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isWithdrawing ? 'Processing...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
