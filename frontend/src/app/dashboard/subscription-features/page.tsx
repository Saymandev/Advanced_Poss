'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import {
    useCreateSubscriptionFeatureMutation,
    useDeleteSubscriptionFeatureMutation,
    useGetSubscriptionFeaturesQuery,
    useSeedSubscriptionFeaturesMutation,
    useUpdateSubscriptionFeatureMutation,
} from '@/lib/api/endpoints/subscriptionsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { PencilIcon, PlusIcon, SparklesIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function SubscriptionFeaturesPage() {
  const { user } = useAppSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'super_admin';

  const { data: featuresData, isLoading, refetch } = useGetSubscriptionFeaturesQuery();
  const [createFeature] = useCreateSubscriptionFeatureMutation();
  const [updateFeature] = useUpdateSubscriptionFeatureMutation();
  const [deleteFeature] = useDeleteSubscriptionFeatureMutation();
  const [seedFeatures, { isLoading: isSeeding }] = useSeedSubscriptionFeaturesMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    description: '',
    category: '',
    basePriceMonthly: 0,
    basePriceYearly: 0,
    perBranchPriceMonthly: 0,
    perUserPriceMonthly: 0,
    isActive: true,
    isRequired: false,
  });

  const features = useMemo(() => {
    if (!featuresData || !Array.isArray(featuresData)) return [];
    return featuresData;
  }, [featuresData]);

  const handleOpenModal = (feature?: any) => {
    if (feature) {
      setEditingFeature(feature);
      setFormData({
        key: feature.key || '',
        name: feature.name || '',
        description: feature.description || '',
        category: feature.category || '',
        basePriceMonthly: feature.basePriceMonthly || 0,
        basePriceYearly: feature.basePriceYearly || 0,
        perBranchPriceMonthly: feature.perBranchPriceMonthly || 0,
        perUserPriceMonthly: feature.perUserPriceMonthly || 0,
        isActive: feature.isActive !== undefined ? feature.isActive : true,
        isRequired: feature.isRequired || false,
      });
    } else {
      setEditingFeature(null);
      setFormData({
        key: '',
        name: '',
        description: '',
        category: '',
        basePriceMonthly: 0,
        basePriceYearly: 0,
        perBranchPriceMonthly: 0,
        perUserPriceMonthly: 0,
        isActive: true,
        isRequired: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingFeature(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFeature) {
        await updateFeature({ id: editingFeature.id || editingFeature._id, data: formData }).unwrap();
        toast.success('Feature updated successfully');
      } else {
        await createFeature(formData).unwrap();
        toast.success('Feature created successfully');
      }
      handleCloseModal();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save feature');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this feature?')) return;
    try {
      await deleteFeature(id).unwrap();
      toast.success('Feature deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete feature');
    }
  };

  const handleSeedFeatures = async () => {
    if (!confirm('This will seed default features. Existing features will be updated. Continue?')) return;
    try {
      await seedFeatures().unwrap();
      toast.success('Features seeded successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to seed features');
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'Feature',
      render: (_value: any, row: any) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{row.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.key}</div>
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Category',
    },
    {
      key: 'basePriceMonthly',
      title: 'Monthly Price',
      render: (_value: any, row: any) => formatCurrency(row.basePriceMonthly || 0),
    },
    {
      key: 'basePriceYearly',
      title: 'Yearly Price',
      render: (_value: any, row: any) => formatCurrency(row.basePriceYearly || row.basePriceMonthly * 10 || 0),
    },
    {
      key: 'perBranchPriceMonthly',
      title: 'Per Branch',
      render: (_value: any, row: any) => formatCurrency(row.perBranchPriceMonthly || 0),
    },
    {
      key: 'perUserPriceMonthly',
      title: 'Per User',
      render: (_value: any, row: any) => formatCurrency(row.perUserPriceMonthly || 0),
    },
    {
      key: 'isActive',
      title: 'Status',
      render: (_value: any, row: any) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_value: any, row: any) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenModal(row)}
            className="p-1 text-primary-600 hover:text-primary-700 dark:text-primary-400"
            title="Edit"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id || row._id)}
            className="p-1 text-red-600 hover:text-red-700 dark:text-red-400"
            title="Delete"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600 dark:text-gray-400">Access denied. Super Admin only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription Features</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage feature catalog and pricing</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleSeedFeatures} isLoading={isSeeding}>
            <SparklesIcon className="w-4 h-4 mr-2" />
            Seed Default Features
          </Button>
          <Button variant="primary" onClick={() => handleOpenModal()}>
            <PlusIcon className="w-4 h-4 mr-2" />
            Create Feature
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Catalog</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            data={features}
            columns={columns}
            loading={isLoading}
            searchable
            selectable={false}
            emptyMessage="No features found. Click 'Seed Default Features' to create default features."
          />
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingFeature ? 'Edit Feature' : 'Create Feature'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Feature Key *
              </label>
              <input
                type="text"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                disabled={!!editingFeature}
                placeholder="e.g., pos, inventory"
              />
              {editingFeature && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Key cannot be changed after creation</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Feature Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                placeholder="e.g., POS System"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Feature description..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
                placeholder="e.g., Orders, Inventory"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Base Price (Monthly) *
                </label>
                <input
                  type="number"
                  value={formData.basePriceMonthly}
                  onChange={(e) => setFormData({ ...formData, basePriceMonthly: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Base Price (Yearly)
                </label>
                <input
                  type="number"
                  value={formData.basePriceYearly}
                  onChange={(e) => setFormData({ ...formData, basePriceYearly: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  min="0"
                  step="0.01"
                  placeholder="Auto: Monthly × 10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Per Branch Price (Monthly)
                </label>
                <input
                  type="number"
                  value={formData.perBranchPriceMonthly}
                  onChange={(e) => setFormData({ ...formData, perBranchPriceMonthly: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Per User Price (Monthly)
                </label>
                <input
                  type="number"
                  value={formData.perUserPriceMonthly}
                  onChange={(e) => setFormData({ ...formData, perUserPriceMonthly: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <input
              type="checkbox"
              id="isRequired"
              checked={formData.isRequired}
              onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isRequired" className="text-sm text-gray-700 dark:text-gray-300">
              Required Feature (cannot be deselected by companies)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              {editingFeature ? 'Update Feature' : 'Create Feature'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

