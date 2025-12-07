'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import {
    ContentPage,
    ContentPageStatus,
    ContentPageType,
    CreateContentPageDto,
    UpdateContentPageDto,
    useCreateContentPageMutation,
    useDeleteContentPageMutation,
    useGetAllContentPagesQuery,
    useUpdateContentPageMutation,
} from '@/lib/api/endpoints/cmsApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import { formatDateTime } from '@/lib/utils';
import {
    CheckCircleIcon,
    DocumentTextIcon,
    EyeIcon,
    PencilIcon,
    PlusIcon,
    TrashIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function CmsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (!user || user.role !== UserRole.SUPER_ADMIN) {
      router.replace('/dashboard/super-admin');
    }
  }, [user, router]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<ContentPage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContentPageType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContentPageStatus | 'all'>('all');

  const { data: pagesData, isLoading, refetch } = useGetAllContentPagesQuery({
    type: typeFilter !== 'all' ? typeFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    search: searchQuery || undefined,
  });

  const [createPage, { isLoading: isCreating }] = useCreateContentPageMutation();
  const [updatePage, { isLoading: isUpdating }] = useUpdateContentPageMutation();
  const [deletePage, { isLoading: isDeleting }] = useDeleteContentPageMutation();

  const pages = useMemo(() => {
    if (!pagesData) return [];
    if (Array.isArray(pagesData)) {
      return pagesData.map((page: any) => ({
        ...page,
        id: page._id || page.id,
      }));
    }
    return [];
  }, [pagesData]);

  const [formData, setFormData] = useState<Partial<CreateContentPageDto>>({
    type: ContentPageType.PAGE,
    title: '',
    slug: '',
    content: '',
    status: ContentPageStatus.DRAFT,
  });

  const resetForm = () => {
    setFormData({
      type: ContentPageType.PAGE,
      title: '',
      slug: '',
      content: '',
      status: ContentPageStatus.DRAFT,
    });
  };

  const handleCreate = async () => {
    try {
      if (!formData.title || !formData.slug || !formData.content) {
        toast.error('Please fill in all required fields');
        return;
      }
      await createPage(formData as CreateContentPageDto).unwrap();
      toast.success('Content page created successfully');
      setIsCreateModalOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create content page');
    }
  };

  const handleEdit = async () => {
    if (!selectedPage) return;
    try {
      await updatePage({
        id: selectedPage._id,
        data: formData as UpdateContentPageDto,
      }).unwrap();
      toast.success('Content page updated successfully');
      setIsEditModalOpen(false);
      setSelectedPage(null);
      resetForm();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update content page');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content page?')) return;
    try {
      await deletePage(id).unwrap();
      toast.success('Content page deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete content page');
    }
  };

  const openEditModal = (page: ContentPage) => {
    setSelectedPage(page);
    setFormData({
      type: page.type,
      title: page.title,
      slug: page.slug,
      excerpt: page.excerpt,
      content: page.content,
      featuredImage: page.featuredImage,
      images: page.images,
      tags: page.tags,
      status: page.status,
      isFeatured: page.isFeatured,
      authorName: page.authorName,
      readingTime: page.readingTime,
      jobTitle: page.jobTitle,
      location: page.location,
      employmentType: page.employmentType,
      salaryRange: page.salaryRange,
      applicationDeadline: page.applicationDeadline,
      applicationUrl: page.applicationUrl,
      requirements: page.requirements,
      responsibilities: page.responsibilities,
      category: page.category,
      subcategory: page.subcategory,
      allowComments: page.allowComments,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      sortOrder: page.sortOrder,
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (page: ContentPage) => {
    setSelectedPage(page);
    setIsViewModalOpen(true);
  };

  const columns: { key: keyof ContentPage | string; title: string; render: (value: any, row: ContentPage) => React.ReactNode }[] = [
    {
      key: 'title',
      title: 'Title',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">/{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (value) => (
        <Badge variant={value === ContentPageType.BLOG ? 'success' : value === ContentPageType.CAREER ? 'warning' : 'info'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <Badge variant={value === ContentPageStatus.PUBLISHED ? 'success' : value === ContentPageStatus.DRAFT ? 'warning' : 'secondary'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'isFeatured',
      title: 'Featured',
      render: (value) => (
        value ? (
          <CheckCircleIcon className="w-5 h-5 text-green-500" />
        ) : (
          <XCircleIcon className="w-5 h-5 text-gray-400" />
        )
      ),
    },
    {
      key: 'viewCount',
      title: 'Views',
      render: (value) => value || 0,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value) => formatDateTime(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_value, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => openViewModal(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="View"
          >
            <EyeIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => openEditModal(row)}
            className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
            title="Edit"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleDelete(row._id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
            disabled={isDeleting}
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  if (!user || user.role !== UserRole.SUPER_ADMIN) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <DocumentTextIcon className="w-8 h-8 text-purple-600" />
            Content Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage blog posts, career listings, and help center articles
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Create Content Page
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Select
              value={typeFilter}
              onChange={(value) => setTypeFilter(value as ContentPageType | 'all')}
              options={[
                { value: 'all', label: 'All Types' },
                { value: ContentPageType.BLOG, label: 'Blog' },
                { value: ContentPageType.CAREER, label: 'Career' },
                { value: ContentPageType.HELP_CENTER, label: 'Help Center' },
                { value: ContentPageType.PAGE, label: 'Page' },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as ContentPageStatus | 'all')}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: ContentPageStatus.DRAFT, label: 'Draft' },
                { value: ContentPageStatus.PUBLISHED, label: 'Published' },
                { value: ContentPageStatus.ARCHIVED, label: 'Archived' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Content Pages ({pages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <DataTable data={pages} columns={columns} />
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        title="Create Content Page"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type *
            </label>
            <Select
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value as ContentPageType })}
              options={[
                { value: ContentPageType.PAGE, label: 'Page' },
                { value: ContentPageType.BLOG, label: 'Blog' },
                { value: ContentPageType.CAREER, label: 'Career' },
                { value: ContentPageType.HELP_CENTER, label: 'Help Center' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slug *
            </label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="url-friendly-slug"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content * (HTML)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter HTML content"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              rows={10}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <Select
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value as ContentPageStatus })}
              options={[
                { value: ContentPageStatus.DRAFT, label: 'Draft' },
                { value: ContentPageStatus.PUBLISHED, label: 'Published' },
              ]}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPage(null);
          resetForm();
        }}
        title="Edit Content Page"
        size="xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <Select
              value={formData.type}
              onChange={(value) => setFormData({ ...formData, type: value as ContentPageType })}
              options={[
                { value: ContentPageType.PAGE, label: 'Page' },
                { value: ContentPageType.BLOG, label: 'Blog' },
                { value: ContentPageType.CAREER, label: 'Career' },
                { value: ContentPageType.HELP_CENTER, label: 'Help Center' },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slug *
            </label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Content * (HTML)
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
              rows={10}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <Select
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value as ContentPageStatus })}
              options={[
                { value: ContentPageStatus.DRAFT, label: 'Draft' },
                { value: ContentPageStatus.PUBLISHED, label: 'Published' },
                { value: ContentPageStatus.ARCHIVED, label: 'Archived' },
              ]}
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedPage(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedPage(null);
        }}
        title={selectedPage?.title || 'View Content Page'}
        size="xl"
      >
        {selectedPage && (
          <div className="space-y-4">
            <div>
              <strong>Type:</strong> {selectedPage.type}
            </div>
            <div>
              <strong>Slug:</strong> {selectedPage.slug}
            </div>
            <div>
              <strong>Status:</strong> {selectedPage.status}
            </div>
            {selectedPage.excerpt && (
              <div>
                <strong>Excerpt:</strong> {selectedPage.excerpt}
              </div>
            )}
            <div>
              <strong>Content:</strong>
              <div
                className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                dangerouslySetInnerHTML={{ __html: selectedPage.content }}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

