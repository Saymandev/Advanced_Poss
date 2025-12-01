import { useGetMyPermissionsQuery, useGetRolePermissionsQuery } from '@/lib/api/endpoints/rolePermissionsApi';
import { UserRole } from '@/lib/enums/user-role.enum';
import { useAppSelector } from '@/lib/store';
import { useMemo } from 'react';

/**
 * Check if user is super admin
 */
function isSuperAdmin(role?: string | null): boolean {
  if (!role) return false;
  return role.toLowerCase() === UserRole.SUPER_ADMIN.toLowerCase() || role.toLowerCase() === 'super_admin';
}

export function useRolePermissions() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const companyId = user?.companyId || companyContext?.companyId || null;
  const userRole = user?.role?.toLowerCase();
  const isSuperAdminUser = isSuperAdmin(user?.role);
  const isOwnerOrAdmin = user?.role?.toLowerCase() === 'owner' || isSuperAdminUser;

  // Super admin doesn't need permissions check - they have access to everything
  // Skip permission queries for super admin
  const { data: myPermissions, isLoading: isLoadingMy, refetch: refetchMy } = useGetMyPermissionsQuery(
    undefined,
    { skip: !companyId || !userRole || isSuperAdminUser }
  );

  const { data: allRolePermissions, isLoading: isLoadingAll } = useGetRolePermissionsQuery(
    undefined,
    { skip: !companyId || !userRole || !isOwnerOrAdmin } // Only fetch all permissions if owner/admin
  );

  // Primary loading state is based on my-permissions query
  // allRolePermissions is only for role-access page, not needed for sidebar
  // Super admin doesn't need to load permissions
  const isLoading = isSuperAdminUser ? false : isLoadingMy;

  // Use my-permissions directly (available to all users)
  // For owners/admins, we can use allRolePermissions if needed, but myPermissions should work
  const userPermissions = useMemo(() => {
    // Prioritize my-permissions endpoint (works for all users)
    if (myPermissions) {
      return myPermissions;
    }
    
    // Fallback: if owner/admin and we have all permissions, find user's role
    if (allRolePermissions && userRole) {
      return allRolePermissions.find((perm) => perm.role === userRole) || null;
    }
    
    return null;
  }, [myPermissions, allRolePermissions, userRole]);

  // Check if user has access to a specific feature
  const hasFeature = (featureId: string): boolean => {
    // Super admin has access to everything
    if (isSuperAdminUser) return true;
    if (!userPermissions) return false;
    return userPermissions.features.includes(featureId);
  };

  // Check if user has access to any of the provided features
  const hasAnyFeature = (featureIds: string[]): boolean => {
    // Super admin has access to everything
    if (isSuperAdminUser) return true;
    if (!userPermissions) return false;
    return featureIds.some((id) => userPermissions.features.includes(id));
  };

  // Get all features user has access to
  const userFeatures = useMemo(() => {
    return userPermissions?.features || [];
  }, [userPermissions]);

  const refetch = () => {
    refetchMy();
    if (isOwnerOrAdmin) {
      // Note: refetch all permissions if owner/admin (but useGetRolePermissionsQuery doesn't expose refetch directly)
      // The refetchMy should be sufficient as it invalidates cache
    }
  };

  return {
    permissions: userPermissions,
    userFeatures,
    hasFeature,
    hasAnyFeature,
    isLoading,
    refetch,
  };
}

