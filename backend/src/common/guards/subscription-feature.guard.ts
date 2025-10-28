import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { SubscriptionPlansService } from '../../modules/subscriptions/subscription-plans.service';
import { REQUIRES_FEATURE } from '../decorators/requires-feature.decorator';

@Injectable()
export class SubscriptionFeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionPlansService: SubscriptionPlansService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeature = this.reflector.get<string>(
      REQUIRES_FEATURE,
      context.getHandler(),
    );

    if (!requiredFeature) {
      return true; // No feature requirement, allow access
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user || !user.companyId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get subscription info from middleware (set by SubscriptionLockMiddleware)
    const subscription = (request as any).subscription;
    if (!subscription || !subscription.plan) {
      throw new ForbiddenException('Subscription plan not found');
    }

    // Get plan details
    const plan = await this.subscriptionPlansService.findByName(subscription.plan);
    if (!plan) {
      throw new ForbiddenException('Subscription plan not found');
    }

    // Check if feature is enabled
    const features = plan.features || {};
    const isFeatureEnabled = features[requiredFeature as keyof typeof features];

    if (!isFeatureEnabled) {
      throw new ForbiddenException(
        `Feature '${requiredFeature}' is not available in your ${plan.displayName} plan. Please upgrade to access this feature.`,
      );
    }

    return true;
  }
}

