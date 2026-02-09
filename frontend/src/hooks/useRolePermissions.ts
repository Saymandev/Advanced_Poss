import { usePermissions } from './usePermissions';
import { useGetMyPermissionsQuery } from '@/lib/api/endpoints/rolePermissionsApi';
import { useAppSelector } from '@/lib/store';
import { useMemo } from 'react';

export function useRolePermissions() {
  const { user } = useAppSelector((state) => state.auth);
  // Get permissions from the new hook/store
  const { permissions: storePermissions, can, canAny, isSuperAdmin } = usePermissions();

  // Keep the query for now as a fallback or for background updates, but rely on store primarily
  // If store has permissions, we don't strictly need the query, but it helps to keep them fresh
  const { data: apiPermissions, isLoading: isLoadingApi, refetch: refetchApi } = useGetMyPermissionsQuery(
    undefined,
    { skip: !user || isSuperAdmin || (user.permissions && user.permissions.length > 0) }
  );

  // Combine permissions (prefer store, fallback to API)
  const userFeatures = useMemo(() => {
    if (isSuperAdmin) return []; // Super admin has access to everything effectively

    if (user?.permissions && user.permissions.length > 0) {
      return user.permissions;
    }

    if (apiPermissions?.features) {
      return apiPermissions.features;
    }

    return storePermissions || [];
  }, [user?.permissions, apiPermissions, storePermissions, isSuperAdmin]);

  // Check if user has access to a specific feature
  const hasFeature = (featureId: string): boolean => {
    if (isSuperAdmin) return true;
    return userFeatures.includes(featureId);
  };

  // Check if user has access to any of the provided features
  const hasAnyFeature = (featureIds: string[]): boolean => {
    if (isSuperAdmin) return true;
    return featureIds.some(id => userFeatures.includes(id));
  };

  const refetch = () => {
    refetchApi();
  };

  return {
    permissions: { features: userFeatures }, // Adapter for old interface expecting object
    userFeatures,
    hasFeature,
    hasAnyFeature,
    isLoading: isSuperAdmin ? false : (isLoadingApi && (!user?.permissions || user.permissions.length === 0)),
    refetch,
  };
}

