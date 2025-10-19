import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Schema as MongooseSchema } from 'mongoose';
// import { WinstonLoggerService } from '../../common/logger/winston.logger';
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
    SubscriptionPlanConfig,
    SubscriptionPlanDocument,
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

@Injectable()
export class SubscriptionsService {
  // private readonly logger = new WinstonLoggerService('SubscriptionsService');

  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(SubscriptionPlanConfig.name)
    private planModel: Model<SubscriptionPlanDocument>,
    @InjectModel(BillingHistory.name)
    private billingModel: Model<BillingHistoryDocument>,
    private stripeService: StripeService,
  ) {}

  // Create a new subscription
  async create(
    createSubscriptionDto: CreateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    try {
      const plan = await this.planModel.findOne({
        plan: createSubscriptionDto.plan,
        isActive: true,
      });

      if (!plan) {
        throw new BadRequestException('Invalid subscription plan');
      }

      // @ts-ignore - Mongoose schema method
      const price = plan.getPriceForCycle(createSubscriptionDto.billingCycle);

      // Check if company already has a subscription
      const existingSubscription = await this.subscriptionModel.findOne({
        companyId: createSubscriptionDto.companyId,
        isActive: true,
      });

      if (existingSubscription) {
        throw new BadRequestException(
          'Company already has an active subscription',
        );
      }

      // Create Stripe customer
      const stripeCustomer = await this.stripeService.createCustomer({
        email: createSubscriptionDto.email,
        name: createSubscriptionDto.companyName,
        metadata: {
          companyId: createSubscriptionDto.companyId.toString(),
        },
      });

      // Calculate trial dates
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + plan.trialDays);

      const subscription = new this.subscriptionModel({
        companyId: createSubscriptionDto.companyId,
        plan: createSubscriptionDto.plan,
        status: SubscriptionStatus.TRIAL,
        billingCycle: createSubscriptionDto.billingCycle,
        price,
        currency: plan.currency,
        stripeCustomerId: stripeCustomer.id,
        trialStartDate,
        trialEndDate,
        currentPeriodStart: trialStartDate,
        currentPeriodEnd: trialEndDate,
        nextBillingDate: trialEndDate,
        limits: plan.limits,
        usage: this.getInitialUsage(),
        autoRenew: true,
      });

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
    plan?: SubscriptionPlan;
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
        .populate('companyId', 'name email')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean()
        .exec(),
      this.subscriptionModel.countDocuments(query),
    ]);

    // @ts-ignore - Mongoose lean type
    return { subscriptions, total };
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
  ): Promise<SubscriptionDocument> {
    const subscription = await this.subscriptionModel
      .findOne({ companyId, isActive: true })
      .populate('companyId', 'name email')
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found for this company');
    }

    return subscription;
  }

  // Update subscription
  async update(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    const subscription = await this.findById(id);

    Object.assign(subscription, updateSubscriptionDto);
    return await subscription.save();
  }

  // Upgrade/Downgrade subscription
  async upgrade(
    id: string,
    upgradeDto: UpgradeSubscriptionDto,
  ): Promise<SubscriptionDocument> {
    const subscription = await this.findById(id);

    const newPlan = await this.planModel.findOne({
      plan: upgradeDto.newPlan,
      isActive: true,
    });

    if (!newPlan) {
      throw new BadRequestException('Invalid subscription plan');
    }

    // @ts-ignore - Mongoose schema method
    const newPrice = newPlan.getPriceForCycle(
      upgradeDto.billingCycle || subscription.billingCycle,
    );

    // Calculate prorated amount if upgrading mid-cycle
    const proratedAmount = await this.calculateProratedAmount(
      subscription,
      newPrice,
    );

    // Update Stripe subscription if active
    if (
      subscription.status === SubscriptionStatus.ACTIVE &&
      subscription.stripeSubscriptionId
    ) {
      await this.stripeService.updateSubscription(
        subscription.stripeSubscriptionId,
        {
          // @ts-ignore - Mongoose schema method
          priceId: newPlan.getStripePriceId(
            upgradeDto.billingCycle || subscription.billingCycle,
          ),
          prorationBehavior: 'create_prorations',
        },
      );
    }

    subscription.plan = upgradeDto.newPlan;
    subscription.price = newPrice;
    subscription.limits = newPlan.limits;

    if (upgradeDto.billingCycle) {
      subscription.billingCycle = upgradeDto.billingCycle;
    }

    return await subscription.save();
  }

  // Cancel subscription
  async cancel(
    id: string,
    reason?: string,
    cancelImmediately = false,
  ): Promise<SubscriptionDocument> {
    const subscription = await this.findById(id);

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
    companyId: MongooseSchema.Types.ObjectId,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      status?: PaymentStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ history: BillingHistoryDocument[]; total: number }> {
    const query: any = { companyId, isActive: true };

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
      lastUpdated: new Date(),
    };
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

