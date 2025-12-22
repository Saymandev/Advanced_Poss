import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Schema as MongooseSchema, Types } from 'mongoose';
// import { WinstonLoggerService } from '../../common/logger/winston.logger';
import { Branch, BranchDocument } from '../branches/schemas/branch.schema';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { MenuItem, MenuItemDocument } from '../menu-items/schemas/menu-item.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { SuperAdminNotificationsService } from '../super-admin-notifications/super-admin-notifications.service';
import { Table, TableDocument } from '../tables/schemas/table.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import {
  BillingHistory,
  BillingHistoryDocument,
  InvoiceStatus,
  PaymentStatus,
} from './schemas/billing-history.schema';
import {
  SubscriptionPlanDocument,
  SubscriptionPlan as SubscriptionPlanEntity,
} from './schemas/subscription-plan.schema';
import {
  BillingCycle,
  Subscription,
  SubscriptionDocument,
  SubscriptionLimits,
  SubscriptionPlan,
  SubscriptionStatus,
  UsageMetrics,
} from './schemas/subscription.schema';
import { StripeService } from './stripe.service';
import { SubscriptionFeaturesService } from './subscription-features.service';

@Injectable()
export class SubscriptionsService {
  // private readonly logger = new WinstonLoggerService('SubscriptionsService');

  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlanEntity.name)
    private planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(BillingHistory.name)
    private billingModel: Model<BillingHistoryDocument>,
    @InjectModel(Branch.name)
    private branchModel: Model<BranchDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(MenuItem.name)
    private menuItemModel: Model<MenuItemDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(Table.name)
    private tableModel: Model<TableDocument>,
    @InjectModel(Company.name)
    private companyModel: Model<CompanyDocument>,
    private stripeService: StripeService,
    private featuresService: SubscriptionFeaturesService,
    private superAdminNotificationsService: SuperAdminNotificationsService,
    private notificationsService: NotificationsService,
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) {
      return id;
    }

    // Handle case where id might be an object that was stringified
    if (typeof id === 'object' && id !== null) {
      // Try to extract the actual ID from the object
      const extractedId = (id as any).id || (id as any)._id || (id as any).toString();
      if (extractedId && extractedId !== '[object Object]' && Types.ObjectId.isValid(extractedId)) {
        return new Types.ObjectId(extractedId);
      }
      throw new BadRequestException('Invalid identifier supplied: object cannot be converted to ObjectId');
    }

    // Convert to string if it's not already
    const idString = String(id);

    // Check if it's the stringified object case
    if (idString === '[object Object]') {
      throw new BadRequestException('Invalid identifier supplied: received object instead of string ID');
    }

    if (!Types.ObjectId.isValid(idString)) {
      throw new BadRequestException(`Invalid identifier supplied: "${idString}" is not a valid ObjectId`);
    }
    return new Types.ObjectId(idString);
  }

  private sanitizePlanPayload(plan: any) {
    if (!plan) {
      return undefined;
    }
    const plain = { ...plan };
    plain.id = plain._id ? plain._id.toString() : plain.id;
    delete plain._id;
    delete plain.__v;
    return plain;
  }

  private async composeSubscriptionResponse(subscription: any) {
    if (!subscription) {
      return null;
    }
    const plain =
      typeof subscription.toObject === 'function'
        ? subscription.toObject({ virtuals: true })
        : { ...subscription };
    const planDoc = await this.planModel
      .findOne({ name: plain.plan })
      .lean();
    return {
      ...plain,
      id: plain.id || plain._id?.toString(),
      planKey: plain.plan,
      plan: planDoc
        ? this.sanitizePlanPayload(planDoc)
        : {
            name: plain.plan,
            displayName: plain.plan,
            price: plain.price,
            billingCycle: plain.billingCycle,
            limits: plain.limits,
            featureList: [],
          },
    };
  }

  private buildLimitsFromPlan(plan: SubscriptionPlanDocument) {
    const maxBranches =
      plan.limits?.maxBranches ?? plan.features?.maxBranches ?? -1;
    const maxUsers = plan.limits?.maxUsers ?? plan.features?.maxUsers ?? -1;

    const derive = (value: number, multiplier: number) =>
      value > 0 ? value * multiplier : -1;

    return {
      maxBranches,
      maxUsers,
      maxMenuItems: plan.limits?.maxMenuItems ?? derive(maxUsers, 10),
      maxOrders: plan.limits?.maxOrders ?? derive(maxUsers, 50),
      maxTables: plan.limits?.maxTables ?? derive(maxBranches, 10),
      maxCustomers: plan.limits?.maxCustomers ?? derive(maxUsers, 100),
      aiInsightsEnabled: plan.features?.aiInsights ?? false,
      advancedReportsEnabled: plan.features?.accounting ?? false,
      multiLocationEnabled: plan.features?.multiBranch ?? false,
      apiAccessEnabled: plan.features?.crm ?? false,
      whitelabelEnabled: plan.limits?.whitelabelEnabled ?? false,
      customDomainEnabled: plan.limits?.customDomainEnabled ?? false,
      prioritySupportEnabled:
        plan.limits?.prioritySupportEnabled ??
        plan.features?.aiInsights ??
        false,
      storageGB: plan.limits?.storageGB ?? 0,
      // Public ordering system
      publicOrderingEnabled: plan.limits?.publicOrderingEnabled ?? false,
      maxPublicBranches: plan.limits?.maxPublicBranches ?? -1, // Default to unlimited
      // Review system
      reviewsEnabled: plan.limits?.reviewsEnabled ?? false,
      reviewModerationRequired: plan.limits?.reviewModerationRequired ?? false,
      maxReviewsPerMonth: plan.limits?.maxReviewsPerMonth ?? -1, // Default to unlimited
    } as SubscriptionLimits & { storageGB?: number };
  }

  private resolveStripePriceId(planName: string, fallback?: string) {
    const map: Record<string, string | undefined> = {
      free: process.env.STRIPE_PRICE_FREE_MONTHLY,
      basic: process.env.STRIPE_PRICE_BASIC_MONTHLY,
      premium: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
    };
    return map[planName] || fallback;
  }

  private async applyPlanChange(
    subscription: SubscriptionDocument,
    plan: SubscriptionPlanDocument,
    billingCycle?: BillingCycle,
  ) {
    const resolvedBillingCycle =
      billingCycle ||
      (plan.billingCycle as BillingCycle) ||
      subscription.billingCycle;
    const newPrice = plan.price;

    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.stripeSubscriptionId
    ) {
      await this.stripeService.updateSubscription(
        subscription.stripeSubscriptionId,
        {
          priceId: this.resolveStripePriceId(plan.name, plan.stripePriceId),
          prorationBehavior: 'create_prorations',
        },
      );
    }

    const now = new Date();
    const planKey = this.resolvePlanKey(plan.name);
    const nextPeriodEnd = this.calculatePeriodEnd(now, resolvedBillingCycle);

    subscription.plan = planKey;
    subscription.price = newPrice;
    subscription.limits = this.buildLimitsFromPlan(plan) as SubscriptionLimits;
    subscription.billingCycle = resolvedBillingCycle;
    subscription.stripePriceId = this.resolveStripePriceId(plan.name, plan.stripePriceId);
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = nextPeriodEnd;
    subscription.nextBillingDate = nextPeriodEnd;

    // CRITICAL: Update company record to reflect plan change
    // Use plan.name (e.g., 'premium', 'basic') not planKey enum value
    // This ensures company.subscriptionPlan matches the plan's name field for frontend matching
    await this.companyModel.findByIdAndUpdate(
      subscription.companyId,
      {
        subscriptionPlan: plan.name, // Use plan.name, not planKey enum
        subscriptionStatus: subscription.status === SubscriptionStatus.ACTIVE ? 'active' : subscription.status,
        nextBillingDate: subscription.nextBillingDate,
        // Update subscription end date to match current period end
        ...(subscription.currentPeriodEnd && {
          subscriptionEndDate: subscription.currentPeriodEnd,
        }),
      },
      { new: true },
    ).exec();

    return subscription.save();
  }

  // Create a new subscription
  async create(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    try {
      // Check if feature-based or plan-based subscription
      const isFeatureBased = createSubscriptionDto.enabledFeatures && createSubscriptionDto.enabledFeatures.length > 0;

      let plan: SubscriptionPlanDocument | null = null;
      let price = 0;
      let currency = 'BDT';
      let limits: SubscriptionLimits;
      let trialPeriodHours = 168; // Default 7 days
      let enabledFeatures: string[] = [];

      // Fetch company once - will be reused later
      let company = await this.companyModel.findById(createSubscriptionDto.companyId).lean().exec();

      if (isFeatureBased) {
        // Feature-based subscription
        if (!createSubscriptionDto.enabledFeatures || createSubscriptionDto.enabledFeatures.length === 0) {
          throw new BadRequestException('At least one feature must be selected');
        }

        // Calculate price from features
        const branchCount = company ? await this.branchModel.countDocuments({ companyId: createSubscriptionDto.companyId }) : 1;
        const userCount = company ? await this.userModel.countDocuments({ companyId: createSubscriptionDto.companyId }) : 1;

        const pricing = await this.featuresService.calculatePrice(
          createSubscriptionDto.enabledFeatures,
          createSubscriptionDto.billingCycle as 'monthly' | 'yearly',
          branchCount,
          userCount,
        );

        price = pricing.totalPrice;
        currency = 'BDT'; // Default currency
        enabledFeatures = createSubscriptionDto.enabledFeatures;

        // Build limits from features
        limits = await this.featuresService.buildLimitsFromFeatures(createSubscriptionDto.enabledFeatures);

        // Get trial period from first feature (or default)
        const firstFeature = pricing.features[0];
        trialPeriodHours = 168; // Default 7 days trial
      } else {
        // Plan-based subscription (legacy)
        if (!createSubscriptionDto.plan) {
          throw new BadRequestException('Either plan or enabledFeatures must be provided');
        }

        plan = await this.planModel.findOne({
          name: createSubscriptionDto.plan,
          isActive: true,
        });

        if (!plan) {
          console.error(`[Subscriptions] ❌ Plan '${createSubscriptionDto.plan}' not found or is inactive for company ${createSubscriptionDto.companyId}`);
          throw new BadRequestException(`Plan '${createSubscriptionDto.plan}' not found or is inactive`);
        }
        price = plan.price;
        currency = plan.currency;
        trialPeriodHours = plan.trialPeriod;
        limits = this.buildLimitsFromPlan(plan);
      }

      // Check if company already has a subscription (active or inactive)
      const existingSubscription = await this.subscriptionModel.findOne({
        companyId: createSubscriptionDto.companyId,
      }).sort({ createdAt: -1 }); // Get the most recent one

      if (existingSubscription) {
        // If subscription is expired, mark it as inactive first
        if (existingSubscription.status === SubscriptionStatus.EXPIRED && existingSubscription.isActive) {
          existingSubscription.isActive = false;
          await existingSubscription.save();

          // Sync company record for expired subscription
          const expiredPlan = existingSubscription.plan ? await this.planModel.findOne({ name: existingSubscription.plan }).exec() : null;
          await this.companyModel.findByIdAndUpdate(
            createSubscriptionDto.companyId,
            {
              subscriptionStatus: 'expired',
              ...(expiredPlan && { subscriptionPlan: expiredPlan.name }),
            },
            { new: true },
          ).exec();
        }

        // If subscription exists but is inactive, we can reuse it by updating it
        if (!existingSubscription.isActive) {
          // Update existing inactive subscription instead of creating new one
          if (isFeatureBased) {
            existingSubscription.enabledFeatures = enabledFeatures;
            // Clear plan when using feature-based subscription
            existingSubscription.plan = undefined;
          } else {
            // Use the validated plan variable, not the DTO string
            if (!plan) {
              throw new BadRequestException('Plan validation failed - plan not found or inactive');
            }
            const planKey = this.resolvePlanKey(plan.name);
            existingSubscription.plan = planKey;
          }

          existingSubscription.status = SubscriptionStatus.TRIAL;
          existingSubscription.billingCycle = createSubscriptionDto.billingCycle as any;
          existingSubscription.price = price;
          existingSubscription.currency = currency;
          existingSubscription.isActive = true;
          existingSubscription.autoRenew = true;

          // Use company's trial dates if company is in trial, otherwise calculate new ones
          // Company is already fetched above
          if (company && company.subscriptionStatus === 'trial' && company.trialEndDate) {
            existingSubscription.trialStartDate = company.subscriptionStartDate || new Date();
            existingSubscription.trialEndDate = company.trialEndDate;
            existingSubscription.currentPeriodStart = company.subscriptionStartDate || new Date();
            existingSubscription.currentPeriodEnd = company.trialEndDate;
            existingSubscription.nextBillingDate = company.trialEndDate;
          } else {
            // Calculate new trial dates
            const trialStartDate = new Date();
            const trialEndDate = new Date(trialStartDate.getTime() + (trialPeriodHours * 60 * 60 * 1000));
            existingSubscription.trialStartDate = trialStartDate;
            existingSubscription.trialEndDate = trialEndDate;
            existingSubscription.currentPeriodStart = trialStartDate;
            existingSubscription.currentPeriodEnd = trialEndDate;
            existingSubscription.nextBillingDate = trialEndDate;
          }

          existingSubscription.limits = limits;
          existingSubscription.usage = this.getInitialUsage();

          const savedSubscription = await existingSubscription.save();

          // CRITICAL: Update company record to sync subscription data
          if (!isFeatureBased && plan) {
            await this.companyModel.findByIdAndUpdate(
              createSubscriptionDto.companyId,
              {
                subscriptionPlan: plan.name, // Use plan.name for frontend matching
                subscriptionStatus: 'trial',
                subscriptionStartDate: savedSubscription.trialStartDate,
                subscriptionEndDate: savedSubscription.trialEndDate,
                nextBillingDate: savedSubscription.nextBillingDate,
              },
              { new: true },
            ).exec();
          }

          return savedSubscription;
        }

        throw new BadRequestException(
          'Company already has an active subscription',
        );
      }

      // Company is already fetched above - use it here
      // Create Stripe customer (check if company already has one)
      let stripeCustomerId = company?.stripeCustomerId;
      if (!stripeCustomerId) {
        const stripeCustomer = await this.stripeService.createCustomer({
          email: createSubscriptionDto.email,
          name: createSubscriptionDto.companyName,
          metadata: {
            companyId: createSubscriptionDto.companyId.toString(),
          },
        });
        stripeCustomerId = stripeCustomer.id;
      }

      // Use company's trial dates if company is in trial, otherwise calculate new ones
      let trialStartDate: Date;
      let trialEndDate: Date;

      if (company && company.subscriptionStatus === 'trial' && company.trialEndDate) {
        // Use existing trial dates from company
        trialStartDate = company.subscriptionStartDate || new Date();
        trialEndDate = company.trialEndDate;
      } else {
        // Calculate new trial dates
        trialStartDate = new Date();
        trialEndDate = new Date(trialStartDate.getTime() + (trialPeriodHours * 60 * 60 * 1000));
      }

      const subscriptionData: any = {
        companyId: createSubscriptionDto.companyId,
        status: SubscriptionStatus.TRIAL,
        billingCycle: createSubscriptionDto.billingCycle,
        price,
        currency,
        stripeCustomerId: stripeCustomerId,
        trialStartDate,
        trialEndDate,
        currentPeriodStart: trialStartDate,
        currentPeriodEnd: trialEndDate,
        nextBillingDate: trialEndDate,
        limits,
        usage: this.getInitialUsage(),
        autoRenew: true,
      };

      // Set plan or enabledFeatures based on subscription type
      if (isFeatureBased) {
        subscriptionData.enabledFeatures = enabledFeatures;
        // Don't set plan for feature-based subscriptions
      } else {
        // Use the validated plan variable, not the DTO string
        if (!plan) {
          console.error(`[Subscriptions] ❌ Plan validation failed for company ${createSubscriptionDto.companyId}`);
          throw new BadRequestException('Plan validation failed - plan not found or inactive');
        }
        const planKey = this.resolvePlanKey(plan.name);
        subscriptionData.plan = planKey;
        
        // Also set enabledFeatures from plan for immediate access (role-permissions service can use this)
        // Priority: enabledFeatureKeys > legacy features conversion
        if (plan.enabledFeatureKeys && Array.isArray(plan.enabledFeatureKeys) && plan.enabledFeatureKeys.length > 0) {
          subscriptionData.enabledFeatures = plan.enabledFeatureKeys;
        } else if (plan.features) {
          // Convert legacy features to feature keys
          const { convertLegacyFeaturesToKeys } = await import('./utils/plan-features.helper');
          subscriptionData.enabledFeatures = convertLegacyFeaturesToKeys(plan.features);
        }
      }

      subscriptionData.isActive = true; // Explicitly set isActive
      const subscription = new this.subscriptionModel(subscriptionData);
      const savedSubscription = await subscription.save();

      // CRITICAL: Update company record to sync subscription data
      if (!isFeatureBased && plan) {
        const companyUpdate = {
          subscriptionPlan: plan.name, // Use plan.name for frontend matching
          subscriptionStatus: 'trial',
          subscriptionStartDate: savedSubscription.trialStartDate,
          subscriptionEndDate: savedSubscription.trialEndDate,
          nextBillingDate: savedSubscription.nextBillingDate,
        };
        await this.companyModel.findByIdAndUpdate(
          createSubscriptionDto.companyId,
          companyUpdate,
          { new: true },
        ).exec();
        }

      return savedSubscription;
    } catch (error) {
      // this.logger.error('Failed to create subscription', error);
      throw error;
    }
  }

  // Get all subscriptions with filters
  async findAll(filters: {
    companyId?: MongooseSchema.Types.ObjectId;
    status?: SubscriptionStatus;
    plan?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ subscriptions: SubscriptionDocument[]; total: number }> {
    const query: any = { isActive: true };

    if (filters.companyId) query.companyId = filters.companyId;
    if (filters.status) query.status = filters.status;
    if (filters.plan) query.plan = filters.plan;

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [subscriptions, total] = await Promise.all([
      this.subscriptionModel
        .find(query)
        .populate({
          path: 'companyId',
          select: 'name email subscriptionPlan subscriptionStatus nextBillingDate subscriptionEndDate trialEndDate',
          model: 'Company',
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean()
        .exec(),
      this.subscriptionModel.countDocuments(query),
    ]);

    // Transform subscriptions to ensure company data is always accessible
    const transformedSubscriptions = subscriptions.map((sub: any) => {
      // If companyId is populated, add it as 'company' field for easier access
      if (sub.companyId && typeof sub.companyId === 'object' && sub.companyId.name) {
        sub.company = {
          id: sub.companyId._id || sub.companyId.id,
          name: sub.companyId.name,
          email: sub.companyId.email,
          subscriptionPlan: sub.companyId.subscriptionPlan,
          subscriptionStatus: sub.companyId.subscriptionStatus,
          nextBillingDate: sub.companyId.nextBillingDate,
          subscriptionEndDate: sub.companyId.subscriptionEndDate,
          trialEndDate: sub.companyId.trialEndDate,
        };
      }
      return sub;
    });

    // @ts-ignore - Mongoose lean type
    return { subscriptions: transformedSubscriptions, total };
  }

  // Get subscription by ID
  async findById(id: string): Promise<SubscriptionDocument> {
    // Don't filter by isActive - we need to find expired subscriptions too
    const subscription = await this.subscriptionModel
      .findOne({ _id: id })
      .populate('companyId', 'name email')
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    // CRITICAL: If subscription is expired but isActive is still true, fix it and sync company
    if (subscription.status === SubscriptionStatus.EXPIRED && subscription.isActive) {
      subscription.isActive = false;
      await subscription.save();

      // Sync company record
      const plan = subscription.plan ? await this.planModel.findOne({ name: subscription.plan }).exec() : null;
      await this.companyModel.findByIdAndUpdate(
        subscription.companyId,
        {
          subscriptionStatus: 'expired',
          ...(plan && { subscriptionPlan: plan.name }),
        },
        { new: true },
      ).exec();

      }

    return subscription;
  }

  // Get subscription by company
  async findByCompany(
    companyId: MongooseSchema.Types.ObjectId,
    includeInactive: boolean = true,
  ): Promise<SubscriptionDocument> {
    const query: any = { companyId };
    // If includeInactive is false, only get active subscriptions
    if (!includeInactive) {
      query.isActive = true;
    }

    // Try to find active subscription first, then fall back to any subscription
    let subscription = await this.subscriptionModel
      .findOne({ ...query, isActive: true })
      .populate('companyId', 'name email')
      .sort({ createdAt: -1 }) // Get the most recent one
      .exec();

    // If no active subscription found and includeInactive is true, try to find any subscription
    if (!subscription && includeInactive) {
      subscription = await this.subscriptionModel
        .findOne({ companyId })
        .populate('companyId', 'name email')
        .sort({ createdAt: -1 }) // Get the most recent one
        .exec();
    }

    if (!subscription) {
      throw new NotFoundException('Subscription not found for this company');
    }

    // CRITICAL: If subscription is expired but isActive is still true, fix it and sync company
    if (subscription.status === SubscriptionStatus.EXPIRED && subscription.isActive) {
      subscription.isActive = false;
      await subscription.save();

      // Sync company record
      const plan = subscription.plan ? await this.planModel.findOne({ name: subscription.plan }).exec() : null;
      await this.companyModel.findByIdAndUpdate(
        companyId,
        {
          subscriptionStatus: 'expired',
          ...(plan && { subscriptionPlan: plan.name }),
        },
        { new: true },
      ).exec();

      }

    return subscription;
  }

  // Update subscription
  async update(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
    userId?: string,
  ): Promise<any> {
    const subscription = await this.findById(id);

    // Audit log: Track who made the change
    if (userId) {
      subscription.metadata = subscription.metadata || {};
      subscription.metadata.lastUpdatedBy = userId;
      subscription.metadata.lastUpdatedAt = new Date();
    }

    // Cast to any to access all possible fields safely
    const updateData = updateSubscriptionDto as any;

    // Only update fields that are explicitly provided (avoid overwriting with undefined)
    if (updateData.status !== undefined) {
      subscription.status = updateData.status as SubscriptionStatus;
    }
    if (updateData.billingCycle !== undefined) {
      subscription.billingCycle = updateData.billingCycle as BillingCycle;
    }
    if (updateData.price !== undefined) {
      subscription.price = updateData.price;
    }
    if (updateData.currency !== undefined) {
      subscription.currency = updateData.currency;
    }
    if (updateData.autoRenew !== undefined) {
      subscription.autoRenew = updateData.autoRenew;
    }
    if (updateData.enabledFeatures !== undefined) {
      subscription.enabledFeatures = updateData.enabledFeatures;
      // If switching to feature-based, clear plan
      if (updateData.enabledFeatures.length > 0) {
        subscription.plan = undefined;
      }
    }
    if (updateData.limits !== undefined) {
      subscription.limits = updateData.limits;
    }
    if (updateData.usage !== undefined) {
      subscription.usage = updateData.usage;
    }

    // CRITICAL: If plan is being updated, validate it
    if (updateData.plan !== undefined) {
      const plan = await this.planModel.findOne({
        name: updateData.plan,
        isActive: true,
      });

      if (!plan) {
        throw new BadRequestException(`Plan '${updateData.plan}' not found or is inactive`);
      }

      const planKey = this.resolvePlanKey(plan.name);
      subscription.plan = planKey;
      subscription.price = plan.price;
      subscription.limits = this.buildLimitsFromPlan(plan) as SubscriptionLimits;

      // Sync company record
      await this.companyModel.findByIdAndUpdate(
        subscription.companyId,
        {
          subscriptionPlan: plan.name,
          subscriptionStatus: subscription.status === SubscriptionStatus.ACTIVE ? 'active' : subscription.status,
        },
        { new: true },
      ).exec();
    }

    const savedSubscription = await subscription.save();
    return this.composeSubscriptionResponse(savedSubscription);
  }

  async getCurrentSubscription(companyId: string) {
    // CRITICAL: Only return ACTIVE or TRIAL subscriptions
    // Do NOT return expired/cancelled subscriptions to avoid confusion
    // CRITICAL: Sort by createdAt DESC to get the MOST RECENT subscription first
    // This ensures we get the latest subscription (e.g., new BASIC) not an old one (e.g., expired PREMIUM)
    let subscription = await this.subscriptionModel
      .findOne({
        companyId: this.toObjectId(companyId),
        isActive: true,
        status: { 
          $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, 'active', 'trial']
        },
      })
      .sort({ createdAt: -1 }) // CRITICAL: Get most recent subscription first
      .lean();

    // If no active subscription found, check for any subscription to sync company record
    // But DO NOT return expired subscriptions
    if (!subscription) {
      const anySubscription = await this.subscriptionModel
        .findOne({
          companyId: this.toObjectId(companyId),
        })
        .sort({ createdAt: -1 }) // Get the most recent one
        .lean();

      // If we found an inactive/expired subscription, sync the company record but DON'T return it
      if (anySubscription) {
        // Fix subscription if it's expired but still marked as active
        if (anySubscription.status === SubscriptionStatus.EXPIRED && anySubscription.isActive) {
          await this.subscriptionModel.findByIdAndUpdate(
            anySubscription._id,
            { isActive: false },
            { new: true },
          ).exec();
          anySubscription.isActive = false;
        }

        // CRITICAL: Look up plan using the subscription's plan value
        // subscription.plan is stored as enum value (e.g., 'basic', 'premium')
        const planName = anySubscription.plan as string;
        const plan = planName ? await this.planModel.findOne({ name: planName }).exec() : null;

        if (plan) {
          // Plan found
        } else {
          console.error(`[Subscriptions] ❌ Plan '${planName}' NOT FOUND in database for subscription ${anySubscription._id}!`);
        }

        const companyUpdate: any = {
          subscriptionStatus: anySubscription.status === SubscriptionStatus.EXPIRED ? 'expired' : 
                              anySubscription.status === SubscriptionStatus.ACTIVE ? 'active' :
                              anySubscription.status === SubscriptionStatus.TRIAL ? 'trial' :
                              anySubscription.status?.toLowerCase() || 'expired',
        };

        if (plan) {
          companyUpdate.subscriptionPlan = plan.name; // Use plan.name to ensure consistency
        } else {
          // If plan not found, use the subscription's plan value directly
          companyUpdate.subscriptionPlan = planName || 'free';
          }

        await this.companyModel.findByIdAndUpdate(
          companyId,
          companyUpdate,
          { new: true },
        ).exec();

        } else {
        // No subscription found at all - sync company to show no active subscription
        await this.companyModel.findByIdAndUpdate(
          companyId,
          {
            subscriptionStatus: 'expired',
            subscriptionPlan: 'free',
          },
          { new: true },
        ).exec();
      }

      // CRITICAL: Don't return expired subscriptions - throw 404 instead
      throw new NotFoundException('No active subscription found for this company. Subscription may have expired.');
    } else {
      // CRITICAL: Double-check that subscription is not expired (safety check)
      if (subscription.status === SubscriptionStatus.EXPIRED) {
        await this.subscriptionModel.findByIdAndUpdate(
          subscription._id,
          { isActive: false },
          { new: true },
        ).exec();

        // Sync company record
        const planName = subscription.plan as string;
        const plan = planName ? await this.planModel.findOne({ name: planName }).exec() : null;

        if (plan) {
          // Plan found
        } else {
          console.error(`[Subscriptions] ❌ Plan '${planName}' NOT FOUND!`);
        }

        await this.companyModel.findByIdAndUpdate(
          companyId,
          {
            subscriptionStatus: 'expired',
            ...(plan && { subscriptionPlan: plan.name }),
          },
          { new: true },
        ).exec();

        // Don't return expired subscription
        throw new NotFoundException('No active subscription found for this company. Subscription may have expired.');
      }
    }

    // CRITICAL: Verify the plan lookup before returning
    if (subscription) {
      const planName = subscription.plan as string;
      // Double-check plan exists and log it
      const plan = planName ? await this.planModel.findOne({ name: planName }).exec() : null;
      if (!plan) {
        console.error(`[Subscriptions] ❌ CRITICAL: Plan '${planName}' from subscription NOT FOUND in database!`);
      } else {
        // Plan found
      }
    }

    // Only return active/trial subscriptions
    return this.composeSubscriptionResponse(subscription);
  }

  async getUsageStats(companyId: string) {
    const companyObjectId = this.toObjectId(companyId);
    const companyIdFilter = {
      $or: [
        { companyId: companyObjectId },
        { companyId: companyId as any },
      ],
    };

    const subscription = await this.subscriptionModel
      .findOne({
        ...companyIdFilter,
        isActive: true,
      })
      .lean();

    const branchDocs = await this.branchModel
      .find(companyIdFilter)
      .select('_id')
      .lean();
    const branchIds = branchDocs.map((doc) => doc._id);

    const [userCount, menuItemCount, customerCount, tableCount] =
      await Promise.all([
        this.userModel.countDocuments(companyIdFilter),
        this.menuItemModel.countDocuments(companyIdFilter),
        this.customerModel.countDocuments(companyIdFilter),
        branchIds.length
          ? this.tableModel.countDocuments({ branchId: { $in: branchIds } })
          : Promise.resolve(0),
      ]);

    if (!subscription) {
      return {
        branches: branchIds.length,
        users: userCount,
        tables: tableCount,
        menuItems: menuItemCount,
        customers: customerCount,
        storageUsed: 0,
        storageLimit: 0,
      };
    }

    const usageUpdate = {
      'usage.currentBranches': branchIds.length,
      'usage.currentUsers': userCount,
      'usage.currentMenuItems': menuItemCount,
      'usage.currentCustomers': customerCount,
      'usage.currentTables': tableCount,
      'usage.lastUpdated': new Date(),
    };

    await this.subscriptionModel.updateOne(
      { _id: subscription._id },
      { $set: usageUpdate },
    );

    return {
      branches: branchIds.length,
      users: userCount,
      tables: tableCount,
      menuItems: menuItemCount,
      customers: customerCount,
      storageUsed: subscription.usage?.storageUsed ?? 0,
      storageLimit: subscription.limits?.storageGB ?? 0,
    };
  }

  // Update subscription from Stripe webhook (when plan changes via Stripe)
  async updateFromStripeWebhook(
    stripeSubscriptionId: string,
    stripeSubscriptionData: any,
  ): Promise<SubscriptionDocument | null> {
    const subscription = await this.subscriptionModel
      .findOne({
        stripeSubscriptionId,
      })
      .exec();

    if (!subscription) {
      return null;
    }

    const previousStatus = subscription.status;
    const previousPlan = subscription.plan;

    // Update plan if price ID changed
    if (stripeSubscriptionData.items?.data?.[0]?.price?.id) {
      const newStripePriceId = stripeSubscriptionData.items.data[0].price.id;
      if (newStripePriceId !== subscription.stripePriceId) {
        const plan = await this.planModel
          .findOne({ stripePriceId: newStripePriceId })
          .exec();

        if (plan) {
          await this.applyPlanChange(subscription, plan);
        }
      }
    }

    // Update status
    if (stripeSubscriptionData.status === 'active') {
      subscription.status = SubscriptionStatus.ACTIVE;
    } else if (stripeSubscriptionData.status === 'past_due') {
      subscription.status = SubscriptionStatus.PAST_DUE;
    } else if (stripeSubscriptionData.status === 'canceled') {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
    } else if (stripeSubscriptionData.status === 'unpaid') {
      subscription.status = SubscriptionStatus.PAST_DUE;
    }

    // Update period dates
    if (stripeSubscriptionData.current_period_start) {
      subscription.currentPeriodStart = new Date(
        stripeSubscriptionData.current_period_start * 1000,
      );
    }
    if (stripeSubscriptionData.current_period_end) {
      subscription.currentPeriodEnd = new Date(
        stripeSubscriptionData.current_period_end * 1000,
      );
      subscription.nextBillingDate = new Date(
        stripeSubscriptionData.current_period_end * 1000,
      );
    }

    // Update cancel_at if set
    if (stripeSubscriptionData.cancel_at) {
      subscription.cancelAt = new Date(stripeSubscriptionData.cancel_at * 1000);
    }

    // Save subscription first
    await subscription.save();

    // CRITICAL: Always update company record with subscription status and dates
    // This ensures company data stays in sync even if period_end is not provided
    const companyUpdate: any = {
      subscriptionStatus: subscription.status === SubscriptionStatus.ACTIVE ? 'active' : subscription.status,
    };

    if (subscription.nextBillingDate) {
      companyUpdate.nextBillingDate = subscription.nextBillingDate;
    }
    if (subscription.currentPeriodEnd) {
      companyUpdate.subscriptionEndDate = subscription.currentPeriodEnd;
    }

    // Update plan if it was changed
    if (subscription.plan) {
      // Find plan by enum value to get the plan name
      const plan = await this.planModel.findOne({ 
        name: subscription.plan 
      }).exec();
      if (plan) {
        companyUpdate.subscriptionPlan = plan.name;
      }
    }

    await this.companyModel.findByIdAndUpdate(
      subscription.companyId,
      companyUpdate,
      { new: true },
    ).exec();

    // Emit super-admin notifications for key events
    try {
      const company = await this.companyModel.findById(subscription.companyId).lean().exec();
      const companyName = company?.name || 'Company';
      const planName = companyUpdate.subscriptionPlan || subscription.plan || 'plan';

      if (previousPlan && companyUpdate.subscriptionPlan && previousPlan !== companyUpdate.subscriptionPlan) {
        await this.superAdminNotificationsService.create({
          type: 'subscription.plan_changed',
          title: 'Subscription plan changed',
          message: `${companyName} switched to ${companyUpdate.subscriptionPlan}`,
          companyId: subscription.companyId.toString(),
          metadata: {
            previousPlan,
            newPlan: companyUpdate.subscriptionPlan,
          },
        });
      }

      if (subscription.status === SubscriptionStatus.ACTIVE && previousStatus !== SubscriptionStatus.ACTIVE) {
        await this.superAdminNotificationsService.create({
          type: 'subscription.renewed',
          title: 'Subscription renewed',
          message: `${companyName} subscription is active on ${planName}`,
          companyId: subscription.companyId.toString(),
        });
      }

      if (subscription.status === SubscriptionStatus.CANCELLED && previousStatus !== SubscriptionStatus.CANCELLED) {
        await this.superAdminNotificationsService.create({
          type: 'subscription.cancelled',
          title: 'Subscription cancelled',
          message: `${companyName} subscription was cancelled`,
          companyId: subscription.companyId.toString(),
        });
      }

      if (subscription.status === SubscriptionStatus.PAST_DUE && previousStatus !== SubscriptionStatus.PAST_DUE) {
        await this.superAdminNotificationsService.create({
          type: 'subscription.payment_failed',
          title: 'Subscription payment issue',
          message: `${companyName} payment failed or is past due`,
          companyId: subscription.companyId.toString(),
        });
      }
    } catch (error) {
      // Non-blocking
    }

    return subscription;
  }

  // Upgrade/Downgrade subscription
  async upgrade(
    id: string,
    upgradeDto: UpgradeSubscriptionDto,
    userId?: string,
  ): Promise<SubscriptionDocument> {
    const subscription = await this.findById(id);

    const newPlan = await this.planModel.findOne({
      name: upgradeDto.newPlan,
      isActive: true,
    });

    if (!newPlan) {
      throw new BadRequestException('Invalid subscription plan');
    }

    // Audit log: Track plan change
    if (userId) {
      subscription.metadata = subscription.metadata || {};
      subscription.metadata.planChangedBy = userId;
      subscription.metadata.planChangedAt = new Date();
      subscription.metadata.previousPlan = subscription.plan;
      subscription.metadata.newPlan = upgradeDto.newPlan;
    }

    const updated = await this.applyPlanChange(
      subscription,
      newPlan,
      upgradeDto.billingCycle,
    );

    return this.composeSubscriptionResponse(updated);
  }

  async updatePlanById(
    id: string,
    planId: string,
    billingCycle?: BillingCycle,
    userId?: string,
  ) {
    const subscription = await this.findById(id);
    const plan = await this.planModel.findById(planId);

    if (!plan || !plan.isActive) {
      throw new BadRequestException('Invalid subscription plan');
    }

    // Audit log: Track plan change
    if (userId) {
      subscription.metadata = subscription.metadata || {};
      subscription.metadata.planChangedBy = userId;
      subscription.metadata.planChangedAt = new Date();
      subscription.metadata.previousPlan = subscription.plan;
      subscription.metadata.newPlan = plan.name;
    }

    const updated = await this.applyPlanChange(subscription, plan, billingCycle);
    return this.composeSubscriptionResponse(updated);
  }

  // Cancel subscription
  async cancel(
    id: string,
    reason?: string,
    cancelImmediately = false,
    userId?: string,
  ): Promise<SubscriptionDocument> {
    const subscription = await this.findById(id);

    // Audit log: Track cancellation
    if (userId) {
      subscription.metadata = subscription.metadata || {};
      subscription.metadata.cancelledBy = userId;
      subscription.metadata.cancelledAt = new Date();
      subscription.metadata.cancellationReason = reason;
    }

    if (cancelImmediately) {
      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();

      if (subscription.stripeSubscriptionId) {
        await this.stripeService.cancelSubscription(
          subscription.stripeSubscriptionId,
          { immediate: true },
        );
      }
    } else {
      subscription.cancelAt = subscription.currentPeriodEnd;
      subscription.autoRenew = false;

      if (subscription.stripeSubscriptionId) {
        await this.stripeService.cancelSubscription(
          subscription.stripeSubscriptionId,
          { atPeriodEnd: true },
        );
      }
    }

    if (reason) {
      subscription.cancellationReason = reason;
    }

    return await subscription.save();
  }

  // Reactivate cancelled subscription
  async reactivate(id: string): Promise<SubscriptionDocument> {
    const subscription = await this.findById(id);

    if (
      subscription.status !== SubscriptionStatus.CANCELLED &&
      !subscription.cancelAt
    ) {
      throw new BadRequestException('Subscription is not cancelled');
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.cancelAt = null;
    subscription.cancelledAt = null;
    subscription.cancellationReason = null;
    subscription.autoRenew = true;

    if (subscription.stripeSubscriptionId) {
      await this.stripeService.reactivateSubscription(
        subscription.stripeSubscriptionId,
      );
    }

    return await subscription.save();
  }

  // Pause subscription
  async pause(id: string, resumeDate?: Date): Promise<SubscriptionDocument> {
    const subscription = await this.findById(id);

    subscription.status = SubscriptionStatus.PAUSED;
    subscription.pausedAt = new Date();

    if (resumeDate) {
      subscription.resumeAt = resumeDate;
    }

    if (subscription.stripeSubscriptionId) {
      await this.stripeService.pauseSubscription(
        subscription.stripeSubscriptionId,
      );
    }

    return await subscription.save();
  }

  // Resume paused subscription
  async resume(id: string): Promise<SubscriptionDocument> {
    const subscription = await this.findById(id);

    if (subscription.status !== SubscriptionStatus.PAUSED) {
      throw new BadRequestException('Subscription is not paused');
    }

    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.pausedAt = null;
    subscription.resumeAt = null;

    if (subscription.stripeSubscriptionId) {
      await this.stripeService.resumeSubscription(
        subscription.stripeSubscriptionId,
      );
    }

    return await subscription.save();
  }

  // Update usage metrics
  async updateUsage(
    companyId: MongooseSchema.Types.ObjectId,
    usage: Partial<UsageMetrics>,
  ): Promise<SubscriptionDocument> {
    const subscription = await this.findByCompany(companyId);

    subscription.usage = {
      ...subscription.usage,
      ...usage,
      lastUpdated: new Date(),
    };

    return await subscription.save();
  }

  // Check if usage limit is reached
  async checkLimit(
    companyId: MongooseSchema.Types.ObjectId,
    limitType: keyof SubscriptionLimits,
  ): Promise<{ reached: boolean; current: number; limit: number }> {
    const subscription = await this.findByCompany(companyId);

    const usage = subscription.usage as UsageMetrics;
    const limits = subscription.limits as SubscriptionLimits;

    let current = 0;
    let limit = 0;

    switch (limitType) {
      case 'maxBranches':
        current = usage.currentBranches;
        limit = limits.maxBranches;
        break;
      case 'maxUsers':
        current = usage.currentUsers;
        limit = limits.maxUsers;
        break;
      case 'maxMenuItems':
        current = usage.currentMenuItems;
        limit = limits.maxMenuItems;
        break;
      case 'maxOrders':
        current = usage.currentOrders;
        limit = limits.maxOrders;
        break;
      case 'maxTables':
        current = usage.currentTables;
        limit = limits.maxTables;
        break;
      case 'maxCustomers':
        current = usage.currentCustomers;
        limit = limits.maxCustomers;
        break;
    }

    return {
      reached: current >= limit,
      current,
      limit,
    };
  }

  // Process payment
  async processPayment(
    subscriptionId: string,
    paymentMethodId: string,
  ): Promise<BillingHistoryDocument> {
    const subscription = await this.findById(subscriptionId);

    try {
      // Create payment intent
      const paymentIntent = await this.stripeService.createPaymentIntent({
        amount: subscription.price * 100, // Convert to cents
        currency: subscription.currency,
        customer: subscription.stripeCustomerId,
        paymentMethod: paymentMethodId,
        description: `${subscription.plan} subscription - ${subscription.billingCycle}`,
        metadata: {
          subscriptionId: subscription._id.toString(),
          companyId: subscription.companyId.toString(),
        },
      });

      // Create billing history record
      const invoiceNumber = await this.generateInvoiceNumber();

      const billing = new this.billingModel({
        companyId: subscription.companyId,
        subscriptionId: subscription._id,
        invoiceNumber,
        stripePaymentIntentId: paymentIntent.id,
        invoiceStatus: InvoiceStatus.OPEN,
        paymentStatus: PaymentStatus.PROCESSING,
        amount: subscription.price,
        total: subscription.price,
        currency: subscription.currency,
        billingDate: new Date(),
        dueDate: new Date(),
        periodStart: subscription.currentPeriodStart,
        periodEnd: subscription.currentPeriodEnd,
        description: `${subscription.plan} subscription payment`,
        lineItems: [
          {
            description: `${subscription.plan} plan - ${subscription.billingCycle}`,
            quantity: 1,
            unitPrice: subscription.price,
            amount: subscription.price,
          },
        ],
      });

      await billing.save();

      // Confirm payment
      const confirmedPayment = await this.stripeService.confirmPayment(
        paymentIntent.id,
      );

      if (confirmedPayment.status === 'succeeded') {
        billing.paymentStatus = PaymentStatus.SUCCEEDED;
        billing.invoiceStatus = InvoiceStatus.PAID;
        billing.paidAt = new Date();
        // @ts-ignore - Stripe PaymentIntent charges
        billing.receiptUrl = confirmedPayment.charges?.data?.[0]?.receipt_url;

        subscription.status = SubscriptionStatus.ACTIVE;
        subscription.lastPaymentDate = new Date();
        subscription.stripePaymentMethodId = paymentMethodId;
        subscription.failedPaymentAttempts = 0;

        // Update current period
        const periodStart = new Date();
        const periodEnd = this.calculatePeriodEnd(
          periodStart,
          subscription.billingCycle,
        );

        subscription.currentPeriodStart = periodStart;
        subscription.currentPeriodEnd = periodEnd;
        subscription.nextBillingDate = periodEnd;

        await subscription.save();
      }

      await billing.save();
      return billing;
    } catch (error) {
      // this.logger.error('Payment processing failed', error);

      subscription.failedPaymentAttempts += 1;

      if (subscription.failedPaymentAttempts >= 3) {
        subscription.status = SubscriptionStatus.PAST_DUE;
      }

      await subscription.save();
      throw error;
    }
  }

  // Get billing history
  async getBillingHistory(
    companyId: string | Types.ObjectId,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      status?: PaymentStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ history: BillingHistoryDocument[]; total: number }> {
    const query: any = {
      companyId: this.toObjectId(companyId),
      isActive: true,
    };

    if (filters?.startDate || filters?.endDate) {
      query.billingDate = {};
      if (filters.startDate) query.billingDate.$gte = filters.startDate;
      if (filters.endDate) query.billingDate.$lte = filters.endDate;
    }

    if (filters?.status) {
      query.paymentStatus = filters.status;
    }

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const [history, total] = await Promise.all([
      this.billingModel
        .find(query)
        .sort({ billingDate: -1 })
        .limit(limit)
        .skip(offset)
        .lean()
        .exec(),
      this.billingModel.countDocuments(query),
    ]);

    // @ts-ignore - Mongoose lean type
    return { history, total };
  }

  // Get all subscription plans
  async getPlans(): Promise<SubscriptionPlanDocument[]> {
    // @ts-ignore - Mongoose lean type
    return await this.planModel
      .find({ isActive: true, isPublic: true })
      .sort({ popularityRank: 1 })
      .lean()
      .exec();
  }

  // Cron job to check trial expiration
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkTrialExpiration() {
    const now = new Date();

    const expiringTrials = await this.subscriptionModel.find({
      status: SubscriptionStatus.TRIAL,
      trialEndDate: { $lte: now },
      isActive: true,
    });

    for (const subscription of expiringTrials) {
      if (subscription.stripePaymentMethodId) {
        // Attempt to charge
        try {
          await this.processPayment(
            subscription._id.toString(),
            subscription.stripePaymentMethodId,
          );
        } catch (error) {
          // Error charging subscription - notification sent below
          await this.sendSubscriptionNotification(
            subscription.companyId,
            'subscription.trial.charge_failed',
            'Trial charge failed',
            'We could not charge your payment method at trial end. Please update billing to continue service.',
            { subscriptionId: subscription._id.toString() },
          );
        }
      } else {
        // Mark subscription as expired
        subscription.status = SubscriptionStatus.EXPIRED;
        subscription.isActive = false; // CRITICAL: Set isActive to false when expired

        await subscription.save();

        // CRITICAL: Sync company record when subscription expires
        const companyUpdate: any = {
          subscriptionStatus: 'expired',
        };

        // Update plan name if subscription has a plan
        if (subscription.plan) {
          const plan = await this.planModel.findOne({ 
            name: subscription.plan 
          }).exec();
          if (plan) {
            companyUpdate.subscriptionPlan = plan.name;
          }
        }

        await this.companyModel.findByIdAndUpdate(
          subscription.companyId,
          companyUpdate,
          { new: true },
        ).exec();

        await this.sendSubscriptionNotification(
          subscription.companyId,
          'subscription.trial.expired',
          'Subscription expired',
          'Your trial has expired. Please update your plan to restore access.',
          { subscriptionId: subscription._id.toString() },
        );
      }
    }

    // Processed expiring trial subscriptions
  }

  // Cron job to process recurring payments
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async processRecurringPayments() {
    const now = new Date();

    const subscriptionsToBill = await this.subscriptionModel.find({
      status: SubscriptionStatus.ACTIVE,
      autoRenew: true,
      nextBillingDate: { $lte: now },
      isActive: true,
    });

    for (const subscription of subscriptionsToBill) {
      if (subscription.stripePaymentMethodId) {
        try {
          await this.processPayment(
            subscription._id.toString(),
            subscription.stripePaymentMethodId,
          );
          await this.sendSubscriptionNotification(
            subscription.companyId,
            'subscription.billing.success',
            'Subscription renewed',
            'Your subscription has been renewed successfully.',
            { subscriptionId: subscription._id.toString() },
          );
        } catch (error) {
          // Error processing recurring payment - notification sent below
          await this.sendSubscriptionNotification(
            subscription.companyId,
            'subscription.billing.failed',
            'Subscription billing failed',
            'We could not process your subscription payment. Please update your billing method.',
            { subscriptionId: subscription._id.toString() },
          );
        }
      }
    }

    // Processed recurring payments
  }

  // Helper methods
  private getInitialUsage(): UsageMetrics {
    return {
      currentBranches: 0,
      currentUsers: 0,
      currentMenuItems: 0,
      currentOrders: 0,
      currentTables: 0,
      currentCustomers: 0,
      storageUsed: 0,
      lastUpdated: new Date(),
    };
  }

  private async sendSubscriptionNotification(
    companyId: any,
    type: string,
    title: string,
    message: string,
    metadata: Record<string, any> = {},
  ) {
    try {
      await this.notificationsService.create({
        companyId: companyId?.toString?.() || companyId,
        type,
        title,
        message,
        metadata,
        roles: ['owner', 'manager'],
      });
    } catch (err) {
      // Failed to send subscription notification
    }
  }

  private resolvePlanKey(planName?: string): SubscriptionPlan {
    const normalized = (planName || '').toLowerCase();
    const values = Object.values(SubscriptionPlan) as string[];
    const match = values.find((value) => value === normalized);
    return (match as SubscriptionPlan) || SubscriptionPlan.BASIC;
  }

  private calculatePeriodEnd(startDate: Date, cycle: BillingCycle): Date {
    const endDate = new Date(startDate);

    switch (cycle) {
      case BillingCycle.MONTHLY:
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case BillingCycle.QUARTERLY:
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case BillingCycle.YEARLY:
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
    }

    return endDate;
  }

  private async calculateProratedAmount(
    subscription: SubscriptionDocument,
    newPrice: number,
  ): Promise<number> {
    const now = new Date();
    const periodStart = new Date(subscription.currentPeriodStart);
    const periodEnd = new Date(subscription.currentPeriodEnd);

    const totalDays =
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24);
    const remainingDays =
      (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    const proratedAmount = (newPrice / totalDays) * remainingDays;
    return Math.round(proratedAmount * 100) / 100;
  }

  private async generateInvoiceNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    const count = await this.billingModel.countDocuments({
      invoiceNumber: new RegExp(`^INV-${year}${month}`),
    });

    return `INV-${year}${month}${String(count + 1).padStart(5, '0')}`;
  }
}
