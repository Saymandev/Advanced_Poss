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
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.get<string | string[]>(
      REQUIRES_FEATURE,
      context.getHandler(),
    );

    if (!requiredFeatures) {
      return true; // No feature requirement, allow access
    }

    // Convert to array if it's a single string for backward compatibility
    const features = Array.isArray(requiredFeatures) ? requiredFeatures : [requiredFeatures];

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

    // Check if user has ANY of the required features enabled in their subscription
    let isAnyFeatureEnabled = false;

    for (const feature of features) {
      let isFeatureEnabled = false;
      if (subscription.enabledFeatures && subscription.enabledFeatures.length > 0) {
        isFeatureEnabled = subscription.enabledFeatures.includes(feature);
      }

      if (!isFeatureEnabled && subscription.plan) {
        const plan = await this.subscriptionPlansService.findByName(subscription.plan);
        if (plan) {
          isFeatureEnabled = isFeatureEnabledInPlan(plan, feature);
        }
      }

      if (isFeatureEnabled) {
        isAnyFeatureEnabled = true;
        break;
      }
    }

    // If none of the required features are found, block access
    if (!isAnyFeatureEnabled) {
      const featureList = features.join(' or ');
      if (subscription.plan) {
        const plan = await this.subscriptionPlansService.findByName(subscription.plan);
        throw new ForbiddenException(
          `Feature(s) '${featureList}' is not available in your ${plan?.displayName || subscription.plan} plan. Please upgrade to access this feature.`,
        );
      } else {
        throw new ForbiddenException(
          `Feature(s) '${featureList}' is not enabled in your subscription. Please contact support to enable this feature.`,
        );
      }
    }

    return true;
  }
}

