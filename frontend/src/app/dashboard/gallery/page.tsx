'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  useGetGalleryImagesQuery,
  useUploadGalleryImageMutation,
  useUpdateGalleryImageMutation,
  useDeleteGalleryImageMutation,
  GalleryImage,
} from '@/lib/api/endpoints/galleryApi';
import {
  PhotoIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';

export default function GalleryPage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    caption: '',
    description: '',
  });
  const [editForm, setEditForm] = useState({
    caption: '',
    description: '',
    isActive: true,
  });

  const { data: galleryImages = [], isLoading, refetch } = useGetGalleryImagesQuery({});
  const [uploadImage, { isLoading: isUploading }] = useUploadGalleryImageMutation();
  const [updateImage, { isLoading: isUpdating }] = useUpdateGalleryImageMutation();
  const [deleteImage, { isLoading: isDeleting }] = useDeleteGalleryImageMutation();

  // Filter images
  const activeImages = galleryImages.filter((img) => img.isActive);
  const inactiveImages = galleryImages.filter((img) => !img.isActive);

  const handleOpenUploadModal = () => {
    setUploadForm({ file: null, caption: '', description: '' });
    setPreviewImage(null);
    setIsUploadModalOpen(true);
  };

  const handleOpenEditModal = (image: GalleryImage) => {
    setSelectedImage(image);
    setEditForm({
      caption: image.caption || '',
      description: image.description || '',
      isActive: image.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (image: GalleryImage) => {
    setSelectedImage(image);
    setIsDeleteModalOpen(true);
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadForm((prev) => ({ ...prev, file }));
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]); // Handle first file only
    }
  }, []);

  const handleUpload = async () => {
    if (!uploadForm.file) {
      toast.error('Please select an image file');
      return;
    }

    try {
      await uploadImage({
        file: uploadForm.file,
        caption: uploadForm.caption.trim() || undefined,
        description: uploadForm.description.trim() || undefined,
        isActive: true,
      }).unwrap();

      toast.success('Image uploaded successfully!');
      setIsUploadModalOpen(false);
      setUploadForm({ file: null, caption: '', description: '' });
      setPreviewImage(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to upload image');
    }
  };

  const handleUpdate = async () => {
    if (!selectedImage) return;

    try {
      await updateImage({
        id: selectedImage.id || selectedImage._id || '',
        caption: editForm.caption.trim() || undefined,
        description: editForm.description.trim() || undefined,
        isActive: editForm.isActive,
      }).unwrap();

      toast.success('Image updated successfully!');
      setIsEditModalOpen(false);
      setSelectedImage(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to update image');
    }
  };

  const handleDelete = async () => {
    if (!selectedImage) return;

    try {
      await deleteImage(selectedImage.id || selectedImage._id || '').unwrap();
      toast.success('Image deleted successfully!');
      setIsDeleteModalOpen(false);
      setSelectedImage(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to delete image');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gallery Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your company gallery images
          </p>
        </div>
        <Button onClick={handleOpenUploadModal}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Upload Image
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Images</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{galleryImages.length}</p>
              </div>
              <PhotoIcon className="w-8 h-8 text-primary-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Images</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeImages.length}</p>
              </div>
              <EyeIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Inactive Images</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{inactiveImages.length}</p>
              </div>
              <EyeSlashIcon className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gallery Grid */}
      {galleryImages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <PhotoIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No images in gallery
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start by uploading your first image to showcase your restaurant.
            </p>
            <Button onClick={handleOpenUploadModal}>
              <PlusIcon className="w-5 h-5 mr-2" />
              Upload First Image
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {galleryImages.map((image) => (
            <Card key={image.id || image._id} className="overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="relative aspect-square">
                <img
                  src={image.url}
                  alt={image.caption || 'Gallery image'}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenEditModal(image)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleOpenDeleteModal(image)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
                {!image.isActive && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="danger">Inactive</Badge>
                  </div>
                )}
              </div>
              {image.caption && (
                <CardContent className="p-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {image.caption}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadForm({ file: null, caption: '', description: '' });
          setPreviewImage(null);
        }}
        title="Upload Gallery Image"
        className="max-w-2xl"
      >
        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
            }`}
          >
            {previewImage ? (
              <div className="relative">
                <img
                  src={previewImage}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg mb-4"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUploadForm((prev) => ({ ...prev, file: null }));
                    setPreviewImage(null);
                  }}
                  className="absolute top-2 right-2"
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {uploadForm.file?.name}
                </p>
              </div>
            ) : (
              <>
                <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Drag and drop an image here, or{' '}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  JPEG, PNG, GIF, or WebP (max 10MB)
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Caption (optional)
            </label>
            <Input
              value={uploadForm.caption}
              onChange={(e) =>
                setUploadForm((prev) => ({ ...prev, caption: e.target.value }))
              }
              placeholder="Enter image caption"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={uploadForm.description}
              onChange={(e) =>
                setUploadForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Enter image description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadForm({ file: null, caption: '', description: '' });
                setPreviewImage(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!uploadForm.file || isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedImage(null);
        }}
        title="Edit Gallery Image"
        className="max-w-2xl"
      >
        {selectedImage && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img
                src={selectedImage.url}
                alt={selectedImage.caption || 'Gallery image'}
                className="max-h-64 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Caption
              </label>
              <Input
                value={editForm.caption}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, caption: e.target.value }))
                }
                placeholder="Enter image caption"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Enter image description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={editForm.isActive}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))
                }
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Active (visible on public gallery)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedImage(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? 'Updating...' : 'Update Image'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedImage(null);
        }}
        title="Delete Image"
        className="max-w-md"
      >
        {selectedImage && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this image? This action cannot be undone.
            </p>
            <div className="flex justify-center">
              <img
                src={selectedImage.url}
                alt={selectedImage.caption || 'Gallery image'}
                className="max-h-32 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedImage(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete Image'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

