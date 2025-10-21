'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { CreateExpenseRequest, Expense, useCreateExpenseMutation, useDeleteExpenseMutation, useGetExpensesQuery, useUpdateExpenseMutation } from '@/lib/api/endpoints/expensesApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  ReceiptRefundIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

const EXPENSE_CATEGORIES = [
  'Food & Beverages',
  'Supplies',
  'Utilities',
  'Rent',
  'Marketing',
  'Maintenance',
  'Equipment',
  'Salaries',
  'Insurance',
  'Taxes',
  'Transportation',
  'Miscellaneous',
];

export default function ExpensesPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data, isLoading, refetch } = useGetExpensesQuery({
    branchId: user?.branchId || undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
    search: searchQuery || undefined,
    page: currentPage,
    limit: itemsPerPage,
  });

  const [createExpense] = useCreateExpenseMutation();
  const [updateExpense] = useUpdateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();

  const [formData, setFormData] = useState<CreateExpenseRequest>({
    title: '',
    description: '',
    amount: 0,
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: 0,
      category: 'other',
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
    });
    setSelectedExpense(null);
  };

  const handleCreate = async () => {
    if (!formData.description || !formData.category || formData.amount <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await createExpense(formData).unwrap();
      toast.success('Expense created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create expense');
    }
  };

  const handleEdit = async () => {
    if (!selectedExpense) return;

    try {
      await updateExpense({
        id: selectedExpense.id,
        ...formData,
      }).unwrap();
      toast.success('Expense updated successfully');
      setIsEditModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update expense');
    }
  };

  const handleDelete = async (expense: Expense) => {
    if (!confirm(`Are you sure you want to delete this expense: "${expense.description}"?`)) return;

    try {
      await deleteExpense(expense.id).unwrap();
      toast.success('Expense deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete expense');
    }
  };

  const openEditModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      title: expense.title || '',
      description: expense.description || '',
      amount: expense.amount,
      category: expense.category,
      date: expense.date.split('T')[0],
      paymentMethod: expense.paymentMethod || 'cash',
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsViewModalOpen(true);
  };

  const getCategoryBadge = (category: string) => {
    const colors = {
      'Food & Beverages': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      'Supplies': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      'Utilities': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      'Rent': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      'Marketing': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
      'Maintenance': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      'Equipment': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      'Salaries': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      'Insurance': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
      'Taxes': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      'Transportation': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      'Miscellaneous': 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  };

  const columns = [
    {
      key: 'description',
      title: 'Description',
      sortable: true,
      render: (value: string, row: Expense) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <ReceiptRefundIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{row.category}</p>
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
      key: 'userId',
      title: 'Recorded By',
      render: (value: string, row: Expense) => (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            User {(row as any).userId?.slice(-6) || 'N/A'}
          </span>
        </div>
      ),
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row)}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    total: data?.total || 0,
    totalAmount: data?.expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0,
    thisMonth: data?.expenses?.filter(e => {
      const expenseDate = new Date(e.date);
      const now = new Date();
      return expenseDate.getMonth() === now.getMonth() && expenseDate.getFullYear() === now.getFullYear();
    }).reduce((sum, expense) => sum + expense.amount, 0) || 0,
    categories: EXPENSE_CATEGORIES.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expense Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage business expenses
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <ReceiptRefundIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">This Month</p>
                <p className="text-3xl font-bold text-orange-600">{formatCurrency(stats.thisMonth)}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
                <p className="text-3xl font-bold text-purple-600">{stats.categories}</p>
              </div>
              <ReceiptRefundIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Categories' },
                  ...EXPENSE_CATEGORIES.map(cat => ({ value: cat, label: cat })),
                ]}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="Filter by category"
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                placeholder="Start Date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-32"
              />
              <Input
                type="date"
                placeholder="End Date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-32"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
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
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} expenses as ${format}`);
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
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g., Office supplies, Marketing materials"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <Select
            label="Category"
            options={EXPENSE_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value as any })}
            placeholder="Select expense category"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate}>
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
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <Input
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <Select
            label="Category"
            options={EXPENSE_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value as any })}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit}>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <span className="text-gray-600 dark:text-gray-400">Recorded By:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      User {(selectedExpense as any).userId?.slice(-6) || 'N/A'}
                    </span>
                  </div>
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
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedExpense(null);
                }}
              >
                Close
              </Button>
              <Button onClick={() => {
                setIsViewModalOpen(false);
                openEditModal(selectedExpense);
              }}>
                Edit Expense
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}