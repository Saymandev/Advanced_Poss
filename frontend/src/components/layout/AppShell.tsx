"use client";
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] grid-rows-[56px_1fr]">
      <div className="row-span-2 border-r">
        <Sidebar />
      </div>
      <div className="border-b">
        <Topbar />
      </div>
      <main className="p-6">
        {children}
      </main>
    </div>
  )
}


