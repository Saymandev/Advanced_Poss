import { SetMetadata } from '@nestjs/common';

export const REQUIRES_FEATURE = 'requiresFeature';

/**
 * Decorator to mark routes that require specific subscription features
 * @param features - One or more feature names to check. If multiple features are provided, access is granted if ANY of them are enabled.
 * @example
 * @RequiresFeature('order-management', 'dashboard')
 * @Get('orders')
 * async getOrders() { ... }
 */
export const RequiresFeature = (...features: string[]) => SetMetadata(REQUIRES_FEATURE, features);

