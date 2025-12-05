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
  ) {}

  private toObjectId(id: string | Types.ObjectId): Types.ObjectId {
    if (id instanceof Types.ObjectId) {
      return id;
    }
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid identifier supplied');
    }
    return new Types.ObjectId(id);
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
    } as SubscriptionLimits & { storageGB?: number };
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
          priceId: plan.stripePriceId,
          prorationBehavior: 'create_prorations',
        },
      );
    }

    const planKey = this.resolvePlanKey(plan.name);
    subscription.plan = planKey;
    subscription.price = newPrice;
    subscription.limits = this.buildLimitsFromPlan(plan) as SubscriptionLimits;
    subscription.billingCycle = resolvedBillingCycle;

    // Update next billing date based on current period end
    if (subscription.currentPeriodEnd) {
      subscription.nextBillingDate = subscription.currentPeriodEnd;
    } else {
      // Calculate next billing date if not set
      const periodStart = subscription.currentPeriodStart || new Date();
      subscription.nextBillingDate = this.calculatePeriodEnd(periodStart, resolvedBillingCycle);
    }

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
          throw new BadRequestException('Invalid subscription plan');
        }

        price = plan.price;
        currency = plan.currency;
        trialPeriodHours = plan.trialPeriod;
        limits = this.buildLimitsFromPlan(plan);
      }

      // Check if company already has a subscription (active or inactive)
      const existingSubscription = await this.subscriptionModel.findOne({
        companyId: createSubscriptionDto.companyId,
      });

      if (existingSubscription) {
        // If subscription exists but is inactive, we can reuse it by updating it
        if (!existingSubscription.isActive) {
          // Update existing inactive subscription instead of creating new one
          if (isFeatureBased) {
            existingSubscription.enabledFeatures = enabledFeatures;
          } else {
            existingSubscription.plan = createSubscriptionDto.plan as any;
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
          
          return await existingSubscription.save();
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
      } else {
        subscriptionData.plan = createSubscriptionDto.plan;
      }

      const subscription = new this.subscriptionModel(subscriptionData);

      return await subscription.save();
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
    const subscription = await this.subscriptionModel
      .findOne({ _id: id, isActive: true })
      .populate('companyId', 'name email')
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
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

    Object.assign(subscription, updateSubscriptionDto);
    await subscription.save();
    return this.composeSubscriptionResponse(subscription);
  }

  async getCurrentSubscription(companyId: string) {
    const subscription = await this.subscriptionModel
      .findOne({
        companyId: this.toObjectId(companyId),
        isActive: true,
      })
      .lean();

    if (!subscription) {
      throw new NotFoundException('Subscription not found for this company');
    }

    return this.composeSubscriptionResponse(subscription);
  }

  async getUsageStats(companyId: string) {
    const companyObjectId = this.toObjectId(companyId);
    const subscription = await this.subscriptionModel
      .findOne({
        companyId: companyObjectId,
        isActive: true,
      })
      .lean();

    const branchDocs = await this.branchModel
      .find({ companyId: companyObjectId })
      .select('_id')
      .lean();
    const branchIds = branchDocs.map((doc) => doc._id);

    const [userCount, menuItemCount, customerCount, tableCount] =
      await Promise.all([
        this.userModel.countDocuments({ companyId: companyObjectId }),
        this.menuItemModel.countDocuments({ companyId: companyObjectId }),
        this.customerModel.countDocuments({ companyId: companyObjectId }),
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
          // this.logger.error(`Failed to charge subscription ${subscription._id}`, error);
        }
      } else {
        subscription.status = SubscriptionStatus.EXPIRED;
        await subscription.save();
      }
    }

    // this.logger.log(`Processed ${expiringTrials.length} expiring trial subscriptions`);
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
        } catch (error) {
          // this.logger.error(`Failed to process recurring payment for subscription ${subscription._id}`, error);
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

