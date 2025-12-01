import { UserRole } from '../enums/user-role.enum';

/**
 * Check if a role is super admin
 */
export function isSuperAdmin(role?: string | null): boolean {
  if (!role) return false;
  return role.toLowerCase() === UserRole.SUPER_ADMIN.toLowerCase() || role.toLowerCase() === 'super_admin';
}

/**
 * Helper to conditionally apply company filter based on user role
 * If user is super_admin, allow querying without companyId (returns all companies)
 * If user is not super_admin, require companyId filtering
 * 
 * @param query - The MongoDB query object to modify
 * @param userRole - The user's role
 * @param companyId - The companyId to filter by (optional for super_admin)
 * @returns The modified query with appropriate company filtering
 */
export function applyCompanyFilter(
  query: any,
  userRole?: string | null,
  companyId?: string | null,
): any {
  // Super admin can query all companies if no companyId provided
  if (isSuperAdmin(userRole)) {
    // Only apply companyId filter if explicitly provided
    if (companyId) {
      query.companyId = companyId;
    }
    // If no companyId provided, don't filter by companyId (return all companies)
    return query;
  }

  // Non-super-admin users MUST filter by companyId
  if (!companyId) {
    throw new Error('Company ID is required for non-super-admin users');
  }

  query.companyId = companyId;
  return query;
}

/**
 * Helper to conditionally apply branch filter based on user role
 * Super admin can query across all branches if no branchId provided
 * 
 * @param query - The MongoDB query object to modify
 * @param userRole - The user's role
 * @param branchId - The branchId to filter by (optional for super_admin)
 * @returns The modified query with appropriate branch filtering
 */
export function applyBranchFilter(
  query: any,
  userRole?: string | null,
  branchId?: string | null,
): any {
  // Super admin can query all branches if no branchId provided
  if (isSuperAdmin(userRole)) {
    // Only apply branchId filter if explicitly provided
    if (branchId) {
      query.branchId = branchId;
    }
    // If no branchId provided, don't filter by branchId
    return query;
  }

  // Non-super-admin users - apply branchId if provided
  if (branchId) {
    query.branchId = branchId;
  }

  return query;
}

/**
 * Helper to remove company and branch filters for super admin queries
 * Useful for system-wide queries
 * 
 * @param query - The MongoDB query object to modify
 * @param userRole - The user's role
 * @returns The modified query with filters removed if super admin
 */
export function bypassFiltersForSuperAdmin(query: any, userRole?: string | null): any {
  if (isSuperAdmin(userRole)) {
    delete query.companyId;
    delete query.branchId;
  }
  return query;
}

