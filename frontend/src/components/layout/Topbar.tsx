"use client";
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/lib/hooks/useAuth';

export function Topbar() {
  const { user } = useAuth()
  return (
    <header className="h-14 px-4 flex items-center justify-between">
      <div className="text-sm text-muted-foreground">Welcome {user ? user.firstName : 'Guest'}</div>
      <ThemeToggle />
    </header>
  )
}


