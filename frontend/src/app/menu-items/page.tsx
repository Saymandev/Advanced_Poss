"use client";
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useListMenuItemsQuery } from '@/lib/api/endpoints/menuItemsApi';

export default function MenuItemsPage() {
  const { data, isLoading, isError } = useListMenuItemsQuery(undefined)

  return (
    <ProtectedRoute>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Menu Items</h1>
        {isLoading && <div className="animate-pulse h-6 w-48 bg-gray-300 rounded" />}
        {isError && <div className="text-red-600">Failed to load menu items</div>}
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Array.isArray((data as any)?.data) ? (data as any).data : (data as any))?.map((m: any) => (
            <li key={m.id} className="border rounded p-3">
              <div className="font-medium">{m.name}</div>
              <div className="text-sm text-muted-foreground">${m.price}</div>
            </li>
          ))}
        </ul>
      </div>
    </ProtectedRoute>
  )
}


