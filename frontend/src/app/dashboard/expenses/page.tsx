'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import { CreateExpenseRequest, Expense, useApproveExpenseMutation, useCreateExpenseMutation, useDeleteExpenseMutation, useGetExpensesQuery, useRejectExpenseMutation, useUpdateExpenseMutation } from '@/lib/api/endpoints/expensesApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
    CalendarIcon,
    CheckCircleIcon,
    ClockIcon,
    CurrencyDollarIcon,
    EyeIcon,
    PencilIcon,
    PlusIcon,
    ReceiptRefundIcon,
    TrashIcon,
    UserIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const EXPENSE_CATEGORIES = [
  { value: 'ingredient', label: 'Ingredients' },
  { value: 'utility', label: 'Utilities' },
  { value: 'rent', label: 'Rent' },
  { value: 'salary', label: 'Salaries' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'transport', label: 'Transportation' },
  { value: 'other', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank-transfer', label: 'Bank Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

interface FormErrors {
  title?: string;
  amount?: string;
  category?: string;
  date?: string;
  paymentMethod?: string;
}

const RECURRING_FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function ExpensesPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  
  // Redirect if user doesn't have expenses feature (auto-redirects to role-specific dashboard)
  useFeatureRedirect('expenses');
  
  const companyId =
    (user as any)?.companyId ||
    (companyContext as any)?.companyId ||
    (companyContext as any)?._id ||
    (companyContext as any)?.id;

  const branchId =
    (user as any)?.branchId ||
    (companyContext as any)?.branchId ||
    (companyContext as any)?.branches?.[0]?._id ||
    (companyContext as any)?.branches?.[0]?.id;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data, isLoading, error, refetch } = useGetExpensesQuery({
    companyId: companyId || undefined,
    branchId: branchId || undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
    search: searchQuery || undefined,
    page: currentPage,
    limit: itemsPerPage,
  }, {
    skip: !branchId && !companyId,
    refetchOnMountOrArgChange: true,
  });

  const [createExpense] = useCreateExpenseMutation();
  const [updateExpense] = useUpdateExpenseMutation();
  const [approveExpense, { isLoading: isApproving }] = useApproveExpenseMutation();
  const [rejectExpense, { isLoading: isRejecting }] = useRejectExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<CreateExpenseRequest>({
    companyId: '',
    branchId: '',
    title: '',
    description: '',
    amount: 0,
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    vendorName: '',
    invoiceNumber: '',
    notes: '',
    isRecurring: false,
    recurringFrequency: 'monthly',
    createdBy: '',
  });

  const resetForm = () => {
    setFormData({
      companyId: user?.companyId || '',
      branchId: user?.branchId || '',
      title: '',
      description: '',
      amount: 0,
      category: 'other',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      vendorName: '',
      invoiceNumber: '',
      notes: '',
      isRecurring: false,
      recurringFrequency: 'monthly',
      createdBy: user?.id || '',
    });
    setFormErrors({});
    setSelectedExpense(null);
  };

  // Initialize form data with user context
  useEffect(() => {
    if (user?.companyId && user?.branchId && user?.id) {
      setFormData(prev => ({
        ...prev,
        companyId: user.companyId || '',
        branchId: user.branchId || '',
        createdBy: user.id || '',
      }));
    }
  }, [user]);

  // const handleApprove = async (expense: Expense, approved: boolean) => {
  //   try {
  //     await approveExpense({
  //       id: expense.id,
  //       approved,
  //       notes: approved ? 'Approved' : 'Rejected',
  //     }).unwrap();
  //     toast.success(`Expense ${approved ? 'approved' : 'rejected'} successfully`);
  //     refetch();
  //   } catch (error: any) {
  //     toast.error(error.data?.message || 'Failed to update expense status');
  //   }
  // };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.title || formData.title.trim().length === 0) {
      errors.title = 'Title is required';
    } else if (formData.title.length > 200) {
      errors.title = 'Title must be less than 200 characters';
    }

    if (!formData.amount || formData.amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    } else if (formData.amount > 10000000) {
      errors.amount = 'Amount is too large';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    if (!formData.date) {
      errors.date = 'Date is required';
    } else {
      const date = new Date(formData.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (date > today) {
        errors.date = 'Date cannot be in the future';
      }
    }

    if (!formData.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!user?.branchId || !user?.companyId || !user?.id) {
      toast.error('User context is missing. Please refresh the page.');
      return;
    }

    try {
      const payload: CreateExpenseRequest = {
        companyId: user.companyId,
        branchId: user.branchId,
        createdBy: user.id,
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        amount: Number(formData.amount.toFixed(2)),
        category: formData.category,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        vendorName: formData.vendorName?.trim() || undefined,
        invoiceNumber: formData.invoiceNumber?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        isRecurring: formData.isRecurring || false,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
      };

      await createExpense(payload).unwrap();
      toast.success('Expense created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to create expense';
      toast.error(errorMessage);
      console.error('Create expense error:', error);
    }
  };

  const handleEdit = async () => {
    if (!selectedExpense) return;

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      const payload: Partial<CreateExpenseRequest> = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        amount: Number(formData.amount.toFixed(2)),
        category: formData.category,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        vendorName: formData.vendorName?.trim() || undefined,
        invoiceNumber: formData.invoiceNumber?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        isRecurring: formData.isRecurring || false,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
      };

      await updateExpense({
        id: selectedExpense.id,
        ...payload,
      }).unwrap();
      toast.success('Expense updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to update expense';
      toast.error(errorMessage);
      console.error('Update expense error:', error);
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm(`Are you sure you want to delete this expense: "${expense.description}"?`)) return;

    try {
      await deleteExpense(expense.id).unwrap();
      toast.success('Expense deleted successfully');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete expense');
    }
  };

  const handleApprove = async (expense: Expense) => {
    try {
      await approveExpense({
        id: expense.id,
      }).unwrap();
      toast.success('Expense approved successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to approve expense');
    }
  };

  const handleReject = async (expense: Expense) => {
    if (!confirm('Are you sure you want to reject this expense?')) {
      return;
    }

    try {
      await rejectExpense({
        id: expense.id,
      }).unwrap();
      toast.success('Expense rejected');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to reject expense');
    }
  };

  const openEditModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      companyId: user?.companyId || '',
      branchId: user?.branchId || '',
      createdBy: user?.id || '',
      title: expense.title || '',
      description: expense.description || '',
      amount: expense.amount,
      category: expense.category,
      date: expense.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0],
      paymentMethod: expense.paymentMethod || 'cash',
      vendorName: expense.vendorName || '',
      invoiceNumber: expense.invoiceNumber || '',
      notes: expense.notes || '',
      isRecurring: expense.isRecurring || false,
      recurringFrequency: expense.recurringFrequency || 'monthly',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openViewModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsViewModalOpen(true);
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      'ingredient': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'utility': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'rent': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'salary': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'maintenance': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'marketing': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      'equipment': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      'transport': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return colors[category] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const getCategoryLabel = (category: string) => {
    const cat = EXPENSE_CATEGORIES.find(c => c.value === category);
    return cat?.label || category;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      'cash': 'Cash',
      'card': 'Card',
      'bank-transfer': 'Bank Transfer',
      'cheque': 'Cheque',
      'online': 'Online',
      'other': 'Other',
    };
    return methodMap[method] || method;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, any> = {
      'pending': { variant: 'warning', label: 'Pending' },
      'approved': { variant: 'success', label: 'Approved' },
      'rejected': { variant: 'danger', label: 'Rejected' },
      'paid': { variant: 'info', label: 'Paid' },
    };
    const statusInfo = colors[status] || { variant: 'secondary', label: status };
    return <Badge variant={statusInfo.variant as any}>{statusInfo.label}</Badge>;
  };

  const columns = [
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'title',
      title: 'Expense',
      sortable: true,
      render: (value: string, row: Expense) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <ReceiptRefundIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{getCategoryLabel(row.category)}</p>
            {row.vendorName && (
              <p className="text-xs text-gray-400">{row.vendorName}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      title: 'Amount',
      align: 'right' as const,
      render: (value: number) => (
        <div className="text-right">
          <p className="font-semibold text-red-600">
            -{formatCurrency(value)}
          </p>
        </div>
      ),
    },
    {
      key: 'date',
      title: 'Date',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(value).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      key: 'createdBy',
      title: 'Recorded By',
      render: (value: string, row: Expense) => {
        const userName = row.createdByUser?.name 
          || (row.createdByUser?.firstName && row.createdByUser?.lastName 
            ? `${row.createdByUser.firstName} ${row.createdByUser.lastName}` 
            : row.createdByUser?.firstName || row.createdByUser?.lastName)
          || 'Unknown User';
        
        return (
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {userName}
            </span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      title: 'Recorded',
      render: (value: string) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {formatDateTime(value)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: Expense) => (
        <div className="flex items-center gap-2">
          {row.status === 'pending' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApprove(row)}
                disabled={isApproving || isRejecting}
                title="Approve"
                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <CheckCircleIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReject(row)}
                disabled={isApproving || isRejecting}
                title="Reject"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <XCircleIcon className="w-4 h-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
            title="View"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const stats = useMemo(() => {
    const expenses = data?.expenses || [];
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const thisMonthExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= thisMonthStart && expenseDate <= thisMonthEnd;
    });

    const pendingExpenses = expenses.filter(e => e.status === 'pending');
    const paidExpenses = expenses.filter(e => e.status === 'paid');

    return {
      total: data?.total || 0,
      totalAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0),
      thisMonth: thisMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      pending: pendingExpenses.length,
      pendingAmount: pendingExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      paid: paidExpenses.length,
      paidAmount: paidExpenses.reduce((sum, expense) => sum + expense.amount, 0),
      categories: EXPENSE_CATEGORIES.length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Expense Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track and manage business expenses
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ImportButton
            onImport={async (data, _result) => {
              let successCount = 0;
              let errorCount = 0;

              for (const item of data) {
                try {
                  if (!user?.branchId || !user?.companyId || !user?.id) {
                    toast.error('User context is missing. Please refresh the page.');
                    return;
                  }

                  const payload: CreateExpenseRequest = {
                    companyId: user.companyId,
                    branchId: user.branchId,
                    createdBy: user.id,
                    title: (item.title || item.Title || '').trim(),
                    description: (item.description || item.Description || '').trim() || undefined,
                    amount: parseFloat(item.amount || item.Amount || 0),
                    category: item.category || item.Category || 'other',
                    date: item.date || item.Date || new Date().toISOString().split('T')[0],
                    paymentMethod: item.paymentMethod || item['Payment Method'] || 'cash',
                    vendorName: (item.vendorName || item['Vendor Name'] || '').trim() || undefined,
                    invoiceNumber: (item.invoiceNumber || item['Invoice Number'] || '').trim() || undefined,
                    notes: (item.notes || item.Notes || '').trim() || undefined,
                    isRecurring: item.isRecurring === true || item['Is Recurring'] === 'Yes' || false,
                    recurringFrequency: item.recurringFrequency || item['Recurring Frequency'] || undefined,
                  };

                  await createExpense(payload).unwrap();
                  successCount++;
                } catch (error: any) {
                  console.error('Failed to import expense:', item, error);
                  errorCount++;
                }
              }

              if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} expenses`);
                await refetch();
              }
              if (errorCount > 0) {
                toast.error(`Failed to import ${errorCount} expenses`);
              }
            }}
            columns={[
              { key: 'title', label: 'Title', required: true, type: 'string' },
              { key: 'amount', label: 'Amount', required: true, type: 'number' },
              { key: 'category', label: 'Category', required: true, type: 'string' },
              { key: 'date', label: 'Date', required: true, type: 'date' },
              { key: 'paymentMethod', label: 'Payment Method', required: true, type: 'string' },
              { key: 'description', label: 'Description', type: 'string' },
              { key: 'vendorName', label: 'Vendor Name', type: 'string' },
              { key: 'invoiceNumber', label: 'Invoice Number', type: 'string' },
            ]}
            filename="expenses-import-template"
            variant="secondary"
          />
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto text-sm sm:text-base">
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Expenses</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate" title={stats.total.toString()}>
                  {stats.total.toLocaleString()}
                </p>
              </div>
              <ReceiptRefundIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Amount</p>
                <p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-red-600 truncate" title={formatCurrency(stats.totalAmount)}>
                  {formatCurrency(stats.totalAmount)}
                </p>
              </div>
              <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-red-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">This Month</p>
                <p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-orange-600 truncate" title={formatCurrency(stats.thisMonth)}>
                  {formatCurrency(stats.thisMonth)}
                </p>
              </div>
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-orange-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Pending</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-yellow-600 truncate" title={stats.pending.toString()}>
                  {stats.pending.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1 truncate" title={formatCurrency(stats.pendingAmount)}>{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-yellow-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...EXPENSE_CATEGORIES,
                ]}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="Filter by category"
                className="text-xs sm:text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Start Date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full sm:w-32 text-xs sm:text-sm"
              />
              <Input
                type="date"
                placeholder="End Date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full sm:w-32 text-xs sm:text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
          <p className="text-red-800 dark:text-red-400">
            Error loading expenses: {(error as any)?.data?.message || (error as any)?.message || 'Unknown error'}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      )}
      <DataTable
        data={data?.expenses || []}
        columns={columns}
        loading={isLoading}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil((data?.total || 0) / itemsPerPage),
          itemsPerPage,
          totalItems: data?.total || 0,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="expenses"
        onExport={(_format, _items) => {
          // Export is handled automatically by ExportButton component
        }}
        emptyMessage="No expenses found."
      />

      {/* Create Expense Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Add New Expense"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Title *"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (formErrors.title) {
                    setFormErrors({ ...formErrors, title: undefined });
                  }
                }}
                placeholder="e.g., Office supplies"
                required
                error={formErrors.title}
              />
            </div>
            <div>
              <Input
                label="Amount *"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setFormData({ ...formData, amount: value });
                  if (formErrors.amount) {
                    setFormErrors({ ...formErrors, amount: undefined });
                  }
                }}
                placeholder="0.00"
                required
                error={formErrors.amount}
              />
            </div>
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Additional details about this expense"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Select
                label="Category *"
                options={EXPENSE_CATEGORIES}
                value={formData.category}
                onChange={(value) => {
                  setFormData({ ...formData, category: value as any });
                  if (formErrors.category) {
                    setFormErrors({ ...formErrors, category: undefined });
                  }
                }}
                placeholder="Select expense category"
                error={formErrors.category}
                className="text-sm sm:text-base"
              />
            </div>
            <Input
              label="Date *"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="text-sm sm:text-base"
            />
          </div>

          <div>
            <Select
              label="Payment Method *"
              options={PAYMENT_METHODS}
              value={formData.paymentMethod}
              onChange={(value) => {
                setFormData({ ...formData, paymentMethod: value as any });
                if (formErrors.paymentMethod) {
                  setFormErrors({ ...formErrors, paymentMethod: undefined });
                }
              }}
              placeholder="Select payment method"
              error={formErrors.paymentMethod}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Vendor Name"
              value={formData.vendorName}
              onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
              placeholder="e.g., ABC Supplies"
              className="text-sm sm:text-base"
            />
            <Input
              label="Invoice Number"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              placeholder="e.g., INV-2024-001"
              className="text-sm sm:text-base"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="isRecurring" className="text-sm text-gray-600 dark:text-gray-400">
              This is a recurring expense
            </label>
          </div>

          {formData.isRecurring && (
            <Select
              label="Recurring Frequency"
              options={RECURRING_FREQUENCIES}
              value={formData.recurringFrequency}
              onChange={(value) => setFormData({ ...formData, recurringFrequency: value as any })}
              placeholder="Select frequency"
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes..."
              rows={3}
              className="input"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} className="w-full sm:w-auto text-sm sm:text-base">
              Add Expense
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Expense"
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Input
                label="Title *"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  if (formErrors.title) {
                    setFormErrors({ ...formErrors, title: undefined });
                  }
                }}
                required
                error={formErrors.title}
                className="text-sm sm:text-base"
              />
            </div>
            <div>
              <Input
                label="Amount *"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setFormData({ ...formData, amount: value });
                  if (formErrors.amount) {
                    setFormErrors({ ...formErrors, amount: undefined });
                  }
                }}
                required
                error={formErrors.amount}
                className="text-sm sm:text-base"
              />
            </div>
          </div>

          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="text-sm sm:text-base"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Select
                label="Category *"
                options={EXPENSE_CATEGORIES}
                value={formData.category}
                onChange={(value) => {
                  setFormData({ ...formData, category: value as any });
                  if (formErrors.category) {
                    setFormErrors({ ...formErrors, category: undefined });
                  }
                }}
                error={formErrors.category}
                className="text-sm sm:text-base"
              />
            </div>
            <Input
              label="Date *"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="text-sm sm:text-base"
            />
          </div>

          <div>
            <Select
              label="Payment Method *"
              options={PAYMENT_METHODS}
              value={formData.paymentMethod}
              onChange={(value) => {
                setFormData({ ...formData, paymentMethod: value as any });
                if (formErrors.paymentMethod) {
                  setFormErrors({ ...formErrors, paymentMethod: undefined });
                }
              }}
              error={formErrors.paymentMethod}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              label="Vendor Name"
              value={formData.vendorName}
              onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
              className="text-sm sm:text-base"
            />
            <Input
              label="Invoice Number"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              className="text-sm sm:text-base"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring-edit"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor="isRecurring-edit" className="text-sm text-gray-600 dark:text-gray-400">
              This is a recurring expense
            </label>
          </div>

          {formData.isRecurring && (
            <Select
              label="Recurring Frequency"
              options={RECURRING_FREQUENCIES}
              value={formData.recurringFrequency}
              onChange={(value) => setFormData({ ...formData, recurringFrequency: value as any })}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="input"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} className="w-full sm:w-auto text-sm sm:text-base">
              Update Expense
            </Button>
          </div>
        </div>
      </Modal>

      {/* Expense Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedExpense(null);
        }}
        title="Expense Details"
        className="max-w-2xl"
      >
        {selectedExpense && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <ReceiptRefundIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedExpense.description}
                </h3>
                <Badge className={getCategoryBadge(selectedExpense.category)}>
                  {selectedExpense.category}
                </Badge>
                <div className="mt-2">
                  <p className="text-3xl font-bold text-red-600">
                    -{formatCurrency(selectedExpense.amount)}
                  </p>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Expense Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedExpense.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getPaymentMethodLabel(selectedExpense.paymentMethod)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    {getStatusBadge(selectedExpense.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Recorded By:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedExpense.createdByUser?.name 
                        || (selectedExpense.createdByUser?.firstName && selectedExpense.createdByUser?.lastName 
                          ? `${selectedExpense.createdByUser.firstName} ${selectedExpense.createdByUser.lastName}` 
                          : selectedExpense.createdByUser?.firstName || selectedExpense.createdByUser?.lastName)
                        || (selectedExpense.createdBy ? `User ${selectedExpense.createdBy.slice(-6)}` : 'N/A')}
                    </span>
                  </div>
                  {selectedExpense.expenseNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Expense #:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedExpense.expenseNumber}
                      </span>
                    </div>
                  )}
                  {selectedExpense.purchaseOrderId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Purchase Order:</span>
                      <a 
                        href={`/dashboard/purchase-orders`}
                        className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {selectedExpense.purchaseOrderId}
                      </a>
                    </div>
                  )}
                  {selectedExpense.vendorName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Vendor:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedExpense.vendorName}
                      </span>
                    </div>
                  )}
                  {selectedExpense.invoiceNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Invoice #:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedExpense.invoiceNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Timestamps</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Created:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(selectedExpense.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(selectedExpense.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedExpense(null);
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Close
              </Button>
              <Button onClick={() => {
                setIsViewModalOpen(false);
                openEditModal(selectedExpense);
              }} className="w-full sm:w-auto text-sm sm:text-base">
                Edit Expense
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}