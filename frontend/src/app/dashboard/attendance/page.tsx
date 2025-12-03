'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import {
  AttendanceRecord,
  useApproveAttendanceMutation,
  useCheckInMutation,
  useCheckOutMutation,
  useDeleteAttendanceMutation,
  useGetAttendanceRecordsQuery,
  useGetAttendanceStatsQuery,
  useGetTodayAttendanceQuery,
  useMarkAbsentMutation,
  useUpdateAttendanceMutation
} from '@/lib/api/endpoints/attendanceApi';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  UserGroupIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

// Helper to display decimal hours in a friendly "Xh Ym" format
const formatWorkedHours = (hours?: number | null) => {
  if (!hours || hours <= 0) return '';

  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

export default function AttendancePage() {
  const { user } = useAppSelector((state) => state.auth);
  
  // Redirect if user doesn't have attendance feature (auto-redirects to role-specific dashboard)
  useFeatureRedirect('attendance');
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false);
  const [isCheckOutModalOpen, setIsCheckOutModalOpen] = useState(false);
  const [_isEditModalOpen, _setIsEditModalOpen] = useState(false);
  const [_selectedRecord, _setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkOutNotes, setCheckOutNotes] = useState('');

  // Filter state for advanced queries
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageLimit = 20;

  // Check if user is owner/manager (can see all employees)
  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'super_admin';
  
  // API calls
  const { data: todayAttendance = [], isLoading: todayLoading, refetch: refetchTodayAttendance } = useGetTodayAttendanceQuery(
    user?.branchId || '',
    { skip: !user?.branchId }
  );
  const { data: attendanceStats, isLoading: statsLoading } = useGetAttendanceStatsQuery(
    user?.branchId || '',
    { skip: !user?.branchId }
  );
  // Fetch full attendance records with filters for owners/managers
  const { data: attendanceRecordsData, isLoading: recordsLoading } = useGetAttendanceRecordsQuery({
    branchId: user?.branchId || '',
    page: currentPage,
    limit: pageLimit,
    ...(statusFilter && { status: statusFilter }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(searchQuery && { search: searchQuery }),
  }, {
    skip: !isOwnerOrManager || !user?.branchId, // Skip for waiters/employees to avoid 403
  });

  const attendanceRecords = attendanceRecordsData?.records || [];
  const totalRecords = attendanceRecordsData?.total || 0;

  // Mutations
  const [checkIn, { isLoading: isCheckingIn }] = useCheckInMutation();
  const [checkOut, { isLoading: isCheckingOut }] = useCheckOutMutation();
  const [_markAbsent, { isLoading: _isMarkingAbsent }] = useMarkAbsentMutation();
  const [_updateAttendance, { isLoading: _isUpdating }] = useUpdateAttendanceMutation();
  const [approveAttendance, { isLoading: _isApproving }] = useApproveAttendanceMutation();
  const [deleteAttendance, { isLoading: _isDeleting }] = useDeleteAttendanceMutation();

  const handleCheckIn = async () => {
    try {
      await checkIn({
        branchId: user?.branchId || '',
        ...(checkInNotes?.trim() && { notes: checkInNotes.trim() }),
      }).unwrap();
      toast.success('Checked in successfully');
      setIsCheckInModalOpen(false);
      setCheckInNotes('');
      // RTK Query will automatically refetch due to invalidatesTags, but we can also manually refetch for immediate update
      refetchTodayAttendance();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut({
        ...(checkOutNotes?.trim() && { notes: checkOutNotes.trim() }),
      }).unwrap();
      toast.success('Checked out successfully');
      setIsCheckOutModalOpen(false);
      setCheckOutNotes('');
      // RTK Query will automatically refetch due to invalidatesTags, but we can also manually refetch for immediate update
      refetchTodayAttendance();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to check out');
    }
  };

  const _handleMarkAbsent = async (userId: string, reason: string) => {
    try {
      await _markAbsent({
        userId,
        date: new Date().toISOString().split('T')[0],
        reason,
      }).unwrap();
      toast.success('Marked as absent');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to mark as absent');
    }
  };

  const handleApproveAttendance = async (id: string) => {
    try {
      await approveAttendance(id).unwrap();
      toast.success('Attendance approved');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to approve attendance');
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!confirm('Are you sure you want to delete this attendance record?')) return;
    
    try {
      await deleteAttendance(id).unwrap();
      toast.success('Attendance record deleted');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete attendance record');
    }
  };

  const getStatusBadge = (status?: string | null) => {
    const variants: any = {
      present: 'success',
      absent: 'danger',
      late: 'warning',
      'half-day': 'secondary',
    };

    // Guard against undefined / null status to avoid runtime errors
    const safeStatus = status || 'unknown';

    return (
      <Badge variant={variants[safeStatus] || 'secondary'}>
        {safeStatus.toUpperCase()}
      </Badge>
    );
  };

  const _getTimeBadge = (checkIn: string, checkOut?: string) => {
    if (!checkOut) {
      return (
        <Badge variant="info">
          {new Date(checkIn).toLocaleTimeString()}
        </Badge>
      );
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const hours = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60) * 10) / 10;

    return (
      <div className="flex flex-col gap-1">
        <Badge variant="info" className="text-xs">
          {start.toLocaleTimeString()}
        </Badge>
        <Badge variant="success" className="text-xs">
          {end.toLocaleTimeString()}
        </Badge>
        <span className="text-xs text-gray-500">{hours}h</span>
      </div>
    );
  };

  const columns = [
    {
      key: 'userName',
      title: 'Employee',
      header: 'Employee',
      render: (_value: any, record: AttendanceRecord) => {
        return (
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {record.userName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {record.branchName}
            </p>
          </div>
        );
      },
    },
    {
      key: 'checkIn',
      title: 'Check In',
      header: 'Check In',
      render: (_value: any, record: AttendanceRecord) => {
        return (
          <div>
            <p className="text-sm text-gray-900 dark:text-white">
              {formatDateTime(record.checkIn)}
            </p>
            {record.notes && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Note: {record.notes}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'checkOut',
      title: 'Check Out',
      header: 'Check Out',
      render: (_value: any, record: AttendanceRecord) => {
        return (
          <div>
            {record.checkOut ? (
              <div>
                <p className="text-sm text-gray-900 dark:text-white">
                  {formatDateTime(record.checkOut)}
                </p>
                {record.totalHours && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatWorkedHours(record.totalHours)} worked
                  </p>
                )}
              </div>
            ) : (
              <Badge variant="warning">Still Working</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      title: 'Status',
      header: 'Status',
      render: (_value: any, record: AttendanceRecord) => getStatusBadge(record.status),
    },
    {
      key: 'actions',
      title: 'Actions',
      header: 'Actions',
      render: (_value: any, record: AttendanceRecord) => {
        // Only show actions for owners/managers, or if it's the user's own record
        const canManage = isOwnerOrManager || record.userId === user?.id;
        if (!canManage) return null;
        
        return (
          <div className="flex items-center gap-2">
            {!record.checkOut && record.userId === user?.id && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  _setSelectedRecord(record);
                  setIsCheckOutModalOpen(true);
                }}
                title="Check Out"
              >
                <ClockIcon className="w-4 h-4" />
              </Button>
            )}
            {isOwnerOrManager && (record as any).status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleApproveAttendance(record.id)}
                title="Approve"
              >
                <CheckCircleIcon className="w-4 h-4" />
              </Button>
            )}
            {isOwnerOrManager && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteAttendance(record.id)}
                className="text-red-600 hover:text-red-700"
                title="Delete"
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const isLoading = todayLoading || statsLoading || recordsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Attendance
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track employee attendance and working hours
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setIsCheckInModalOpen(true)}
            disabled={isCheckingIn}
          >
            <ClockIcon className="w-5 h-5 mr-2" />
            Check In
          </Button>
          <Button
            onClick={() => setIsCheckOutModalOpen(true)}
            disabled={isCheckingOut}
          >
            <ClockIcon className="w-5 h-5 mr-2" />
            Check Out
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {isOwnerOrManager && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {isLoading ? '...' : attendanceStats?.totalEmployees || 0}
                  </p>
                </div>
                <UserGroupIcon className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        )}

        {isOwnerOrManager ? (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Present Today</p>
                    <p className="text-3xl font-bold text-green-600">
                      {isLoading ? '...' : attendanceStats?.presentToday || 0}
                    </p>
                  </div>
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Absent Today</p>
                    <p className="text-3xl font-bold text-red-600">
                      {isLoading ? '...' : attendanceStats?.absentToday || 0}
                    </p>
                  </div>
                  <XCircleIcon className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Attendance Rate</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {isLoading ? '...' : `${attendanceStats?.attendanceRate || 0}%`}
                    </p>
                  </div>
                  <ClockIcon className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">My Status</p>
                    <p className="text-3xl font-bold text-green-600">
                      {todayAttendance.length > 0 ? 'Present' : 'Not Checked In'}
                    </p>
                  </div>
                  <CheckCircleIcon className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Hours Worked</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {isLoading ? '...' : todayAttendance[0]?.totalHours?.toFixed(1) || '0.0'}h
                    </p>
                  </div>
                  <ClockIcon className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Today's Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>{isOwnerOrManager ? "Today's Attendance" : "My Attendance"}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Loading attendance...</p>
            </div>
          ) : todayAttendance.length === 0 ? (
            <div className="text-center py-8">
              <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">No attendance records for today</p>
            </div>
          ) : (
            <DataTable
              data={todayAttendance}
              columns={columns}
              loading={false}
              searchable={true}
              searchPlaceholder="Search employees..."
            />
          )}
        </CardContent>
      </Card>

      {/* All Attendance Records with Advanced Filters (Owners/Managers only) */}
      {isOwnerOrManager && (
        <Card>
          <CardHeader>
            <CardTitle>All Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filter Bar */}
            <div className="mb-6 space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-4">
                <FunnelIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1); // Reset to first page when filter changes
                    }}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Status</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="half-day">Half Day</option>
                    <option value="on-leave">On Leave</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full"
                  />
                </div>

                {/* Search */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Search
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Name, ID, or notes..."
                      className="pl-10 w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Date Range Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    setStartDate(today.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                    setCurrentPage(1);
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const lastWeek = new Date(today);
                    lastWeek.setDate(today.getDate() - 7);
                    setStartDate(lastWeek.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                    setCurrentPage(1);
                  }}
                >
                  Last 7 Days
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    setStartDate(firstDay.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                    setCurrentPage(1);
                  }}
                >
                  This Month
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('');
                    setStartDate('');
                    setEndDate('');
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Attendance Records Table */}
            {recordsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Loading records...</p>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="text-center py-8">
                <UserGroupIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">No attendance records found</p>
                {(statusFilter || startDate || endDate || searchQuery) && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Try adjusting your filters
                  </p>
                )}
              </div>
            ) : (
              <>
                <DataTable
                  data={attendanceRecords}
                  columns={columns}
                  loading={false}
                  searchable={false}
                />
                
                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Showing {(currentPage - 1) * pageLimit + 1} to {Math.min(currentPage * pageLimit, totalRecords)} of {totalRecords} records
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {Math.ceil(totalRecords / pageLimit) || 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage >= Math.ceil(totalRecords / pageLimit)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Check In Modal */}
      <Modal
        isOpen={isCheckInModalOpen}
        onClose={() => {
          setIsCheckInModalOpen(false);
          setCheckInNotes('');
        }}
        title="Check In"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <Input
              value={checkInNotes}
              onChange={(e) => setCheckInNotes(e.target.value)}
              placeholder="Add any notes about your check-in..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCheckInModalOpen(false);
                setCheckInNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? 'Checking In...' : 'Check In'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Check Out Modal */}
      <Modal
        isOpen={isCheckOutModalOpen}
        onClose={() => {
          setIsCheckOutModalOpen(false);
          setCheckOutNotes('');
        }}
        title="Check Out"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <Input
              value={checkOutNotes}
              onChange={(e) => setCheckOutNotes(e.target.value)}
              placeholder="Add any notes about your check-out..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsCheckOutModalOpen(false);
                setCheckOutNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckOut}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? 'Checking Out...' : 'Check Out'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
