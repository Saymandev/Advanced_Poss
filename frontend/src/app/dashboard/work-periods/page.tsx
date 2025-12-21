'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ImportButton } from '@/components/ui/ImportButton';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useEndWorkPeriodMutation, useGetCurrentWorkPeriodQuery, useGetWorkPeriodActivitiesQuery, useGetWorkPeriodByIdQuery, useGetWorkPeriodSalesSummaryQuery, useGetWorkPeriodsQuery, useStartWorkPeriodMutation, WorkPeriod } from '@/lib/api/endpoints/workPeriodsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
    ArrowDownTrayIcon,
    ClockIcon,
    CurrencyDollarIcon,
    EyeIcon,
    PaperAirplaneIcon,
    PlayIcon,
    PrinterIcon,
    StopIcon,
    UserIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
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

  const { data: workPeriodsData, isLoading, refetch } = useGetWorkPeriodsQuery({
    branchId: user?.branchId || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    page: 1,
    limit: 1000, // Get all for client-side filtering
  });

  const { data: activePeriod, refetch: refetchActive } = useGetCurrentWorkPeriodQuery();

  // Client-side filtering
  const filteredWorkPeriods = useMemo(() => {
    if (!workPeriodsData?.workPeriods) return [];
    
    let filtered = [...workPeriodsData.workPeriods];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((wp) => {
        const serial = wp.serial?.toString() || '';
        const startedBy = typeof wp.startedBy === 'object' && wp.startedBy !== null && 'firstName' in wp.startedBy
          ? `${(wp.startedBy as any).firstName || ''} ${(wp.startedBy as any).lastName || ''}`.toLowerCase()
          : typeof wp.startedBy === 'string' ? wp.startedBy.toLowerCase() : '';
        return serial.includes(query) || startedBy.includes(query);
      });
    }

    // Date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((wp) => {
        const wpDate = new Date(wp.startTime);
        wpDate.setHours(0, 0, 0, 0);
        return wpDate >= startDate;
      });
    }

    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((wp) => {
        const wpDate = new Date(wp.startTime);
        return wpDate <= endDate;
      });
    }

    return filtered;
  }, [workPeriodsData?.workPeriods, searchQuery, dateRange]);

  // Pagination
  const paginatedWorkPeriods = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWorkPeriods.slice(start, start + itemsPerPage);
  }, [filteredWorkPeriods, currentPage, itemsPerPage]);

  const data = {
    workPeriods: paginatedWorkPeriods,
    total: filteredWorkPeriods.length,
  };

  const [startWorkPeriod] = useStartWorkPeriodMutation();
  const [endWorkPeriod] = useEndWorkPeriodMutation();

  const [openFormData, setOpenFormData] = useState({
    openingBalance: 0,
    pin: '',
  });

  const [closeFormData, setCloseFormData] = useState({
    actualClosingBalance: 0,
    note: '',
    pin: '',
  });

  const resetForms = () => {
    setOpenFormData({
      openingBalance: 0,
      pin: '',
    });
    setCloseFormData({
      actualClosingBalance: 0,
      note: '',
      pin: '',
    });
    setSelectedWorkPeriod(null);
  };

  const handleOpen = async () => {
    if (!openFormData.openingBalance || openFormData.openingBalance < 0) {
      toast.error('Opening balance is required and must be positive');
      return;
    }

    if (!openFormData.pin || openFormData.pin.length < 4 || openFormData.pin.length > 6) {
      toast.error('PIN must be 4-6 digits');
      return;
    }

    try {
      await startWorkPeriod({
        openingBalance: openFormData.openingBalance,
        pin: openFormData.pin,
      }).unwrap();
      toast.success('Work period opened successfully');
      setIsOpenModalOpen(false);
      resetForms();
      refetch();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to open work period';
      if (errorMessage.includes('already an active work period')) {
        toast.error(errorMessage, { duration: 5000 });
        // Refetch to show the active period
        refetch();
        refetchActive();
      } else if (errorMessage.includes('Invalid PIN')) {
        toast.error('Invalid PIN. Please enter your login PIN.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleClose = async () => {
    if (!selectedWorkPeriod) return;

    if (!closeFormData.actualClosingBalance || closeFormData.actualClosingBalance < 0) {
      toast.error('Closing balance is required and must be positive');
      return;
    }

    if (!closeFormData.pin || closeFormData.pin.length < 4 || closeFormData.pin.length > 6) {
      toast.error('PIN must be 4-6 digits');
      return;
    }

    try {
      await endWorkPeriod({
        id: selectedWorkPeriod.id,
        actualClosingBalance: closeFormData.actualClosingBalance,
        note: closeFormData.note || undefined,
        pin: closeFormData.pin,
      }).unwrap();
      toast.success('Work period closed successfully');
      setIsCloseModalOpen(false);
      resetForms();
      // Refetch both work periods list and active period
      refetch();
      refetchActive();
    } catch (error: any) {
      const errorMessage = error?.data?.message || error?.message || 'Failed to close work period';
      if (errorMessage.includes('Invalid PIN')) {
        toast.error('Invalid PIN. Please enter your login PIN.');
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const openViewModal = (workPeriod: WorkPeriod) => {
    setSelectedWorkPeriod(workPeriod);
    setIsViewModalOpen(true);
  };

  // Fetch sales summary when viewing a work period
  const { data: salesSummary, isLoading: isLoadingSalesSummary } = useGetWorkPeriodSalesSummaryQuery(
    selectedWorkPeriod?.id || '',
    { skip: !selectedWorkPeriod || !isViewModalOpen }
  );

  // Fetch full work period details when viewing
  const { data: fullWorkPeriod } = useGetWorkPeriodByIdQuery(
    selectedWorkPeriod?.id || '',
    { skip: !selectedWorkPeriod || !isViewModalOpen }
  );

  // Fetch activities when viewing a work period
  const { data: activitiesData } = useGetWorkPeriodActivitiesQuery(
    selectedWorkPeriod?.id || '',
    { skip: !selectedWorkPeriod || !isViewModalOpen }
  );

  // Removed unused getStatusBadge function

  // Live duration counter for active periods
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (startTime: string, endTime?: string, duration?: string) => {
    if (duration) return duration;
    if (!endTime) {
      // Calculate live duration for active periods
      const start = new Date(startTime);
      const diff = currentTime.getTime() - start.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diff = end.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const columns = [
    {
      key: 'serial',
      title: 'Serial',
      sortable: true,
      render: (value: number) => (
        <span className="font-semibold text-gray-900 dark:text-white">
          #{value}
        </span>
      ),
    },
    {
      key: 'startTime',
      title: 'Start Time',
      sortable: true,
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
      key: 'startedBy',
      title: 'Started By',
      render: (value: any) => {
        const startedBy = typeof value === 'object' && value !== null && 'firstName' in value
          ? `${(value as any).firstName || ''} ${(value as any).lastName || ''}`.trim() || 'Unknown'
          : typeof value === 'string' ? value.slice(-6) : 'N/A';
        return (
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {startedBy}
            </span>
          </div>
        );
      },
    },
    {
      key: 'endTime',
      title: 'End Time',
      render: (value: string) => (
        <div className="flex items-center gap-2">
          <ClockIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value ? formatDateTime(value) : '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'endedBy',
      title: 'Ended By',
      render: (value: any, row: WorkPeriod) => {
        if (!row.endTime) return <span className="text-gray-400">-</span>;
        const endedBy = typeof value === 'object' && value !== null && 'firstName' in value
          ? `${(value as any).firstName || ''} ${(value as any).lastName || ''}`.trim() || 'Unknown'
          : typeof value === 'string' ? value.slice(-6) : 'N/A';
        return (
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {endedBy}
            </span>
          </div>
        );
      },
    },
    {
      key: 'duration',
      title: 'Duration',
      render: (value: any, row: WorkPeriod) => {
        const duration = formatDuration(row.startTime, row.endTime, row.duration || fullWorkPeriod?.duration);
        const isActive = row.status === 'active' && !row.endTime;
        return (
          <div className="flex items-center gap-2">
            <ClockIcon className={`w-4 h-4 ${isActive ? 'text-blue-500 animate-pulse' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>
              {duration}
            </span>
          </div>
        );
      },
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
            title="View Details"
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          {row.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedWorkPeriod(row);
                setIsCloseModalOpen(true);
              }}
              className="text-red-600 hover:text-red-700"
              title="End Period"
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
    open: data?.workPeriods?.filter(wp => wp.status === 'active').length || 0,
    closed: data?.workPeriods?.filter(wp => wp.status === 'completed').length || 0,
  };

  // Use active period from query or find in list - only if it's a valid object with an id and status is active
  const currentOpenPeriod = useMemo(() => {
    // Check if activePeriod is valid and has required fields
    if (activePeriod && activePeriod.id && activePeriod.status === 'active') {
      return activePeriod;
    }
    // Fallback to finding in the list
    const found = filteredWorkPeriods.find(wp => wp.status === 'active' && wp.id);
    return found || null;
  }, [activePeriod, filteredWorkPeriods]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Work Periods</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage cash flow and work period tracking
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <ImportButton
            onImport={async (data, _result) => {
              let successCount = 0;
              let errorCount = 0;

              for (const item of data) {
                try {
                  // Import historical work periods (started and closed)
                  // Note: Work periods are typically started/ended through the UI
                  // This import is for historical data entry
                  const _openingBalance = parseFloat(item.openingBalance || item['Opening Balance'] || 0);
                  const _startTime = item.startTime || item['Start Time'] || new Date().toISOString();
                  
                  toast.success('Work periods are typically managed through the UI. Import functionality is for reference only.');
                  successCount++;
                } catch (error: any) {
                  console.error('Failed to import work period:', item, error);
                  errorCount++;
                }
              }

              if (successCount > 0) {
                toast.success(`Processed ${successCount} work period records`);
                await refetch();
              }
              if (errorCount > 0) {
                toast.error(`Failed to process ${errorCount} work period records`);
              }
            }}
            columns={[
              { key: 'startTime', label: 'Start Time', required: true, type: 'date' },
              { key: 'openingBalance', label: 'Opening Balance', required: true, type: 'number' },
            ]}
            filename="work-periods-import-template"
            variant="secondary"
          />
          {!currentOpenPeriod && (
            <Button onClick={() => setIsOpenModalOpen(true)} className="w-full sm:w-auto text-sm sm:text-base">
              <PlayIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Open Work Period
            </Button>
          )}
        </div>
      </div>

      {/* Current Work Period Alert */}
      {currentOpenPeriod && currentOpenPeriod.id && currentOpenPeriod.status === 'active' && (
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
                    Started: {formatDateTime(currentOpenPeriod.startTime)} • Opening Balance: {formatCurrency(currentOpenPeriod.openingBalance || 0)}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSelectedWorkPeriod(currentOpenPeriod);
                  setIsCloseModalOpen(true);
                }}
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto text-sm sm:text-base"
              >
                <StopIcon className="w-4 h-4 mr-2" />
                Close Period
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Periods</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white truncate" title={stats.total.toString()}>
                  {stats.total.toLocaleString()}
                </p>
              </div>
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Open</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600 truncate" title={stats.open.toString()}>
                  {stats.open.toLocaleString()}
                </p>
              </div>
              <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Closed</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-600 truncate" title={stats.closed.toString()}>
                  {stats.closed.toLocaleString()}
                </p>
              </div>
              <StopIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-gray-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Active Periods</p>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-green-600 truncate" title={stats.open.toString()}>
                  {stats.open.toLocaleString()}
                </p>
              </div>
              <PlayIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Amount</p>
                <p className="text-sm sm:text-base md:text-lg lg:text-2xl font-bold text-purple-600 truncate" title={formatCurrency(data?.workPeriods?.reduce((sum, wp) => sum + (wp.openingBalance || 0), 0) || 0)}>
                  {formatCurrency(data?.workPeriods?.reduce((sum, wp) => sum + (wp.openingBalance || 0), 0) || 0)}
                </p>
              </div>
              <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600 flex-shrink-0" />
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
                placeholder="Search work periods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'completed', label: 'Completed' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Filter by status"
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

      {/* Work Periods Table */}
      <DataTable
        data={paginatedWorkPeriods}
        columns={columns}
        loading={isLoading}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil(filteredWorkPeriods.length / itemsPerPage),
          itemsPerPage,
          totalItems: filteredWorkPeriods.length,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="work-periods"
        onExport={(_format, _items) => {
          // Export is handled automatically by ExportButton component
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
            <h4 className="font-medium text-blue-800 dark:text-blue-400 mb-2">Opening Balance</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Enter the amount of cash you're starting with for this work period.
            </p>
          </div>

          <Input
            label="Opening Balance *"
            type="number"
            step="0.01"
            value={openFormData.openingBalance}
            onChange={(e) => setOpenFormData({ ...openFormData, openingBalance: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            required
          />

          <Input
            label="PIN *"
            type="password"
            value={openFormData.pin}
            onChange={(e) => setOpenFormData({ ...openFormData, pin: e.target.value.replace(/\D/g, '') })}
            placeholder="Enter your PIN (4-6 digits)"
            minLength={4}
            maxLength={6}
            required
          />

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsOpenModalOpen(false);
                resetForms();
              }}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button onClick={handleOpen} className="w-full sm:w-auto text-sm sm:text-base">
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
                  <span className="text-gray-600 dark:text-gray-400">Opening Balance:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(selectedWorkPeriod.openingBalance)}
                  </span>
                </div>
                {selectedWorkPeriod.closingBalance && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Closing Balance:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(selectedWorkPeriod.closingBalance)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Input
            label="Actual Closing Balance *"
            type="number"
            step="0.01"
            value={closeFormData.actualClosingBalance}
            onChange={(e) => setCloseFormData({ ...closeFormData, actualClosingBalance: parseFloat(e.target.value) || 0 })}
            placeholder="0.00"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note (Optional)
            </label>
            <textarea
              value={closeFormData.note}
              onChange={(e) => setCloseFormData({ ...closeFormData, note: e.target.value })}
              placeholder="Add any notes about closing the period..."
              rows={3}
              className="input"
            />
          </div>

          <Input
            label="PIN *"
            type="password"
            value={closeFormData.pin}
            onChange={(e) => setCloseFormData({ ...closeFormData, pin: e.target.value.replace(/\D/g, '') })}
            placeholder="Enter your PIN (4-6 digits)"
            minLength={4}
            maxLength={6}
            required
          />

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCloseModalOpen(false);
                resetForms();
              }}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Cancel
            </Button>
            <Button onClick={handleClose} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto text-sm sm:text-base">
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
        title="Work Period Details"
        className="max-w-6xl"
      >
        {selectedWorkPeriod && (
          <div className="space-y-6">
            {/* Header with Serial and Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Serial #{selectedWorkPeriod.serial}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Work Period Range
                </p>
                <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                  {formatDateTime(selectedWorkPeriod.startTime)} - {selectedWorkPeriod.endTime ? formatDateTime(selectedWorkPeriod.endTime) : 'Ongoing'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // Print functionality
                    window.print();
                  }}
                  className="flex items-center gap-2"
                >
                  <PrinterIcon className="w-4 h-4" />
                  Print
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // Download functionality
                    toast('Download feature coming soon');
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    // Send Email functionality
                    toast('Send email feature coming soon');
                  }}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  Send Email
                </Button>
              </div>
            </div>

            {/* Duration Display */}
            <div className="flex items-center gap-2 text-sm">
              <ClockIcon className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Duration:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {fullWorkPeriod?.duration || (selectedWorkPeriod.endTime
                  ? formatDuration(selectedWorkPeriod.startTime, selectedWorkPeriod.endTime)
                  : formatDuration(selectedWorkPeriod.startTime))}
              </span>
            </div>

            {/* Summary Section */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 sm:p-4">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Summary</h4>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Opening Balance:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(selectedWorkPeriod.openingBalance || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Expected Closing Balance:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {isLoadingSalesSummary ? (
                      <span>Loading...</span>
                    ) : (
                      formatCurrency((selectedWorkPeriod.openingBalance || 0) + (salesSummary?.grossSales || 0))
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Actual Closing Balance:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(selectedWorkPeriod.closingBalance || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Difference:</span>
                  <p className={`font-semibold ${
                    (selectedWorkPeriod.closingBalance || 0) - ((selectedWorkPeriod.openingBalance || 0) + (salesSummary?.grossSales || 0)) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {isLoadingSalesSummary ? (
                      <span>Loading...</span>
                    ) : (
                      formatCurrency((selectedWorkPeriod.closingBalance || 0) - ((selectedWorkPeriod.openingBalance || 0) + (salesSummary?.grossSales || 0)))
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Void Count:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {salesSummary?.voidCount || 0}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Cancel Count:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {salesSummary?.cancelCount || 0}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Notes:</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {closeFormData.note || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Report Section: Sales Summary and Payment Methods */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Sales Summary Table */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Sales Summary</h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Metric</th>
                        <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Total Orders</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          {isLoadingSalesSummary ? 'Loading...' : (salesSummary?.totalOrders || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Gross Sales</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                          {isLoadingSalesSummary ? 'Loading...' : formatCurrency(salesSummary?.grossSales || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Methods Table */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Payment Methods</h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Type</th>
                        <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Percentage</th>
                        <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Count</th>
                        <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Amount</th>
                        <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">Commission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {isLoadingSalesSummary ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                            Loading...
                          </td>
                        </tr>
                      ) : salesSummary?.paymentMethods && salesSummary.paymentMethods.length > 0 ? (
                        salesSummary.paymentMethods.map((method: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">{method.type}</td>
                            <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{method.percentage}%</td>
                            <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">{method.count}</td>
                            <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(method.amount)}
                            </td>
                            <td className="px-4 py-2 text-right text-gray-600 dark:text-gray-400">
                              {formatCurrency(parseFloat(method.commission))}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-4 py-2 text-center text-gray-600 dark:text-gray-400">
                            No payment methods found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Opening Balance</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate" title={formatCurrency(selectedWorkPeriod.openingBalance || 0)}>
                    {formatCurrency(selectedWorkPeriod.openingBalance || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total Sales</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-green-600 truncate" title={isLoadingSalesSummary ? 'Loading...' : formatCurrency(salesSummary?.grossSales || 0)}>
                    {isLoadingSalesSummary ? (
                      <span className="text-xs sm:text-sm">Loading...</span>
                    ) : (
                      formatCurrency(salesSummary?.grossSales || 0)
                    )}
                  </p>
                  {salesSummary && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {salesSummary.totalOrders || 0} orders
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Closing Balance</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-blue-600 truncate" title={formatCurrency(selectedWorkPeriod.closingBalance || 0)}>
                    {formatCurrency(selectedWorkPeriod.closingBalance || 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Expected Closing</p>
                  <p className={`text-base sm:text-lg md:text-xl font-bold truncate ${
                    (salesSummary?.grossSales || 0) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`} title={isLoadingSalesSummary ? 'Loading...' : formatCurrency((selectedWorkPeriod.openingBalance || 0) + (salesSummary?.grossSales || 0))}>
                    {isLoadingSalesSummary ? (
                      <span className="text-xs sm:text-sm">Loading...</span>
                    ) : (
                      formatCurrency((selectedWorkPeriod.openingBalance || 0) + (salesSummary?.grossSales || 0))
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                      {fullWorkPeriod?.startedBy && typeof fullWorkPeriod.startedBy === 'object' && 'firstName' in fullWorkPeriod.startedBy
                        ? `${(fullWorkPeriod.startedBy as any).firstName || ''} ${(fullWorkPeriod.startedBy as any).lastName || ''}`.trim() || 'Unknown'
                        : typeof selectedWorkPeriod.startedBy === 'string' ? selectedWorkPeriod.startedBy.slice(-6) : 'Unknown'}
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
                      {fullWorkPeriod?.endedBy && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Ended By:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {typeof fullWorkPeriod.endedBy === 'object' && 'firstName' in fullWorkPeriod.endedBy
                              ? `${(fullWorkPeriod.endedBy as any).firstName || ''} ${(fullWorkPeriod.endedBy as any).lastName || ''}`.trim() || 'Unknown'
                              : 'Unknown'}
                          </span>
                        </div>
                      )}
                      {selectedWorkPeriod.closingBalance && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Closing Balance:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(selectedWorkPeriod.closingBalance)}
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
                      {isLoadingSalesSummary ? (
                        <span>Loading...</span>
                      ) : (
                        formatCurrency(
                          (selectedWorkPeriod.openingBalance || 0) + (salesSummary?.grossSales || 0)
                        )
                      )}
                    </span>
                  </div>
                  {selectedWorkPeriod.closingBalance && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Actual Cash:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(selectedWorkPeriod.closingBalance)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Variance:</span>
                        <span className={`font-medium ${
                          (selectedWorkPeriod.closingBalance - ((selectedWorkPeriod.openingBalance || 0) + (salesSummary?.grossSales || 0))) >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {isLoadingSalesSummary ? (
                            <span>Loading...</span>
                          ) : (
                            formatCurrency(
                              selectedWorkPeriod.closingBalance - ((selectedWorkPeriod.openingBalance || 0) + (salesSummary?.grossSales || 0))
                            )
                          )}
                        </span>
                      </div>
                    </>
                  )}
                  {salesSummary && (
                    <>
                      <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(salesSummary.subtotal || 0)}
                        </span>
                      </div>
                      {salesSummary.vatTotal > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">VAT:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(salesSummary.vatTotal || 0)}
                          </span>
                        </div>
                      )}
                      {salesSummary.serviceCharge > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Service Charge:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(salesSummary.serviceCharge || 0)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Orders Created During Period */}
            {salesSummary && salesSummary.orders && salesSummary.orders.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Orders Created ({salesSummary.totalOrders})
                </h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Order #</th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Type</th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Amount</th>
                          <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {salesSummary.orders.map((order: any) => (
                          <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-4 py-2 text-gray-900 dark:text-white">{order.orderNumber}</td>
                            <td className="px-4 py-2">
                              <Badge variant="secondary" className="capitalize">
                                {order.orderType || 'N/A'}
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-gray-900 dark:text-white font-medium">
                              {formatCurrency(order.totalAmount || 0)}
                            </td>
                            <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                              {order.createdAt ? formatDateTime(order.createdAt) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Activities During Period */}
            {activitiesData && activitiesData.activities && activitiesData.activities.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Activities ({activitiesData.totalActivities})
                </h4>
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {activitiesData.activities.map((activity: any, index: number) => (
                        <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {activity.description}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatDateTime(activity.timestamp)}
                              </p>
                            </div>
                            <Badge variant="secondary" className="capitalize">
                              {activity.type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedWorkPeriod(null);
                }}
                className="w-full sm:w-auto text-sm sm:text-base"
              >
                Close
              </Button>
              {selectedWorkPeriod.status === 'active' && (
                <Button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setIsCloseModalOpen(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 w-full sm:w-auto text-sm sm:text-base"
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