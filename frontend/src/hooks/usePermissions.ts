import { useAppSelector } from '../lib/store';
import { useMemo } from 'react';

/**
 * Hook to check if the current user has specific permissions.
 * 
 * Usage:
 * const { can, hasRole, isSuperAdmin, permissions } = usePermissions();
 * 
 * if (can('view_reports')) { ... }
 * if (hasRole('admin')) { ... }
 */
export const usePermissions = () => {
    const { user } = useAppSelector((state) => state.auth);

    const permissions = useMemo(() => {
        return user?.permissions || [];
    }, [user]);

    const isSuperAdmin = useMemo(() => {
        return user?.isSuperAdmin === true || user?.role === 'super_admin';
    }, [user]);

    /**
     * Check if user has a specific permission/feature enabled.
     * Super admins always return true.
     */
    const can = (permission: string): boolean => {
        if (isSuperAdmin) return true;
        return permissions.includes(permission);
    };

    /**
     * Check if user has one of the provided permissions.
     */
    const canAny = (permissionsList: string[]): boolean => {
        if (isSuperAdmin) return true;
        return permissionsList.some(p => permissions.includes(p));
    };

    /**
     * Check if user has a specific role.
     */
    const hasRole = (role: string): boolean => {
        if (isSuperAdmin) return true; // Super admin has all roles effectively
        return user?.role === role;
    };

    /**
     * Check if user handles a specific set of roles
     */
    const hasAnyRole = (roles: string[]): boolean => {
        if (isSuperAdmin) return true;
        return roles.includes(user?.role || '');
    }

    return {
        user,
        permissions,
        isSuperAdmin,
        can,
        canAny,
        hasRole,
        hasAnyRole
    };
};
