'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  useCreateMenuItemMutation,
  useDeleteMenuItemMutation,
  useGetMenuItemsQuery,
  useToggleAvailabilityMutation,
  useUpdateMenuItemMutation,
} from '@/lib/api/endpoints/menuItemsApi';
import { useAppSelector } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { MagnifyingGlassIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function MenuPage() {
  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading, refetch } = useGetMenuItemsQuery({ branchId: user?.branchId });
  
  const [createMenuItem] = useCreateMenuItemMutation();
  const [updateMenuItem] = useUpdateMenuItemMutation();
  const [deleteMenuItem] = useDeleteMenuItemMutation();
  const [toggleAvailability] = useToggleAvailabilityMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    preparationTime: '',
    calories: '',
    isAvailable: true,
  });

  const categories = ['all', 'appetizers', 'main course', 'desserts', 'beverages', 'sides'];

  const items = (data && 'menuItems' in data ? data.menuItems : data && 'items' in data ? data.items : []) || [];
  const filteredItems = items.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        description: item.description,
        price: item.price.toString(),
        category: item.category,
        preparationTime: item.preparationTime?.toString() || '',
        calories: item.calories?.toString() || '',
        isAvailable: item.isAvailable,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        category: 'appetizers',
        preparationTime: '',
        calories: '',
        isAvailable: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        preparationTime: formData.preparationTime ? parseInt(formData.preparationTime) : undefined,
        calories: formData.calories ? parseInt(formData.calories) : undefined,
        isAvailable: formData.isAvailable,
      };

      if (editingItem) {
        await updateMenuItem({ id: editingItem.id, ...payload }).unwrap();
        toast.success('Menu item updated successfully!');
      } else {
        await createMenuItem(payload).unwrap();
        toast.success('Menu item created successfully!');
      }

      handleCloseModal();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to save menu item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;

    try {
      await deleteMenuItem(id).unwrap();
      toast.success('Menu item deleted successfully!');
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete menu item');
    }
  };

  const handleToggleAvailability = async (id: string, isAvailable: boolean) => {
    try {
      await toggleAvailability({ id, isAvailable: !isAvailable }).unwrap();
      toast.success(`Menu item marked as ${!isAvailable ? 'available' : 'unavailable'}`);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update availability');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-40 w-full mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = {
    total: items.length || 0,
    available: items.filter((i: any) => i.isAvailable).length || 0,
    unavailable: items.filter((i: any) => !i.isAvailable).length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your restaurant menu items</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Add Menu Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Items</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">Available</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-gray-600 dark:text-gray-400">Unavailable</div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{stats.unavailable}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input w-full pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item: any) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="aspect-square bg-gradient-to-br from-primary-100 to-secondary-100 dark:from-primary-900/30 dark:to-secondary-900/30 rounded-lg mb-4 flex items-center justify-center">
                <span className="text-6xl">🍽️</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{item.name}</h3>
                  <Badge variant={item.isAvailable ? 'success' : 'danger'}>
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {formatCurrency(item.price)}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">{item.category}</span>
                </div>
                {item.preparationTime && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Prep time: {item.preparationTime} min
                  </div>
                )}
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant={item.isAvailable ? 'secondary' : 'success'}
                    onClick={() => handleToggleAvailability(item.id, item.isAvailable)}
                    className="flex-1"
                  >
                    {item.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleOpenModal(item)}>
                    <PencilIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No menu items found</p>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full min-h-[100px]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
              options={categories.filter(c => c !== 'all').map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Preparation Time (minutes)"
              type="number"
              value={formData.preparationTime}
              onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
            />
            <Input
              label="Calories"
              type="number"
              value={formData.calories}
              onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAvailable"
              checked={formData.isAvailable}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isAvailable" className="text-sm text-gray-700 dark:text-gray-300">
              Available for orders
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit">
              {editingItem ? 'Update' : 'Create'} Menu Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}