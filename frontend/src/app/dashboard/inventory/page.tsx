'use client';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function InventoryPage() {
  const mockIngredients = [
    { id: '1', name: 'Tomatoes', quantity: 25, unit: 'kg', minStock: 10, status: 'in-stock', lastRestocked: '2024-01-15' },
    { id: '2', name: 'Chicken Breast', quantity: 8, unit: 'kg', minStock: 15, status: 'low-stock', lastRestocked: '2024-01-10' },
    { id: '3', name: 'Olive Oil', quantity: 5, unit: 'L', minStock: 3, status: 'in-stock', lastRestocked: '2024-01-12' },
    { id: '4', name: 'Cheese', quantity: 3, unit: 'kg', minStock: 8, status: 'critical', lastRestocked: '2024-01-08' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'low-stock':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track ingredients and supplies</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">Import</Button>
          <Button>
            <PlusIcon className="w-5 h-5 mr-2" />
            Add Ingredient
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">156</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">132</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">In Stock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">18</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Low Stock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">6</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Critical</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-yellow-300 dark:border-yellow-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
            <ExclamationTriangleIcon className="w-5 h-5" />
            Low Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockIngredients.filter(i => i.status !== 'in-stock').map((item) => (
              <div key={item.id} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Current: {item.quantity} {item.unit} | Min: {item.minStock} {item.unit}
                  </p>
                </div>
                <Button size="sm">Restock</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Quantity</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Min Stock</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Last Restocked</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockIngredients.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="py-3 px-4">{item.quantity} {item.unit}</td>
                    <td className="py-3 px-4">{item.minStock} {item.unit}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(item.status)}`}>
                        {item.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{item.lastRestocked}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm">Edit</Button>
                        <Button variant="ghost" size="sm">Adjust</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

