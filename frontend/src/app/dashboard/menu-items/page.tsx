'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useAppSelector } from '@/lib/store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
    ClockIcon,
    EyeIcon,
    PencilIcon,
    PlusIcon,
    ShoppingBagIcon
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subcategory?: string;
  imageUrl?: string;
  isAvailable: boolean;
  preparationTime?: number; // in minutes
  ingredients?: string[];
  allergens?: string[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  tags?: string[];
  popularity?: number; // 1-5 stars based on orders
  createdAt: string;
  updatedAt: string;
}

// Mock data for demonstration
const mockMenuItems: MenuItem[] = [
  {
    id: '1',
    name: 'Grilled Salmon',
    description: 'Fresh Atlantic salmon grilled to perfection with lemon herb seasoning',
    price: 24.99,
    category: 'Main Course',
    subcategory: 'Seafood',
    isAvailable: true,
    preparationTime: 15,
    ingredients: ['Salmon', 'Lemon', 'Herbs', 'Olive Oil'],
    allergens: ['Fish'],
    nutritionalInfo: { calories: 320, protein: 28, carbs: 2, fat: 22 },
    tags: ['Gluten-Free', 'Keto-Friendly'],
    popularity: 4.5,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Caesar Salad',
    description: 'Crisp romaine lettuce with Caesar dressing, croutons, and parmesan cheese',
    price: 12.99,
    category: 'Appetizer',
    subcategory: 'Salads',
    isAvailable: true,
    preparationTime: 8,
    ingredients: ['Romaine Lettuce', 'Caesar Dressing', 'Croutons', 'Parmesan'],
    allergens: ['Dairy', 'Gluten'],
    nutritionalInfo: { calories: 180, protein: 8, carbs: 12, fat: 14 },
    tags: ['Vegetarian'],
    popularity: 4.2,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '3',
    name: 'Chicken Parmesan',
    description: 'Breaded chicken breast topped with marinara sauce and melted mozzarella',
    price: 18.99,
    category: 'Main Course',
    subcategory: 'Poultry',
    isAvailable: true,
    preparationTime: 20,
    ingredients: ['Chicken Breast', 'Breadcrumbs', 'Marinara Sauce', 'Mozzarella'],
    allergens: ['Dairy', 'Gluten'],
    nutritionalInfo: { calories: 450, protein: 35, carbs: 25, fat: 28 },
    popularity: 4.8,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '4',
    name: 'Chocolate Lava Cake',
    description: 'Warm chocolate cake with a molten center, served with vanilla ice cream',
    price: 8.99,
    category: 'Dessert',
    isAvailable: false,
    preparationTime: 12,
    ingredients: ['Chocolate', 'Flour', 'Eggs', 'Sugar', 'Vanilla Ice Cream'],
    allergens: ['Dairy', 'Gluten', 'Eggs'],
    nutritionalInfo: { calories: 380, protein: 6, carbs: 45, fat: 22 },
    tags: ['Vegetarian'],
    popularity: 4.9,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
];

export default function MenuItemsPage() {
  const { user } = useAppSelector((state) => state.auth);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockMenuItems);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const handleAvailabilityToggle = (itemId: string) => {
    setMenuItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, isAvailable: !item.isAvailable, updatedAt: new Date().toISOString() }
        : item
    ));
    toast.success('Menu item availability updated');
  };

  const openEditModal = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsEditModalOpen(true);
  };

  const openViewModal = (item: MenuItem) => {
    setSelectedMenuItem(item);
    setIsViewModalOpen(true);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-sm ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      >
        ★
      </span>
    ));
  };

  const columns = [
    {
      key: 'name',
      title: 'Menu Item',
      sortable: true,
      render: (value: string, row: MenuItem) => (
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
            <ShoppingBagIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{value}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{row.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'price',
      title: 'Price',
      align: 'right' as const,
      render: (value: number) => (
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatCurrency(value)}
          </p>
        </div>
      ),
    },
    {
      key: 'preparationTime',
      title: 'Prep Time',
      align: 'center' as const,
      render: (value: number) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <ClockIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{value} min</span>
          </div>
        </div>
      ),
    },
    {
      key: 'popularity',
      title: 'Popularity',
      align: 'center' as const,
      render: (value: number) => (
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            {renderStars(value || 0)}
            <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
              ({value?.toFixed(1) || '0.0'})
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'isAvailable',
      title: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'danger'}>
          {value ? 'Available' : 'Unavailable'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (value: any, row: MenuItem) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openViewModal(row)}
          >
            <EyeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(row)}
          >
            <PencilIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAvailabilityToggle(row.id)}
            className={row.isAvailable ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
          >
            {row.isAvailable ? 'Disable' : 'Enable'}
          </Button>
        </div>
      ),
    },
  ];

  const stats = {
    total: menuItems.length,
    available: menuItems.filter(i => i.isAvailable).length,
    unavailable: menuItems.filter(i => !i.isAvailable).length,
    avgPrepTime: menuItems.reduce((sum, item) => sum + (item.preparationTime || 0), 0) / menuItems.length,
    avgPopularity: menuItems.reduce((sum, item) => sum + (item.popularity || 0), 0) / menuItems.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your restaurant menu items and pricing
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="w-5 h-5 mr-2" />
          Add Menu Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <ShoppingBagIcon className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
                <p className="text-3xl font-bold text-green-600">{stats.available}</p>
              </div>
              <ShoppingBagIcon className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unavailable</p>
                <p className="text-3xl font-bold text-red-600">{stats.unavailable}</p>
              </div>
              <ShoppingBagIcon className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Prep Time</p>
                <p className="text-3xl font-bold text-purple-600">{stats.avgPrepTime.toFixed(0)} min</p>
              </div>
              <ClockIcon className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Popularity</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.avgPopularity.toFixed(1)}⭐</p>
              </div>
              <ShoppingBagIcon className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Categories' },
                  { value: 'Appetizer', label: 'Appetizer' },
                  { value: 'Main Course', label: 'Main Course' },
                  { value: 'Dessert', label: 'Dessert' },
                  { value: 'Beverage', label: 'Beverage' },
                ]}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="Filter by category"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={[
                  { value: 'all', label: 'All Items' },
                  { value: 'available', label: 'Available' },
                  { value: 'unavailable', label: 'Unavailable' },
                ]}
                value={availabilityFilter}
                onChange={setAvailabilityFilter}
                placeholder="Filter by availability"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Table */}
      <DataTable
        data={menuItems}
        columns={columns}
        loading={false}
        searchable={false}
        selectable={true}
        pagination={{
          currentPage,
          totalPages: Math.ceil(menuItems.length / itemsPerPage),
          itemsPerPage,
          totalItems: menuItems.length,
          onPageChange: setCurrentPage,
          onItemsPerPageChange: setItemsPerPage,
        }}
        exportable={true}
        exportFilename="menu-items"
        onExport={(format, items) => {
          console.log(`Exporting ${items.length} menu items as ${format}`);
        }}
        emptyMessage="No menu items found."
      />

      {/* Menu Item Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedMenuItem(null);
        }}
        title="Menu Item Details"
        className="max-w-4xl"
      >
        {selectedMenuItem && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <ShoppingBagIcon className="w-12 h-12 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedMenuItem.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedMenuItem.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">
                      {formatCurrency(selectedMenuItem.price)}
                    </p>
                    <Badge variant={selectedMenuItem.isAvailable ? 'success' : 'danger'} className="mt-2">
                      {selectedMenuItem.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedMenuItem.preparationTime} min prep
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(selectedMenuItem.popularity || 0)}
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                      ({selectedMenuItem.popularity?.toFixed(1) || '0.0'})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ingredients */}
              {selectedMenuItem.ingredients && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Ingredients</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMenuItem.ingredients.map((ingredient, index) => (
                      <Badge key={index} variant="secondary">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergens */}
              {selectedMenuItem.allergens && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Allergens</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMenuItem.allergens.map((allergen, index) => (
                      <Badge key={index} variant="warning">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Nutritional Info */}
              {selectedMenuItem.nutritionalInfo && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Nutritional Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedMenuItem.nutritionalInfo.calories && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Calories:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedMenuItem.nutritionalInfo.calories}
                        </span>
                      </div>
                    )}
                    {selectedMenuItem.nutritionalInfo.protein && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Protein:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedMenuItem.nutritionalInfo.protein}g
                        </span>
                      </div>
                    )}
                    {selectedMenuItem.nutritionalInfo.carbs && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Carbs:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedMenuItem.nutritionalInfo.carbs}g
                        </span>
                      </div>
                    )}
                    {selectedMenuItem.nutritionalInfo.fat && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Fat:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedMenuItem.nutritionalInfo.fat}g
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedMenuItem.tags && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMenuItem.tags.map((tag, index) => (
                      <Badge key={index} variant="info">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Created: {formatDateTime(selectedMenuItem.createdAt)}
                <br />
                Last updated: {formatDateTime(selectedMenuItem.updatedAt)}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedMenuItem(null);
                }}
              >
                Close
              </Button>
              <Button onClick={() => openEditModal(selectedMenuItem)}>
                Edit Item
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create/Edit Menu Item Modal */}
      <Modal
        isOpen={isCreateModalOpen || isEditModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedMenuItem(null);
        }}
        title={isEditModalOpen ? 'Edit Menu Item' : 'Create Menu Item'}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Menu item creation/editing functionality would be implemented here with full form fields for all menu item properties.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedMenuItem(null);
              }}
            >
              Cancel
            </Button>
            <Button>
              {isEditModalOpen ? 'Update' : 'Create'} Menu Item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
