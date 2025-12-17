import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument, SubscriptionStatus } from '../../modules/subscriptions/schemas/subscription.schema';
import { SubscriptionPlansService } from '../../modules/subscriptions/subscription-plans.service';
import { isFeatureEnabledInPlan } from '../../modules/subscriptions/utils/plan-features.helper';
import { REQUIRES_FEATURE } from '../decorators/requires-feature.decorator';
import { isSuperAdmin } from '../utils/query.utils';

@Injectable()
export class SubscriptionFeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionPlansService: SubscriptionPlansService,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
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

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super admin bypasses all subscription feature checks
    if (isSuperAdmin(user.role)) {
      return true;
    }

    if (!user.companyId) {
      throw new ForbiddenException('User not authenticated with company');
    }

    // Fetch the actual subscription document
    // CRITICAL: Only allow ACTIVE or TRIAL subscriptions, exclude EXPIRED, CANCELLED, PAST_DUE, PAUSED
    const companyId = new Types.ObjectId(user.companyId);
    const subscription = await this.subscriptionModel
      .findOne({
        companyId,
        isActive: true,
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      })
      .lean()
      .exec();

    if (!subscription) {
      throw new ForbiddenException('Active subscription not found. Your subscription may have expired or been cancelled.');
    }

    // Check if feature-based subscription (new flexible model)
    if (subscription.enabledFeatures && subscription.enabledFeatures.length > 0) {
      // Feature-based: Check if required feature is in enabledFeatures array
      const isFeatureEnabled = subscription.enabledFeatures.includes(requiredFeature);

      if (!isFeatureEnabled) {
        throw new ForbiddenException(
          `Feature '${requiredFeature}' is not enabled in your subscription. Please contact support to enable this feature.`,
        );
      }

      return true;
    }

    // Legacy plan-based subscription
    if (!subscription.plan) {
      throw new ForbiddenException('Subscription plan not found');
    }

    // Get plan details
    const plan = await this.subscriptionPlansService.findByName(subscription.plan);
    if (!plan) {
      throw new ForbiddenException('Subscription plan not found');
    }

    // Check if feature is enabled in plan (using new enabledFeatureKeys or legacy features)
    const isFeatureEnabled = isFeatureEnabledInPlan(plan, requiredFeature);

    if (!isFeatureEnabled) {
      throw new ForbiddenException(
        `Feature '${requiredFeature}' is not available in your ${plan.displayName} plan. Please upgrade to access this feature.`,
      );
    }

    return true;
  }
}

