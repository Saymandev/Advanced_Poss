import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Request } from 'express';
import { Model, Schema as MongooseSchema, Types } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionLimits,
  SubscriptionStatus,
} from '../../modules/subscriptions/schemas/subscription.schema';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';
import { REQUIRES_LIMIT } from '../decorators/requires-limit.decorator';

@Injectable()
export class SubscriptionLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionsService: SubscriptionsService,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredLimit = this.reflector.get<keyof SubscriptionLimits>(
      REQUIRES_LIMIT,
      context.getHandler(),
    );

    if (!requiredLimit) {
      return true; // No limit requirement, allow access
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    if (!user || !user.companyId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Fetch the actual subscription document
    // CRITICAL: Only allow ACTIVE or TRIAL subscriptions, exclude EXPIRED, CANCELLED, PAST_DUE, PAUSED
    const companyIdObj = new Types.ObjectId(user.companyId);
    const companyId = companyIdObj as unknown as MongooseSchema.Types.ObjectId;
    const subscription = await this.subscriptionModel
      .findOne({
        companyId: companyIdObj,
        isActive: true,
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      })
      .lean()
      .exec();

    if (!subscription) {
      throw new ForbiddenException(
        'Active subscription not found. Your subscription may have expired or been cancelled.',
      );
    }

    // Check if limit is reached
    const limitCheck = await this.subscriptionsService.checkLimit(
      companyId,
      requiredLimit,
    );

    // If limit is -1, it means unlimited, so always allow
    if (limitCheck.limit === -1) {
      return true;
    }

    // Check if limit is reached
    if (limitCheck.reached) {
      const limitName = this.getLimitDisplayName(requiredLimit);
      throw new BadRequestException(
        `You have reached the maximum limit of ${limitCheck.limit} ${limitName} for your subscription plan. Current usage: ${limitCheck.current}/${limitCheck.limit}. Please upgrade your plan to create more ${limitName}.`,
      );
    }

    return true;
  }

  private getLimitDisplayName(limitType: keyof SubscriptionLimits): string {
    const displayNames: Record<keyof SubscriptionLimits, string> = {
      maxBranches: 'branches',
      maxUsers: 'users',
      maxTables: 'tables',
      maxMenuItems: 'menu items',
      maxOrders: 'orders',
      maxCustomers: 'customers',
      aiInsightsEnabled: 'AI insights',
      advancedReportsEnabled: 'advanced reports',
      multiLocationEnabled: 'multi-location',
      apiAccessEnabled: 'API access',
      whitelabelEnabled: 'whitelabel',
      customDomainEnabled: 'custom domain',
      prioritySupportEnabled: 'priority support',
      storageGB: 'storage',
      publicOrderingEnabled: 'public ordering',
      maxPublicBranches: 'public branches',
      reviewsEnabled: 'reviews',
      reviewModerationRequired: 'review moderation',
      maxReviewsPerMonth: 'reviews per month',
    };

    return displayNames[limitType] || limitType;
  }
}

