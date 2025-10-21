'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { CreateWorkPeriodRequest, useEndWorkPeriodMutation, useGetWorkPeriodsQuery, useStartWorkPeriodMutation, WorkPeriod } from '@/lib/api/endpoints/workPeriodsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PlayIcon,
  StopIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function WorkPeriodsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedWorkPeriod, setSelectedWorkPeriod] = useState<WorkPeriod | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const { data, isLoading, refetch } = useGetWorkPeriodsQuery({
    branchId: user?.branchId,
    status: statusFilter === 'all' ? undefined : statusFilter,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
    search: searchQuery || undefined,
    page: currentPage,
    limit: itemsPerPage,
  });

  const [startWorkPeriod] = useStartWorkPeriodMutation();
  const [endWorkPeriod] = useEndWorkPeriodMutation();

  const [openFormData, setOpenFormData] = useState<CreateWorkPeriodRequest>({
    name: '',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    branchId: user?.branchId || '',
  });

  const [closeFormData, setCloseFormData] = useState({
    endCash: 0,
  });

  const resetForms = () => {
    setOpenFormData({
      name: '',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      branchId: user?.branchId || '',
    });
    setCloseFormData({
      endCash: 0,
    });
    setSelectedWorkPeriod(null);
  };

  const handleOpen = async () => {
    if (!openFormData.name.trim()) {
      toast.error('Work period name is required');
      return;
    }

    try {
      await startWorkPeriod(openFormData as any).unwrap();
      toast.success('Work period opened successfully');
      setIsOpenModalOpen(false);
      resetForms();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to open work period');
    }
  };

  const handleClose = async () => {
    if (!selectedWorkPeriod) return;

    if (closeFormData.endCash < 0) {
      toast.error('Ending cash cannot be negative');
      return;
    }

    try {
      await endWorkPeriod(selectedWorkPeriod.id).unwrap();
      toast.success('Work period closed successfully');
      setIsCloseModalOpen(false);
      resetForms();
      refetch();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to close work period');
    }
  };

  const openViewModal = (workPeriod: WorkPeriod) => {
    setSelectedWorkPeriod(workPeriod);
    setIsViewModalOpen(true);
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? <Badge variant="success">Active</Badge>
      : <Badge variant="secondary">Inactive</Badge>;
  };

  const columns = [
    {
      key: 'startTime',
      title: 'Start Time',
      sortable: true,
      render: (value: string, row: WorkPeriod) => (
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatDateTime(value)}
          </span>
        </div>
      ),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (value: boolean) => getStatusBadge(value),
    },
    {
      key: 'createdBy',
      title: 'Created By',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            User {value.slice(-6)}
          </span>
        </div>
      ),
    },
    {
      key: 'endTime',
      title: 'End Time',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value ? formatDateTime(value) : 'Ongoing'}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatDateTime(value)}
          </span>
        </div>
      ),
    },
    {
      key: 'totalExpenses',
      title: 'Total Expenses',
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
      key: 'userId',
      title: 'Opened By',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            User {value.slice(-6)}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: WorkPeriod) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          {(row as any).status === 'open' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedWorkPeriod(row);
                setIsCloseModalOpen(true);
              }}
              className="text-red-600 hover:text-red-700"
            >
              <StopIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const stats = {
    total: data?.total || 0,
    open: data?.workPeriods?.filter(wp => (wp as any).status === 'open').length || 0,
    closed: data?.workPeriods?.filter(wp => (wp as any).status === 'closed').length || 0,
    totalSales: data?.workPeriods?.reduce((sum, wp) => sum + ((wp as any).totalSales || 0), 0) || 0,
    totalExpenses: data?.workPeriods?.reduce((sum, wp) => sum + ((wp as any).totalExpenses || 0), 0) || 0,
  };

  // Check if there's an open work period
  const currentOpenPeriod = data?.workPeriods?.find(wp => (wp as any).status === 'open');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Work Periods</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage cash flow and work period tracking
          </p>
        </div>
        {!currentOpenPeriod && (
          <Button onClick={() => setIsOpenModalOpen(true)}>
            <PlayIcon className="w-5 h-5 mr-2" />
            Open Work Period
          </Button>
        )}
      </div>

      {/* Current Work Period Alert */}
      {currentOpenPeriod && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800 dark:text-green-400">
                    Work Period Active
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Started: {formatDateTime(currentOpenPeriod.startTime)} • Starting Cash: {formatCurrency((currentOpenPeriod as any).startCash || 0)}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSelectedWorkPeriod(currentOpenPeriod);
                  setIsCloseModalOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                <StopIcon className="w-4 h-4 mr-2" />
                Close Period
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Periods</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <ClockIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Open</p>
                <p className="text-3xl font-bold text-green-600">{stats.open}</p>
              </div>
              <PlayIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Closed</p>
                <p className="text-3xl font-bold text-gray-600">{stats.closed}</p>
              </div>
              <StopIcon className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalSales)}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(stats.totalExpenses)}</p>
              </div>
              <CurrencyDollarIcon className="w-8 h-8 text-red-600" />
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
                placeholder="Search work periods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'open', label: 'Open' },
                  { value: 'closed', label: 'Closed' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
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

      {/* Work Periods Table */}
      <DataTable
        data={data?.workPeriods || []}
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
        exportFilename="work-periods"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} work periods as ${format}`);
        }}
        emptyMessage="No work periods found."
      />

      {/* Open Work Period Modal */}
      <Modal
        isOpen={isOpenModalOpen}
        onClose={() => {
          setIsOpenModalOpen(false);
          resetForms();
        }}
        title="Open Work Period"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">Starting Cash</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Enter the amount of cash you're starting with for this work period.
            </p>
          </div>

          <Input
            label="Work Period Name"
            type="text"
            value={openFormData.name}
            onChange={(e) => setOpenFormData({ ...openFormData, name: e.target.value })}
            placeholder="Enter work period name"
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsOpenModalOpen(false);
                resetForms();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleOpen}>
              Open Work Period
            </Button>
          </div>
        </div>
      </Modal>

      {/* Close Work Period Modal */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false);
          resetForms();
        }}
        title="Close Work Period"
        className="max-w-md"
      >
        <div className="space-y-4">
          {selectedWorkPeriod && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Period Summary</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Started:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatDateTime(selectedWorkPeriod.startTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Starting Cash:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency((selectedWorkPeriod as any).startCash)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Sales:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency((selectedWorkPeriod as any).totalSales)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Expenses:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency((selectedWorkPeriod as any).totalExpenses)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <Input
            label="Ending Cash Amount"
            type="number"
            step="0.01"
            value={closeFormData.endCash}
            onChange={(e) => setCloseFormData({ endCash: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            required
          />

          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              💡 Expected ending cash should be: {formatCurrency(
                ((selectedWorkPeriod as any)?.startCash || 0) + ((selectedWorkPeriod as any)?.totalSales || 0) - ((selectedWorkPeriod as any)?.totalExpenses || 0)
              )}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCloseModalOpen(false);
                resetForms();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleClose} className="bg-red-600 hover:bg-red-700">
              Close Work Period
            </Button>
          </div>
        </div>
      </Modal>

      {/* Work Period Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedWorkPeriod(null);
        }}
        title={`Work Period Details - ${selectedWorkPeriod?.id}`}
        className="max-w-4xl"
      >
        {selectedWorkPeriod && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                (selectedWorkPeriod as any).status === 'open'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <ClockIcon className={`w-8 h-8 ${
                  (selectedWorkPeriod as any).status === 'open'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Work Period {(selectedWorkPeriod as any).status === 'open' ? 'Active' : 'Closed'}
                    </h3>
                    {getStatusBadge((selectedWorkPeriod as any).status)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedWorkPeriod.endTime
                        ? `${Math.round((new Date(selectedWorkPeriod.endTime).getTime() - new Date(selectedWorkPeriod.startTime).getTime()) / (1000 * 60 * 60 * 24))} days`
                        : 'Ongoing'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Starting Cash</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency((selectedWorkPeriod as any).startCash)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Sales</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency((selectedWorkPeriod as any).totalSales)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatCurrency((selectedWorkPeriod as any).totalExpenses)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Net Cash Flow</p>
                  <p className={`text-xl font-bold ${
                    ((selectedWorkPeriod as any).totalSales - (selectedWorkPeriod as any).totalExpenses) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {formatCurrency((selectedWorkPeriod as any).totalSales - (selectedWorkPeriod as any).totalExpenses)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Period Information</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Started:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDateTime(selectedWorkPeriod.startTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Started By:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      User {(selectedWorkPeriod as any).userId.slice(-6)}
                    </span>
                  </div>
                  {selectedWorkPeriod.endTime && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Ended:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDateTime(selectedWorkPeriod.endTime)}
                        </span>
                      </div>
                      {(selectedWorkPeriod as any).endCash && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Ending Cash:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency((selectedWorkPeriod as any).endCash)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Cash Reconciliation</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Expected Cash:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(
                        (selectedWorkPeriod as any).startCash + (selectedWorkPeriod as any).totalSales - (selectedWorkPeriod as any).totalExpenses
                      )}
                    </span>
                  </div>
                  {(selectedWorkPeriod as any).endCash && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Actual Cash:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency((selectedWorkPeriod as any).endCash)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Variance:</span>
                        <span className={`font-medium ${
                          ((selectedWorkPeriod as any).endCash - ((selectedWorkPeriod as any).startCash + (selectedWorkPeriod as any).totalSales - (selectedWorkPeriod as any).totalExpenses)) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {formatCurrency(
                            (selectedWorkPeriod as any).endCash - ((selectedWorkPeriod as any).startCash + (selectedWorkPeriod as any).totalSales - (selectedWorkPeriod as any).totalExpenses)
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedWorkPeriod(null);
                }}
              >
                Close
              </Button>
              {(selectedWorkPeriod as any).status === 'open' && (
                <Button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setIsCloseModalOpen(true);
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Close Period
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}