import { UserRole } from '@/lib/enums/user-role.enum';

/**
 * Get the default dashboard route for a user role
 * @param role - User role (case-insensitive)
 * @returns Dashboard route path
 */
export function getRoleDashboardPath(role: string | undefined | null): string {
  if (!role) {
    return '/dashboard';
  }

  const normalizedRole = role.toLowerCase().trim();

  // Map roles to their dashboard paths
  const roleDashboardMap: Record<string, string> = {
    [UserRole.SUPER_ADMIN.toLowerCase()]: '/dashboard/super-admin', // Super admin uses dedicated dashboard
    [UserRole.OWNER.toLowerCase()]: '/dashboard', // Owner uses main dashboard
    // Managers should also use the main dashboard instead of a separate manager page
    [UserRole.MANAGER.toLowerCase()]: '/dashboard',
    [UserRole.CHEF.toLowerCase()]: '/dashboard/kitchen',
    [UserRole.KITCHEN.toLowerCase()]: '/dashboard/kitchen', // Alias for kitchen staff
    [UserRole.WAITER.toLowerCase()]: '/dashboard/pos', // Waiters use POS for order taking
    [UserRole.CASHIER.toLowerCase()]: '/dashboard/pos', // Cashiers use POS for payments
  };

  return roleDashboardMap[normalizedRole] || '/dashboard';
}

