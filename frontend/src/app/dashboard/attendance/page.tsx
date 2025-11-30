'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
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
    TrashIcon,
    UserGroupIcon,
    XCircleIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';

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

  // API calls
  const { data: todayAttendance = [], isLoading: todayLoading } = useGetTodayAttendanceQuery(user?.branchId || '');
  const { data: attendanceStats, isLoading: statsLoading } = useGetAttendanceStatsQuery(user?.branchId || '');
  const { data: _attendanceRecords, isLoading: recordsLoading } = useGetAttendanceRecordsQuery({
    branchId: user?.branchId || '',
    page: 1,
    limit: 50,
  });

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
        notes: checkInNotes,
      }).unwrap();
      toast.success('Checked in successfully');
      setIsCheckInModalOpen(false);
      setCheckInNotes('');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut({
        notes: checkOutNotes,
      }).unwrap();
      toast.success('Checked out successfully');
      setIsCheckOutModalOpen(false);
      setCheckOutNotes('');
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

  const getStatusBadge = (status: string) => {
    const variants: any = {
      present: 'success',
      absent: 'danger',
      late: 'warning',
      'half-day': 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status.toUpperCase()}
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
      render: (record: AttendanceRecord) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {record.userName}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {record.branchName}
          </p>
        </div>
      ),
    },
    {
      key: 'checkIn',
      title: 'Check In',
      header: 'Check In',
      render: (record: AttendanceRecord) => (
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
      ),
    },
    {
      key: 'checkOut',
      title: 'Check Out',
      header: 'Check Out',
      render: (record: AttendanceRecord) => (
        <div>
          {record.checkOut ? (
            <div>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatDateTime(record.checkOut)}
              </p>
              {record.totalHours && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {record.totalHours}h worked
                </p>
              )}
            </div>
          ) : (
            <Badge variant="warning">Still Working</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      header: 'Status',
      render: (record: AttendanceRecord) => getStatusBadge(record.status),
    },
    {
      key: 'actions',
      title: 'Actions',
      header: 'Actions',
      render: (record: AttendanceRecord) => (
        <div className="flex items-center gap-2">
          {!record.checkOut && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                _setSelectedRecord(record);
                setIsCheckOutModalOpen(true);
              }}
            >
              <ClockIcon className="w-4 h-4" />
            </Button>
          )}
          {(record as any).status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleApproveAttendance(record.id)}
            >
              <CheckCircleIcon className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteAttendance(record.id)}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      ),
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
      </div>

      {/* Today's Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
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
