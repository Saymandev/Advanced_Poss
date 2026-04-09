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
  useUploadCmsImageMutation
} from '@/lib/api/endpoints/cmsApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import { cn, formatDateTime } from '@/lib/utils';
import {
  CheckCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilIcon,
  PhotoIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export default function CmsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'pages';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadImage, { isLoading: isUploadingImage }] = useUploadCmsImageMutation();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const url = await uploadImage(formData).unwrap();
      setFormData((prev: any) => ({ ...prev, featuredImage: url }));
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to upload image');
    }
  };

  // Map tabs to content types
  const tabToType = useMemo(() => {
    if (activeTab === 'landing') return ContentPageType.LANDING_SECTION;
    if (activeTab === 'testimonials') return ContentPageType.PAGE; // We might want a TESTIMONIAL type later
    return 'all';
  }, [activeTab]);

  const { data: pagesData, isLoading, refetch } = useGetAllContentPagesQuery({
    type: tabToType !== 'all' ? tabToType : (typeFilter !== 'all' ? typeFilter : undefined),
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

  const [formData, setFormData] = useState<any>({
    type: ContentPageType.PAGE,
    title: '',
    slug: '',
    content: '',
    status: ContentPageStatus.DRAFT,
    configData: '',
  });

  const resetForm = () => {
    setFormData({
      type: activeTab === 'landing' ? ContentPageType.LANDING_SECTION : ContentPageType.PAGE,
      title: '',
      slug: '',
      content: '',
      status: ContentPageStatus.DRAFT,
      configData: '',
    });
  };

  const handleCreate = async () => {
    try {
      if (!formData.title || !formData.slug) {
        toast.error('Please fill in required fields');
        return;
      }
      
      // Validation for LANDING_SECTION
      if (formData.type === ContentPageType.LANDING_SECTION && !formData.configData) {
        toast.error('Config Data is required for landing sections');
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
      configData: page.configData ? JSON.stringify(page.configData, null, 2) : '',
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

  const columns = [
    {
      key: 'title',
      title: 'Title',
      render: (value: any, row: any) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">/{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'type',
      title: 'Type',
      render: (value: any) => (
        <Badge variant={
          value === ContentPageType.BLOG ? 'success' : 
          value === ContentPageType.CAREER ? 'warning' : 
          value === ContentPageType.LANDING_SECTION ? 'info' : 'secondary'
        }>
          {value.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: any) => (
        <Badge variant={value === ContentPageStatus.PUBLISHED ? 'success' : value === ContentPageStatus.DRAFT ? 'warning' : 'secondary'}>
          {value}
        </Badge>
      ),
    },
    {
      key: 'details',
      title: 'Details',
      render: (_: any, row: any) => (
        <div className="text-xs text-gray-500">
          {row.type === ContentPageType.LANDING_SECTION ? (
            <span>Structured Config</span>
          ) : (
            <span>{row.viewCount || 0} views</span>
          )}
        </div>
      )
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: any) => formatDateTime(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_value: any, row: any) => (
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

  const tabs = [
    { id: 'pages', label: 'Pages & Blogs', icon: DocumentTextIcon },
    { id: 'landing', label: 'Landing Sections', icon: SparklesIcon },
    { id: 'testimonials', label: 'Testimonials', icon: CheckCircleIcon },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <DocumentTextIcon className="w-8 h-8 text-purple-600" />
            Powerful CMS
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {activeTab === 'landing' 
              ? 'Manage structured landing page data and site configuration' 
              : 'Manage blog posts, career listings, and help center articles'}
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
          Create {activeTab === 'landing' ? 'Landing Section' : 'Content Page'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => router.push(`/dashboard/cms?tab=${tab.id}`)}
            className={cn(
              "flex items-center gap-2 py-4 border-b-2 transition-colors font-medium",
              activeTab === tab.id
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {activeTab === 'pages' && (
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
            )}
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
          <CardTitle>
            {tabs.find(t => t.id === activeTab)?.label} ({pages.length})
          </CardTitle>
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
        title={`Create ${activeTab === 'landing' ? 'Landing Section' : 'Content'}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                  { value: ContentPageType.LANDING_SECTION, label: 'Landing Section' },
                ]}
                disabled={activeTab === 'landing'}
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={activeTab === 'landing' ? "e.g., Landing Page Features" : "Enter title"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slug / Key *
            </label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
              placeholder="e.g., features-section"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Featured Image
            </label>
            <div className="flex items-center gap-4">
              {formData.featuredImage ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                  <img
                    src={formData.featuredImage}
                    alt="Featured"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, featuredImage: '' })}
                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 hover:text-purple-600 hover:border-purple-600 transition-colors"
                  disabled={isUploadingImage}
                >
                  <PhotoIcon className="w-6 h-6" />
                  <span className="text-[10px] mt-1">{isUploadingImage ? 'Uploading...' : 'Upload'}</span>
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
              <div className="flex-1">
                <Input
                  value={formData.featuredImage || ''}
                  onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                  placeholder="Or enter image URL"
                />
              </div>
            </div>
          </div>

          {formData.type === ContentPageType.LANDING_SECTION ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Structured Config (JSON) *
              </label>
              <textarea
                value={formData.configData}
                onChange={(e) => setFormData({ ...formData, configData: e.target.value })}
                placeholder='{ "items": [ { "title": "...", "icon": "..." } ] }'
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                rows={12}
              />
              <p className="text-xs text-gray-500 mt-1">Provide a valid JSON object for structured section data.</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content * (HTML)
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter page content"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                rows={10}
              />
            </div>
          )}

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
              {isCreating ? 'Creating...' : 'Create Content'}
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
        title={`Edit ${selectedPage?.type === ContentPageType.LANDING_SECTION ? 'Landing Section' : 'Content'}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Slug / Key
            </label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Featured Image
            </label>
            <div className="flex items-center gap-4">
              {formData.featuredImage ? (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group">
                  <img
                    src={formData.featuredImage}
                    alt="Featured"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => setFormData({ ...formData, featuredImage: '' })}
                    className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 hover:text-purple-600 hover:border-purple-600 transition-colors"
                  disabled={isUploadingImage}
                >
                  <PhotoIcon className="w-6 h-6" />
                  <span className="text-[10px] mt-1">{isUploadingImage ? 'Uploading...' : 'Upload'}</span>
                </button>
              )}
              <div className="flex-1">
                <Input
                  value={formData.featuredImage || ''}
                  onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
                  placeholder="Or enter image URL"
                />
              </div>
            </div>
          </div>

          {formData.type === ContentPageType.LANDING_SECTION ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Structured Config (JSON)
              </label>
              <textarea
                value={formData.configData}
                onChange={(e) => setFormData({ ...formData, configData: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                rows={12}
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Content (HTML)
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white"
                rows={10}
              />
            </div>
          )}

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
              {isUpdating ? 'Updating...' : 'Update Content'}
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
        title={selectedPage?.title || 'View Content'}
        size="xl"
      >
        {selectedPage && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <Badge>{selectedPage.type}</Badge>
              <Badge variant="secondary">{selectedPage.status}</Badge>
            </div>
            <div>
              <strong>Slug:</strong> <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{selectedPage.slug}</code>
            </div>
            
            {selectedPage.type === ContentPageType.LANDING_SECTION ? (
              <div>
                <strong>Structured Data:</strong>
                <pre className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-auto max-h-[400px] text-xs font-mono">
                  {JSON.stringify(selectedPage.configData, null, 2)}
                </pre>
              </div>
            ) : (
              <div>
                <strong>Content Preview:</strong>
                <div
                  className="mt-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: selectedPage.content || '' }}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

