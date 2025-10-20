"use client";
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import type { UserRole } from '@/lib/slices/authSlice';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const sample = [
  { name: 'Mon', sales: 1200 },
  { name: 'Tue', sales: 1800 },
  { name: 'Wed', sales: 900 },
  { name: 'Thu', sales: 2100 },
  { name: 'Fri', sales: 1600 },
]

export default function Dashboard() {
  const allowed: UserRole[] = ['super_admin','owner','manager']
  return (
    <ProtectedRoute>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <ThemeToggle />
        </div>
        <RoleGuard allow={allowed}>
          <div className="w-full h-64 border rounded">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sample}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#4f46e5" fill="#6366f1" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </RoleGuard>
      </div>
    </ProtectedRoute>
  )
}


