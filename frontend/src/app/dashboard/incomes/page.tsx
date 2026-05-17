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
import {
  CreateIncomeRequest,
  Income,
  useCreateIncomeMutation,
  useDeleteIncomeMutation,
  useGetIncomesQuery,
  useMarkIncomeAsReceivedMutation,
  useUpdateIncomeMutation,
} from '@/lib/api/endpoints/incomesApi';
import { useGetPaymentMethodsByCompanyQuery } from '@/lib/api/endpoints/paymentMethodsApi';
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
  ReceiptPercentIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const INCOME_CATEGORIES = [
  { value: 'catering', label: 'Catering Services' },
  { value: 'event', label: 'Events & Functions' },
  { value: 'room-service', label: 'Room Service' },
  { value: 'interest', label: 'Interest Income' },
  { value: 'other', label: 'Other Income' },
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

export default function IncomesPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);

  // Gated behind features.constants INCOME key
  useFeatureRedirect('income');

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
  const [selectedIncome, setSelectedIncome] = useState<Income | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data, isLoading, error, refetch } = useGetIncomesQuery(
    {
      companyId: companyId || undefined,
      branchId: branchId || undefined,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      startDate: dateRange.start || undefined,
      endDate: dateRange.end || undefined,
      search: searchQuery || undefined,
      page: currentPage,
      limit: itemsPerPage,
    },
    {
      skip: !branchId && !companyId,
      refetchOnMountOrArgChange: true,
    },
  );

  const { data: paymentMethodsData } = useGetPaymentMethodsByCompanyQuery(companyId || '', {
    skip: !companyId,
  });

  const dynamicPaymentMethods = useMemo(() => {
    const methods = paymentMethodsData || [];
    if (!Array.isArray(methods) || methods.length === 0) return PAYMENT_METHODS;

    const activeMethods = methods.filter((m: any) => {
      if (!m.isActive) return false;
      if (m.branchId && m.branchId !== branchId) return false;
      return true;
    });

    if (activeMethods.length === 0) return PAYMENT_METHODS;

    return activeMethods.map((method: any) => ({
      value: method.code,
      label: method.displayName || method.name,
    }));
  }, [paymentMethodsData, branchId]);

  const [createIncome] = useCreateIncomeMutation();
  const [updateIncome] = useUpdateIncomeMutation();
  const [deleteIncome] = useDeleteIncomeMutation();
  const [markIncomeAsReceived, { isLoading: isMarkingReceived }] = useMarkIncomeAsReceivedMutation();

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<CreateIncomeRequest>({
    companyId: '',
    branchId: '',
    title: '',
    description: '',
    amount: 0,
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    invoiceNumber: '',
    customerName: '',
    customerPhone: '',
    notes: '',
    createdBy: '',
    status: 'pending',
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
      invoiceNumber: '',
      customerName: '',
      customerPhone: '',
      notes: '',
      createdBy: user?.id || '',
      status: 'pending',
    });
    setFormErrors({});
    setSelectedIncome(null);
  };

  useEffect(() => {
    if (user?.companyId && user?.branchId && user?.id) {
      setFormData((prev) => ({
        ...prev,
        companyId: user.companyId || '',
        branchId: user.branchId || '',
        createdBy: user.id || '',
      }));
    }
  }, [user]);

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
      const payload: CreateIncomeRequest = {
        companyId: user.companyId,
        branchId: user.branchId,
        createdBy: user.id,
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        amount: Number(formData.amount),
        category: formData.category as any,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        invoiceNumber: formData.invoiceNumber?.trim() || undefined,
        customerName: formData.customerName?.trim() || undefined,
        customerPhone: formData.customerPhone?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        status: formData.status,
      };

      await createIncome(payload).unwrap();
      toast.success('Income recorded successfully');
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      const errorMessage = err?.data?.message || err?.message || 'Failed to create income';
      toast.error(errorMessage);
    }
  };

  const handleEdit = async () => {
    if (!selectedIncome) return;

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      const payload: Partial<CreateIncomeRequest> = {
        title: formData.title.trim(),
        description: formData.description?.trim() || undefined,
        amount: Number(formData.amount),
        category: formData.category as any,
        date: formData.date,
        paymentMethod: formData.paymentMethod,
        invoiceNumber: formData.invoiceNumber?.trim() || undefined,
        customerName: formData.customerName?.trim() || undefined,
        customerPhone: formData.customerPhone?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        status: formData.status,
      };

      await updateIncome({
        id: selectedIncome.id,
        ...payload,
      }).unwrap();
      toast.success('Income details updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      const errorMessage = err?.data?.message || err?.message || 'Failed to update income';
      toast.error(errorMessage);
    }
  };

  const handleDelete = async (income: Income) => {
    if (!confirm(`Are you sure you want to delete this income entry: "${income.title}"?`)) return;

    try {
      await deleteIncome(income.id).unwrap();
      toast.success('Income entry deleted successfully');
      refetch();
    } catch (err: any) {
      toast.error(err.data?.message || 'Failed to delete income');
    }
  };

  const handleMarkAsReceived = async (income: Income) => {
    if (!confirm(`Mark "${income.title}" as Received? This will credit the ledger account.`)) return;
    try {
      await markIncomeAsReceived(income.id).unwrap();
      toast.success('Income marked as received and credited to ledger!');
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to record receipt');
    }
  };

  const openEditModal = (income: Income) => {
    setSelectedIncome(income);
    setFormData({
      companyId: user?.companyId || '',
      branchId: user?.branchId || '',
      createdBy: user?.id || '',
      title: income.title || '',
      description: income.description || '',
      amount: income.amount,
      category: income.category as any,
      date: income.date ? income.date.split('T')[0] : new Date().toISOString().split('T')[0],
      paymentMethod: income.paymentMethod || 'cash',
      invoiceNumber: income.invoiceNumber || '',
      customerName: income.customerName || '',
      customerPhone: income.customerPhone || '',
      notes: income.notes || '',
      status: income.status || 'pending',
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openViewModal = (income: Income) => {
    setSelectedIncome(income);
    setIsViewModalOpen(true);
  };

  const getCategoryLabel = (category: string) => {
    const cat = INCOME_CATEGORIES.find((c) => c.value === category);
    return cat?.label || category;
  };

  const getPaymentMethodLabel = (method: string) => {
    const dynamicMethod = dynamicPaymentMethods.find((m) => m.value === method);
    if (dynamicMethod) return dynamicMethod.label;

    const methodMap: Record<string, string> = {
      cash: 'Cash',
      card: 'Card',
      'bank-transfer': 'Bank Transfer',
      cheque: 'Cheque',
      online: 'Online',
      other: 'Other',
    };
    return methodMap[method] || method;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, any> = {
      pending: { variant: 'warning', label: 'Pending' },
      received: { variant: 'success', label: 'Received' },
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
      title: 'Income Source',
      sortable: true,
      render: (value: string, row: Income) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
            <ReceiptPercentIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{getCategoryLabel(row.category)}</p>
            {row.customerName && (
              <p className="text-xs text-gray-400">{row.customerName} {row.customerPhone ? `(${row.customerPhone})` : ''}</p>
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
          <p className="font-semibold text-green-600">
            +{formatCurrency(value)}
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
      render: (value: string, row: Income) => {
        const userName =
          row.createdByUser?.name ||
          (row.createdByUser?.firstName && row.createdByUser?.lastName
            ? `${row.createdByUser.firstName} ${row.createdByUser.lastName}`
            : row.createdByUser?.firstName || row.createdByUser?.lastName) ||
          'System';

        return (
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{userName}</span>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      title: 'Recorded',
      render: (value: string) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatDateTime(value)}</span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: Income) => (
        <div className="flex items-center gap-2">
          {row.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleMarkAsReceived(row)}
              disabled={isMarkingReceived}
              title="Mark as Received (credits ledger)"
              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
            >
              <CheckCircleIcon className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => openViewModal(row)} title="View">
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEditModal(row)} title="Edit">
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
    const incomes = data?.incomes || [];
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const thisMonthIncomes = incomes.filter((i) => {
      const incDate = new Date(i.date);
      return incDate >= thisMonthStart && incDate <= thisMonthEnd;
    });

    const pendingIncomes = incomes.filter((i) => i.status === 'pending');
    const receivedIncomes = incomes.filter((i) => i.status === 'received');

    return {
      total: data?.total || 0,
      totalAmount: incomes.reduce((sum, inc) => sum + inc.amount, 0),
      thisMonth: thisMonthIncomes.reduce((sum, inc) => sum + inc.amount, 0),
      pending: pendingIncomes.length,
      pendingAmount: pendingIncomes.reduce((sum, inc) => sum + inc.amount, 0),
      received: receivedIncomes.length,
      receivedAmount: receivedIncomes.reduce((sum, inc) => sum + inc.amount, 0),
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Income Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track and manage manual income sources
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

                  const payload: CreateIncomeRequest = {
                    companyId: user.companyId,
                    branchId: user.branchId,
                    createdBy: user.id,
                    title: (item.title || item.Title || '').trim(),
                    description: (item.description || item.Description || '').trim() || undefined,
                    amount: parseFloat(item.amount || item.Amount || 0),
                    category: item.category || item.Category || 'other',
                    date: item.date || item.Date || new Date().toISOString().split('T')[0],
                    paymentMethod: item.paymentMethod || item['Payment Method'] || 'cash',
                    invoiceNumber: (item.invoiceNumber || item['Invoice Number'] || '').trim() || undefined,
                    customerName: (item.customerName || item['Customer Name'] || '').trim() || undefined,
                    customerPhone: (item.customerPhone || item['Customer Phone'] || '').trim() || undefined,
                    notes: (item.notes || item.Notes || '').trim() || undefined,
                    status: item.status || item.Status || 'pending',
                  };

                  await createIncome(payload).unwrap();
                  successCount++;
                } catch (err: any) {
                  console.error('Failed to import income:', item, err);
                  errorCount++;
                }
              }

              if (successCount > 0) {
                toast.success(`Successfully imported ${successCount} income entries`);
                await refetch();
              }
              if (errorCount > 0) {
                toast.error(`Failed to import ${errorCount} income entries`);
              }
            }}
            columns={[
              { key: 'title', label: 'Title', required: true, type: 'string' },
              { key: 'amount', label: 'Amount', required: true, type: 'number' },
              { key: 'category', label: 'Category', required: true, type: 'string' },
              { key: 'date', label: 'Date', required: true, type: 'date' },
              { key: 'paymentMethod', label: 'Payment Method', required: true, type: 'string' },
              { key: 'description', label: 'Description', type: 'string' },
              { key: 'customerName', label: 'Customer Name', type: 'string' },
              { key: 'customerPhone', label: 'Customer Phone', type: 'string' },
              { key: 'invoiceNumber', label: 'Invoice Number', type: 'string' },
            ]}
            filename="incomes-import-template"
            variant="secondary"
          />
          <Button onClick={() => setIsCreateModalOpen(true)} className="w-full sm:w-auto text-sm sm:text-base">
            <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Add Income
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Entries</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate">
                  {stats.total.toLocaleString()}
                </p>
              </div>
              <ReceiptPercentIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Amount</p>
                <p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-green-600 truncate">
                  {formatCurrency(stats.totalAmount)}
                </p>
              </div>
              <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">This Month</p>
                <p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-indigo-600 truncate">
                  {formatCurrency(stats.thisMonth)}
                </p>
              </div>
              <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-indigo-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Pending Receipt</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-yellow-600 truncate">
                  {stats.pending.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1 truncate">{formatCurrency(stats.pendingAmount)}</p>
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
                placeholder="Search incomes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...INCOME_CATEGORIES,
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

      {/* Table */}
      {!!error && (
        <div className="p-4 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
          Failed to load income entries. Please try again.
        </div>
      )}

      {!error && (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={data?.incomes || []}
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
              exportFilename="incomes"
              emptyMessage="No incomes found."
            />
          </CardContent>
        </Card>
      )}

      {/* CREATE MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Record New Income"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title*</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1"
              placeholder="e.g. Catering service wedding party"
            />
            {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount*</label>
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="mt-1"
                placeholder="0.00"
              />
              {formErrors.amount && <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category*</label>
              <Select
                options={INCOME_CATEGORIES}
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val as any })}
                className="mt-1"
              />
              {formErrors.category && <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date*</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1"
              />
              {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method*</label>
              <Select
                options={dynamicPaymentMethods}
                value={formData.paymentMethod}
                onChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                className="mt-1"
              />
              {formErrors.paymentMethod && <p className="text-red-500 text-xs mt-1">{formErrors.paymentMethod}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name</label>
              <Input
                value={formData.customerName || ''}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="mt-1"
                placeholder="e.g. John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Phone</label>
              <Input
                value={formData.customerPhone || ''}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                className="mt-1"
                placeholder="e.g. +8801700000000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice/Ref Number</label>
              <Input
                value={formData.invoiceNumber || ''}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="mt-1"
                placeholder="e.g. INV-9908"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Initial Status</label>
              <Select
                options={[
                  { value: 'pending', label: 'Pending Receipt' },
                  { value: 'received', label: 'Received' },
                ]}
                value={formData.status || 'pending'}
                onChange={(val) => setFormData({ ...formData, status: val as any })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <Input
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1"
              placeholder="e.g. Booking fee for grand banquet hall"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Internal Notes</label>
            <Input
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1"
              placeholder="e.g. Cash received by shift manager"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>Save Income Entry</Button>
          </div>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Income Details"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title*</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1"
            />
            {formErrors.title && <p className="text-red-500 text-xs mt-1">{formErrors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount*</label>
              <Input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="mt-1"
              />
              {formErrors.amount && <p className="text-red-500 text-xs mt-1">{formErrors.amount}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category*</label>
              <Select
                options={INCOME_CATEGORIES}
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val as any })}
                className="mt-1"
              />
              {formErrors.category && <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date*</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-1"
              />
              {formErrors.date && <p className="text-red-500 text-xs mt-1">{formErrors.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method*</label>
              <Select
                options={dynamicPaymentMethods}
                value={formData.paymentMethod}
                onChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                className="mt-1"
              />
              {formErrors.paymentMethod && <p className="text-red-500 text-xs mt-1">{formErrors.paymentMethod}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Name</label>
              <Input
                value={formData.customerName || ''}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Customer Phone</label>
              <Input
                value={formData.customerPhone || ''}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Invoice/Ref Number</label>
              <Input
                value={formData.invoiceNumber || ''}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
              <Select
                options={[
                  { value: 'pending', label: 'Pending Receipt' },
                  { value: 'received', label: 'Received' },
                ]}
                value={formData.status || 'pending'}
                onChange={(val) => setFormData({ ...formData, status: val as any })}
                className="mt-1"
                disabled={selectedIncome?.status === 'received'} // Don't allow changing back from received
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <Input
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Internal Notes</label>
            <Input
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* VIEW DETAILS MODAL */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          resetForm();
        }}
        title="Income Details"
      >
        {selectedIncome && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Income Number</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedIncome.incomeNumber || 'N/A'}
                </p>
              </div>
              <div>{getStatusBadge(selectedIncome.status)}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Title</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedIncome.title}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Amount</p>
                <p className="font-semibold text-green-600">{formatCurrency(selectedIncome.amount)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {getCategoryLabel(selectedIncome.category)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payment Method</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {getPaymentMethodLabel(selectedIncome.paymentMethod)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Transaction Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {new Date(selectedIncome.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Invoice/Ref No.</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedIncome.invoiceNumber || 'None'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Customer Name</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedIncome.customerName || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Customer Phone</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedIncome.customerPhone || 'N/A'}
                </p>
              </div>
            </div>

            {selectedIncome.description && (
              <div>
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {selectedIncome.description}
                </p>
              </div>
            )}

            {selectedIncome.notes && (
              <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-500">Internal Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{selectedIncome.notes}</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs text-gray-400">
              <p>Recorded by: {selectedIncome.createdByUser?.name || 'System'}</p>
              {selectedIncome.receivedByUser && (
                <p>Received by: {selectedIncome.receivedByUser.name}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {selectedIncome.status === 'pending' && (
                <Button
                  onClick={async () => {
                    await handleMarkAsReceived(selectedIncome);
                    setIsViewModalOpen(false);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Mark as Received
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  resetForm();
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
