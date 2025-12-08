import { SetMetadata } from '@nestjs/common';
import { SubscriptionLimits } from '../../modules/subscriptions/schemas/subscription.schema';

export const REQUIRES_LIMIT = 'requiresLimit';

/**
 * Decorator to mark routes that require checking a subscription limit before allowing creation
 * @param limitType - Limit type to check (e.g., 'maxBranches', 'maxUsers', 'maxTables', 'maxMenuItems')
 * @example
 * @RequiresLimit('maxBranches')
 * @Post()
 * async createBranch() { ... }
 */
export const RequiresLimit = (limitType: keyof SubscriptionLimits) =>
  SetMetadata(REQUIRES_LIMIT, limitType);

