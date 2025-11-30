import { SetMetadata } from '@nestjs/common';

export const REQUIRES_ROLE_FEATURE = 'requiresRoleFeature';

/**
 * Decorator to mark routes that require a specific role feature permission
 * @param feature - Feature ID to check (e.g., 'expenses', 'order-management', 'inventory')
 * @example
 * @RequiresRoleFeature('expenses')
 * @Get()
 * async getExpenses() { ... }
 */
export const RequiresRoleFeature = (feature: string) => SetMetadata(REQUIRES_ROLE_FEATURE, feature);

