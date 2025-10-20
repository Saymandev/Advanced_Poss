"use client";
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useListOrdersQuery } from '@/lib/api/endpoints/ordersApi';

export default function OrdersPage() {
  const { data, isLoading, isError } = useListOrdersQuery(undefined)

  return (
    <ProtectedRoute>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Orders</h1>
        {isLoading && <div className="animate-pulse h-6 w-48 bg-gray-300 rounded" />}
        {isError && <div className="text-red-600">Failed to load orders</div>}
        <ul className="space-y-2">
          {(Array.isArray((data as any)?.data) ? (data as any).data : (data as any))?.map((o: any) => (
            <li key={o.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">Order {o.id}</div>
                <div className="text-sm text-muted-foreground">Status: {o.status}</div>
              </div>
              <div className="text-sm">Items: {o.items?.length ?? 0}</div>
            </li>
          ))}
        </ul>
      </div>
    </ProtectedRoute>
  )
}


