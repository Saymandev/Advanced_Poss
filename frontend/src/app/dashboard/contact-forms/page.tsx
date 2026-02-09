'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useGetCompaniesQuery } from '@/lib/api/endpoints/companiesApi';
import {
  ContactForm,
  ContactFormFilters,
  useGetContactFormsQuery,
  useGetContactFormStatsQuery,
  useUpdateContactFormMutation,
} from '@/lib/api/endpoints/contactFormsApi';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import { useAppSelector } from '@/lib/store';
import {
  EnvelopeIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  read: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  replied: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  read: 'Read',
  replied: 'Replied',
  archived: 'Archived',
};

export default function ContactFormsPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);

  // Redirect if user doesn't have settings feature (includes contact forms)
  useFeatureRedirect('settings');
  const isSuperAdmin = (user as any)?.role === 'SUPER_ADMIN' || (user as any)?.role === 'super_admin';

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<ContactForm | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  // Get companies list for Super Admin selector
  const { data: companiesData } = useGetCompaniesQuery({}, { skip: !isSuperAdmin });
  const companies = useMemo(() => {
    if (!companiesData || !isSuperAdmin) return [];
    if (Array.isArray(companiesData)) return companiesData;
    return companiesData.companies || [];
  }, [companiesData, isSuperAdmin]);

  // Extract companyId like other pages do
  // For super admin: use selectedCompanyId if set, otherwise undefined (show all)
  // For company users: use their companyId
  const rawCompanyId = isSuperAdmin
    ? (selectedCompanyId || undefined)
    : ((user as any)?.companyId ||
      (companyContext as any)?.companyId ||
      (companyContext as any)?._id ||
      (companyContext as any)?.id ||
      null);

  // Ensure companyId is a string (handle ObjectId objects)
  const companyId = useMemo(() => {
    if (!rawCompanyId) return null;
    if (typeof rawCompanyId === 'string') return rawCompanyId;
    if (typeof rawCompanyId === 'object' && rawCompanyId !== null) {
      return rawCompanyId.toString?.() || rawCompanyId._id?.toString() || rawCompanyId.id?.toString() || null;
    }
    return String(rawCompanyId);
  }, [rawCompanyId]);

  const filters = useMemo(() => {
    const filterObj: ContactFormFilters = {
      status: statusFilter !== 'all' ? statusFilter as any : undefined,
      search: searchQuery || undefined,
      page: currentPage,
      limit: itemsPerPage,
    };

    // Add companyId filter:
    // - For super admin: use selectedCompanyId if set (or 'null' for general inquiries)
    // - For company users: use their companyId
    if (isSuperAdmin) {
      if (selectedCompanyId) {
        filterObj.companyId = selectedCompanyId === 'null' ? null : selectedCompanyId;
      }
      // If no company selected, don't filter (show all)
    } else if (companyId) {
      filterObj.companyId = companyId;
    }

    return filterObj;
  }, [isSuperAdmin, companyId, selectedCompanyId, statusFilter, searchQuery, currentPage, itemsPerPage]);

  const { data: formsResponse, isLoading, refetch } = useGetContactFormsQuery(filters);
  // For super admin: use selectedCompanyId if set, otherwise undefined (all stats)
  // For company users: use their companyId
  const statsCompanyId = isSuperAdmin
    ? (selectedCompanyId === 'null' ? null : (selectedCompanyId || undefined))
    : (companyId || null);
  const { data: statsResponse } = useGetContactFormStatsQuery(statsCompanyId);
  const [updateForm, { isLoading: isUpdating }] = useUpdateContactFormMutation();

  const forms = useMemo(() => {
    return formsResponse?.data || [];
  }, [formsResponse]);

  const stats = useMemo(() => {
    return statsResponse?.data || { total: 0, new: 0, read: 0, replied: 0, archived: 0 };
  }, [statsResponse]);

  const openViewModal = useCallback((form: ContactForm | null) => {
    if (!form) return;
    setSelectedForm(form);
    setAdminNotes(form.adminNotes || '');
    setIsViewModalOpen(true);

    // Mark as read if it's new
    if (form.status === 'new') {
      updateForm({
        id: form.id,
        data: { status: 'read' },
      }).then(() => {
        refetch();
      });
    }
  }, [updateForm, refetch]);

  const handleUpdateStatus = useCallback(async (status: 'new' | 'read' | 'replied' | 'archived') => {
    if (!selectedForm) return;

    try {
      await updateForm({
        id: selectedForm.id,
        data: { status },
      }).unwrap();
      toast.success('Status updated successfully');
      refetch();
      if (status === 'archived') {
        setIsViewModalOpen(false);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update status');
    }
  }, [selectedForm, updateForm, refetch]);

  const handleSaveNotes = useCallback(async () => {
    if (!selectedForm) return;

    try {
      await updateForm({
        id: selectedForm.id,
        data: { adminNotes },
      }).unwrap();
      toast.success('Notes saved successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save notes');
    }
  }, [selectedForm, adminNotes, updateForm, refetch]);

  const columns = useMemo(() => [
    {
      key: 'name',
      title: 'Name',
      render: (value: any, row: ContactForm | null) => {
        if (!row) return null;
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{row.name || 'N/A'}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{row.email || ''}</div>
          </div>
        );
      },
    },
    {
      key: 'subject',
      title: 'Subject',
      render: (value: any, row: ContactForm | null) => {
        if (!row) return null;
        return (
          <div className="max-w-xs truncate" title={row.subject || ''}>
            {row.subject || 'N/A'}
          </div>
        );
      },
    },
    {
      key: 'company',
      title: 'Company',
      render: (company: any, row: ContactForm | null) => {
        if (!row) return null;
        if (isSuperAdmin) {
          // company is the value of row.company (can be null)
          // row is the full ContactForm object
          if (!company || row.companyId === null) {
            return <span className="text-sm text-gray-500 dark:text-gray-400 italic">General Inquiry</span>;
          }
          return (
            <div className="text-sm text-gray-900 dark:text-white">{company.name}</div>
          );
        }
        return null;
      },
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: any, row: ContactForm | null) => {
        if (!row || !row.status) return null;
        const status = String(row.status).toLowerCase();
        const statusLabel = STATUS_LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1);
        const statusColor = STATUS_COLORS[status] || STATUS_COLORS.new;
        return (
          <Badge className={statusColor}>
            {statusLabel}
          </Badge>
        );
      },
    },
    {
      key: 'createdAt',
      title: 'Date',
      render: (value: any, row: ContactForm | null) => {
        if (!row || !row.createdAt) return <div className="text-sm text-gray-500 dark:text-gray-400">N/A</div>;
        try {
          const date = new Date(row.createdAt);
          if (isNaN(date.getTime())) {
            return <div className="text-sm text-gray-500 dark:text-gray-400">Invalid Date</div>;
          }
          return (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          );
        } catch (error) {
          return <div className="text-sm text-gray-500 dark:text-gray-400">Invalid Date</div>;
        }
      },
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: ContactForm | null) => {
        if (!row) return null;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (row) {
                  openViewModal(row);
                }
              }}
              className="text-primary-600 hover:text-primary-700"
            >
              <EyeIcon className="w-4 h-4 mr-1" />
              View
            </Button>
          </div>
        );
      },
    },
  ], [isSuperAdmin, openViewModal]);

  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All Statuses' },
    { value: 'new', label: 'New' },
    { value: 'read', label: 'Read' },
    { value: 'replied', label: 'Replied' },
    { value: 'archived', label: 'Archived' },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Contact Forms</h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            {isSuperAdmin ? 'Manage all contact inquiries' : 'Manage your contact inquiries'}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Total</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate" title={stats.total.toLocaleString()}>
                {stats.total.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">New</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 truncate" title={stats.new.toLocaleString()}>
                {stats.new.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Read</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-600 dark:text-gray-400 truncate" title={stats.read.toLocaleString()}>
                {stats.read.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Replied</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-600 dark:text-green-400 truncate" title={stats.replied.toLocaleString()}>
                {stats.replied.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">Archived</div>
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-600 dark:text-yellow-400 truncate" title={stats.archived.toLocaleString()}>
                {stats.archived.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {isSuperAdmin && (
              <div className="w-full md:w-64">
                <Select
                  options={[
                    { value: '', label: 'All Companies' },
                    ...companies.map((c: any) => ({
                      value: c._id || c.id,
                      label: c.name || 'Unknown Company',
                    })),
                    { value: 'null', label: 'General Inquiries' },
                  ]}
                  value={selectedCompanyId || ''}
                  onChange={(value) => {
                    setSelectedCompanyId(value === '' ? '' : value);
                    setCurrentPage(1);
                  }}
                  placeholder="Filter by company"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by name, email, subject, or message..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Forms ({formsResponse?.pagination?.total || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={forms}
            loading={isLoading}
            pagination={{
              currentPage: currentPage,
              totalPages: formsResponse?.pagination?.totalPages || 1,
              itemsPerPage: itemsPerPage,
              totalItems: formsResponse?.pagination?.total || 0,
              onPageChange: setCurrentPage,
            }}
          />
        </CardContent>
      </Card>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Contact Form Details"
        size="lg"
      >
        {selectedForm && (
          <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
            {/* Contact Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <div className="text-gray-900 dark:text-white">{selectedForm.name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <EnvelopeIcon className="w-4 h-4" />
                  <a
                    href={`mailto:${selectedForm.email}`}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {selectedForm.email}
                  </a>
                </div>
              </div>
              {selectedForm.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <PhoneIcon className="w-4 h-4" />
                    <a
                      href={`tel:${selectedForm.phone}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      {selectedForm.phone}
                    </a>
                  </div>
                </div>
              )}
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company
                  </label>
                  <div className="text-gray-900 dark:text-white">
                    {selectedForm.company ? selectedForm.company.name : (selectedForm.companyId === null ? 'General Inquiry' : 'N/A')}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <Badge className={STATUS_COLORS[selectedForm.status] || STATUS_COLORS.new}>
                  {STATUS_LABELS[selectedForm.status] || selectedForm.status}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <div className="text-gray-900 dark:text-white">
                  {new Date(selectedForm.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <div className="text-gray-900 dark:text-white">{selectedForm.subject}</div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message
              </label>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white whitespace-pre-wrap">
                {selectedForm.message}
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Notes
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Add notes about this inquiry..."
              />
              <Button
                onClick={handleSaveNotes}
                disabled={isUpdating}
                className="mt-2"
                size="sm"
              >
                {isUpdating ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => handleUpdateStatus('read')}
                disabled={selectedForm.status === 'read' || isUpdating}
                size="sm"
              >
                Mark as Read
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleUpdateStatus('replied')}
                disabled={selectedForm.status === 'replied' || isUpdating}
                size="sm"
              >
                Mark as Replied
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleUpdateStatus('archived')}
                disabled={selectedForm.status === 'archived' || isUpdating}
                size="sm"
              >
                Archive
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

