'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useGetCustomersQuery } from '@/lib/api/endpoints/customersApi';
import {
  MarketingCampaign,
  useCreateCampaignMutation,
  useDeleteCampaignMutation,
  useGetCampaignsQuery,
  usePauseCampaignMutation,
  useResumeCampaignMutation,
  useUpdateCampaignMutation
} from '@/lib/api/endpoints/marketingApi';
import { useAppSelector } from '@/lib/store';
import {
  BellIcon,
  CalendarIcon,
  ChartBarIcon,
  EnvelopeIcon,
  GiftIcon,
  MegaphoneIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'marketing_campaigns';

export default function MarketingPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<MarketingCampaign | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Try to get campaigns from API, fallback to local storage
  const { data: apiCampaigns = [], refetch } = useGetCampaignsQuery({
    branchId: user?.branchId || undefined,
    companyId: user?.companyId || undefined,
  }, {
    skip: !user?.branchId,
  });

  const { data: customersData } = useGetCustomersQuery({ 
    branchId: user?.branchId || undefined 
  });

  const [createCampaign] = useCreateCampaignMutation();
  const [updateCampaign] = useUpdateCampaignMutation();
  const [deleteCampaign] = useDeleteCampaignMutation();
  const [pauseCampaign] = usePauseCampaignMutation();
  const [resumeCampaign] = useResumeCampaignMutation();

  // Load campaigns from localStorage on mount
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  // Sync API campaigns and local storage
  useEffect(() => {
    if (apiCampaigns.length > 0) {
      setCampaigns(apiCampaigns);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(apiCampaigns));
    }
  }, [apiCampaigns]);

  // Save to localStorage whenever campaigns change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  }, [campaigns]);

  const [formData, setFormData] = useState({
    name: '',
    type: 'email' as 'email' | 'sms' | 'push' | 'loyalty' | 'coupon',
    target: 'all' as 'all' | 'loyalty' | 'new' | 'inactive' | 'segment',
    segment: '',
    subject: '',
    message: '',
    scheduledDate: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'email',
      target: 'all',
      segment: '',
      subject: '',
      message: '',
      scheduledDate: '',
    });
    setSelectedCampaign(null);
  };

  // Calculate recipient count based on target
  const calculateRecipients = useMemo(() => {
    if (!customersData) return 0;
    const customers = Array.isArray(customersData) ? customersData : (customersData.customers || []);
    return customers.length;
  }, [customersData]);

  const handleCreate = async () => {
    try {
      const newCampaign: MarketingCampaign = {
        id: Date.now().toString(),
        ...formData,
        status: formData.scheduledDate ? 'scheduled' : 'draft',
        recipients: calculateRecipients,
        branchId: user?.branchId || '',
        companyId: user?.companyId || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Try API first, then fallback to local
      try {
        await createCampaign(formData).unwrap();
        await refetch();
      } catch {
        // API failed, use local storage
        setCampaigns([newCampaign, ...campaigns]);
      }
      
      toast.success('Campaign created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to create campaign');
    }
  };

  const handleEdit = async () => {
    if (!selectedCampaign) return;

    try {
      try {
        await updateCampaign({ id: selectedCampaign.id, ...formData }).unwrap();
        await refetch();
      } catch {
        const updatedCampaigns = campaigns.map(campaign =>
          campaign.id === selectedCampaign.id
            ? { ...campaign, ...formData, updatedAt: new Date().toISOString() }
            : campaign
        );
        setCampaigns(updatedCampaigns);
      }
      
      toast.success('Campaign updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to update campaign');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      try {
        await deleteCampaign(id).unwrap();
        await refetch();
      } catch {
        setCampaigns(campaigns.filter(campaign => campaign.id !== id));
      }
      toast.success('Campaign deleted successfully');
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to delete campaign');
    }
  };

  const handleStatusChange = async (id: string, status: MarketingCampaign['status']) => {
    try {
      if (status === 'active') {
        await resumeCampaign(id).unwrap();
      } else if (status === 'paused') {
        await pauseCampaign(id).unwrap();
      } else {
        await updateCampaign({ id, status }).unwrap();
      }
      await refetch();
      toast.success(`Campaign ${status} successfully`);
    } catch {
      // Fallback to local update
      const updatedCampaigns = campaigns.map(campaign =>
        campaign.id === id
          ? { ...campaign, status, updatedAt: new Date().toISOString() }
          : campaign
      );
      setCampaigns(updatedCampaigns);
      toast.success(`Campaign ${status} successfully`);
    }
  };

  const openEditModal = (campaign: MarketingCampaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      type: campaign.type,
      target: campaign.target,
      segment: campaign.segment || '',
      subject: campaign.subject || '',
      message: campaign.message,
      scheduledDate: campaign.scheduledDate || '',
    });
    setIsEditModalOpen(true);
  };

  const getStatusBadge = (status: MarketingCampaign['status']) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'info',
      active: 'success',
      completed: 'info',
      paused: 'warning',
    } as const;

    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getTypeIcon = (type: MarketingCampaign['type']) => {
    const icons = {
      email: EnvelopeIcon,
      sms: TagIcon,
      push: BellIcon,
      loyalty: GiftIcon,
      coupon: TagIcon,
    };

    const Icon = icons[type];
    return <Icon className="w-4 h-4" />;
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filterStatus !== 'all' && campaign.status !== filterStatus) return false;
    if (filterType !== 'all' && campaign.type !== filterType) return false;
    return true;
  });

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Marketing Campaigns</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage your marketing campaigns
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Campaigns</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <MegaphoneIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <ChartBarIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.scheduled}</p>
              </div>
              <CalendarIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-3xl font-bold text-purple-600">{stats.completed}</p>
              </div>
              <GiftIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'active', label: 'Active' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'paused', label: 'Paused' },
                ]}
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder="Filter by status"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Types' },
                  { value: 'email', label: 'Email' },
                  { value: 'sms', label: 'SMS' },
                  { value: 'push', label: 'Push' },
                  { value: 'loyalty', label: 'Loyalty' },
                  { value: 'coupon', label: 'Coupon' },
                ]}
                value={filterType}
                onChange={setFilterType}
                placeholder="Filter by type"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {campaign.name}
                      </h3>
                      {getStatusBadge(campaign.status)}
                      <div className="flex items-center gap-1 text-gray-500">
                        {getTypeIcon(campaign.type)}
                        <span className="text-sm capitalize">{campaign.type}</span>
                      </div>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {campaign.message}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Target: {campaign.target}</span>
                      {campaign.scheduledDate && (
                        <span>Scheduled: {new Date(campaign.scheduledDate).toLocaleDateString()}</span>
                      )}
                      {campaign.sentDate && (
                        <span>Sent: {new Date(campaign.sentDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStatusChange(campaign.id, campaign.status === 'active' ? 'paused' : 'active')}
                    >
                      {campaign.status === 'active' ? 'Pause' : 'Activate'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(campaign)}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(campaign.id, campaign.name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Campaign Stats */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {campaign.recipients.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Recipients</p>
                    </div>
                    {campaign.opened && (
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {((campaign.opened / campaign.recipients) * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Opened</p>
                      </div>
                    )}
                    {campaign.clicked && (
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          {((campaign.clicked / campaign.opened!) * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Clicked</p>
                      </div>
                    )}
                    {campaign.converted && (
                      <div>
                        <p className="text-2xl font-bold text-purple-600">
                          {campaign.converted}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Converted</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredCampaigns.length === 0 && (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No campaigns found matching your filters.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Campaign Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create Marketing Campaign"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Campaign Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Summer Special"
              required
            />

            <Select
              label="Campaign Type"
              options={[
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'SMS' },
                { value: 'push', label: 'Push Notification' },
                { value: 'loyalty', label: 'Loyalty Reward' },
                { value: 'coupon', label: 'Coupon' },
              ]}
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value as any })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Target Audience"
              options={[
                { value: 'all', label: 'All Customers' },
                { value: 'loyalty', label: 'Loyalty Members' },
                { value: 'new', label: 'New Customers' },
                { value: 'inactive', label: 'Inactive Customers' },
                { value: 'segment', label: 'Custom Segment' },
              ]}
              value={formData.target}
              onChange={(value) => setFormData({ ...formData, target: value as any })}
            />

            {formData.target === 'segment' && (
              <Input
                label="Segment Name"
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                placeholder="VIP Customers"
              />
            )}
          </div>

          {formData.type === 'email' && (
            <Input
              label="Email Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Special Offer Inside!"
              required
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message
            </label>
            <textarea
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="input w-full"
              placeholder="Enter your campaign message..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Schedule Date (Optional)"
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
            />
          </div>

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
              Create Campaign
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Campaign Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        title="Edit Campaign"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Campaign Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <Select
              label="Campaign Type"
              options={[
                { value: 'email', label: 'Email' },
                { value: 'sms', label: 'SMS' },
                { value: 'push', label: 'Push Notification' },
                { value: 'loyalty', label: 'Loyalty Reward' },
                { value: 'coupon', label: 'Coupon' },
              ]}
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value as any })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Target Audience"
              options={[
                { value: 'all', label: 'All Customers' },
                { value: 'loyalty', label: 'Loyalty Members' },
                { value: 'new', label: 'New Customers' },
                { value: 'inactive', label: 'Inactive Customers' },
                { value: 'segment', label: 'Custom Segment' },
              ]}
              value={formData.target}
              onChange={(value) => setFormData({ ...formData, target: value as any })}
            />

            {formData.target === 'segment' && (
              <Input
                label="Segment Name"
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
              />
            )}
          </div>

          {formData.type === 'email' && (
            <Input
              label="Email Subject"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message
            </label>
            <textarea
              rows={4}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="input w-full"
              required
            />
          </div>

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
              Update Campaign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
