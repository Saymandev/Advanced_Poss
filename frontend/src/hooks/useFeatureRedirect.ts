import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import { getRoleDashboardPath } from '@/utils/getRoleDashboard';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useRolePermissions } from './useRolePermissions';

/**
 * Check if user is super admin
 */
function isSuperAdmin(role?: string | null): boolean {
  if (!role) return false;
  return role.toLowerCase() === UserRole.SUPER_ADMIN.toLowerCase() || role.toLowerCase() === 'super_admin';
}

/**
 * Hook to redirect users away from pages if they don't have required feature access
 * @param requiredFeature - Single feature ID or array of feature IDs (user needs at least one)
 * @param redirectTo - Path to redirect to if user doesn't have access (default: auto-detects role-specific dashboard)
 * @param options - Configuration options
 */
export function useFeatureRedirect(
  requiredFeature: string | string[],
  redirectTo?: string, // Optional - if not provided, uses role-specific dashboard
  options: {
    enabled?: boolean;
    requireAll?: boolean; // If true, user must have ALL features. If false, user needs ANY feature (default: false)
  } = {}
) {
  const router = useRouter();
  const { hasFeature, hasAnyFeature, isLoading } = useRolePermissions();
  const { user } = useAppSelector((state) => state.auth);
  const { enabled = true, requireAll = false } = options;
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  // Get role-specific dashboard path if redirectTo not provided
  const defaultRedirectPath = useMemo(() => {
    return redirectTo || getRoleDashboardPath(user?.role);
  }, [redirectTo, user?.role]);

  useEffect(() => {
    // Don't redirect if disabled, loading, or no user
    if (!enabled || isLoading || !user) {
      return;
    }

    // Super admin bypasses all feature checks
    if (isSuperAdmin(user.role)) {
      setHasAccess(true);
      return;
    }

    // Check feature access for non-super-admin users
    let access = false;
    const features = Array.isArray(requiredFeature) ? requiredFeature : [requiredFeature];

    if (requireAll) {
      // User must have ALL features
      access = features.every(feature => hasFeature(feature));
    } else {
      // User needs at least ONE feature
      access = hasAnyFeature(features);
    }

    setHasAccess(access);

    // Redirect if no access
    if (!access) {
      router.replace(defaultRedirectPath);
    }
  }, [enabled, isLoading, user, requiredFeature, hasFeature, hasAnyFeature, requireAll, defaultRedirectPath, router]);

  return {
    hasAccess,
    isLoading,
  };
}

/**
 * Hook to check feature access and optionally redirect
 * Returns access status without redirecting (useful for conditional rendering)
 */
export function useFeatureAccess(
  requiredFeature: string | string[],
  options: {
    requireAll?: boolean;
  } = {}
) {
  const { hasFeature, hasAnyFeature, isLoading } = useRolePermissions();
  const { requireAll = false } = options;
  
  const hasAccess = useMemo(() => {
    if (isLoading) return null;
    
    const features = Array.isArray(requiredFeature) ? requiredFeature : [requiredFeature];
    
    if (requireAll) {
      return features.every(feature => hasFeature(feature));
    } else {
      return hasAnyFeature(features);
    }
  }, [isLoading, requiredFeature, requireAll, hasFeature, hasAnyFeature]);

  return {
    hasAccess,
    isLoading,
  };
}

