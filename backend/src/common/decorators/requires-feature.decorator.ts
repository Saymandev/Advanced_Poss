import { SetMetadata } from '@nestjs/common';

export const REQUIRES_FEATURE = 'requiresFeature';

/**
 * Decorator to mark routes that require a specific subscription feature
 * @param feature - Feature name to check (e.g., 'aiInsights', 'multiBranch', 'inventory')
 * @example
 * @RequiresFeature('aiInsights')
 * @Get('ai-insights')
 * async getAIInsights() { ... }
 */
export const RequiresFeature = (feature: string) => SetMetadata(REQUIRES_FEATURE, feature);

