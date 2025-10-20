"use client";
import { useAuth } from '@/lib/hooks/useAuth';
import Link from 'next/link';

export function Sidebar() {
  const { user } = useAuth()
  return (
    <aside className="h-full p-4 space-y-3">
      <div className="font-semibold">Advanced POS</div>
      <nav className="flex flex-col gap-2 text-sm">
        <Link className="underline" href="/dashboard">Dashboard</Link>
        <Link className="underline" href="/orders">Orders</Link>
        <Link className="underline" href="/menu-items">Menu Items</Link>
        <Link className="underline" href="/tables">Tables</Link>
        <Link className="underline" href="/customers">Customers</Link>
      </nav>
      {user && (
        <div className="text-xs text-muted-foreground">Role: {user.role}</div>
      )}
    </aside>
  )
}


