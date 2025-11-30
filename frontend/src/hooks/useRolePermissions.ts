import { useGetMyPermissionsQuery, useGetRolePermissionsQuery } from '@/lib/api/endpoints/rolePermissionsApi';
import { useAppSelector } from '@/lib/store';
import { useMemo } from 'react';

export function useRolePermissions() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  const companyId = user?.companyId || companyContext?.companyId || null;
  const userRole = user?.role?.toLowerCase();
  const isOwnerOrAdmin = user?.role?.toLowerCase() === 'owner' || user?.role?.toLowerCase() === 'super_admin';

  // Use my-permissions endpoint for all users (more efficient)
  // Fallback to getRolePermissions for owners/admins if needed
  const { data: myPermissions, isLoading: isLoadingMy, refetch: refetchMy } = useGetMyPermissionsQuery(
    undefined,
    { skip: !companyId || !userRole }
  );

  const { data: allRolePermissions, isLoading: isLoadingAll } = useGetRolePermissionsQuery(
    undefined,
    { skip: !companyId || !userRole || !isOwnerOrAdmin } // Only fetch all permissions if owner/admin
  );

  // Primary loading state is based on my-permissions query
  // allRolePermissions is only for role-access page, not needed for sidebar
  const isLoading = isLoadingMy;

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
    if (!userPermissions) return false;
    return userPermissions.features.includes(featureId);
  };

  // Check if user has access to any of the provided features
  const hasAnyFeature = (featureIds: string[]): boolean => {
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

