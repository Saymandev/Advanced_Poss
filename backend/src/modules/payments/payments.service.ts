import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { UserRole } from '../../common/enums/user-role.enum';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { getStripeBillingInterval } from '../subscription-payments/utils/billing-cycle.helper';
import { BillingCycle, Subscription, SubscriptionDocument, SubscriptionStatus } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  constructor(
    private configService: ConfigService,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private subscriptionPlansService: SubscriptionPlansService,
    private websocketsGateway: WebsocketsGateway,
  ) {
    this.stripe = new Stripe(this.configService.get('stripe.secretKey'), {
      apiVersion: '2023-10-16',
    });
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
  async createPaymentIntent(companyId: string, planName: string) {
    // Get company details
    const company = await this.companyModel.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    // Get subscription plan details
    const plan = await this.subscriptionPlansService.findByName(planName);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    // Create Stripe customer if not exists
    let customerId = company.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: company.email,
        name: company.name,
        metadata: {
          companyId: companyId,
        },
      });
      customerId = customer.id;
      // Update company with Stripe customer ID
      await this.companyModel.findByIdAndUpdate(companyId, {
        stripeCustomerId: customerId,
      });
    }
    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: plan.price * 100, // Convert to cents
      currency: plan.currency.toLowerCase(),
      customer: customerId,
      metadata: {
        companyId: companyId,
        planName: planName,
        planId: (plan as any)._id.toString(),
      },
      description: `${plan.displayName} subscription for ${company.name}`,
    });
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: plan.price,
      currency: plan.currency,
      plan: {
        name: plan.name,
        displayName: plan.displayName,
        features: plan.features,
      },
    };
  }
  async confirmPayment(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        throw new BadRequestException('Payment not completed');
      }
      const { companyId, planName } = paymentIntent.metadata;
      // Update company subscription
      const company = await this.companyModel.findById(companyId);
      if (!company) {
        throw new NotFoundException('Company not found');
      }
      const plan = await this.subscriptionPlansService.findByName(planName);
      if (!plan) {
        throw new NotFoundException('Subscription plan not found');
      }
      // Calculate subscription dates using millisecond-based calculation
      const now = new Date();
      const subscriptionEndDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days (1 month)
      // Update company subscription
      await this.companyModel.findByIdAndUpdate(companyId, {
        subscriptionPlan: planName,
        subscriptionStatus: 'active',
        subscriptionStartDate: now,
        subscriptionEndDate: subscriptionEndDate,
        trialEndDate: null, // Clear trial
        settings: {
          ...company.settings,
          features: plan.features,
        },
      });
      return {
        success: true,
        message: 'Payment confirmed and subscription activated',
        subscription: {
          plan: planName,
          status: 'active',
          startDate: now,
          endDate: subscriptionEndDate,
        },
      };
    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw new BadRequestException('Failed to confirm payment');
    }
  }
  async createCheckoutSession(companyId: string, planName: string, successUrl: string, cancelUrl: string) {
    // Get company details
    const company = await this.companyModel.findById(companyId);
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    // Get subscription plan details
    const plan = await this.subscriptionPlansService.findByName(planName);
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }
    // Create Stripe customer if not exists
    let customerId = company.stripeCustomerId;
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: company.email,
        name: company.name,
        metadata: {
          companyId: companyId,
        },
      });
      customerId = customer.id;
      // Update company with Stripe customer ID
      await this.companyModel.findByIdAndUpdate(companyId, {
        stripeCustomerId: customerId,
      });
    }
    // Create checkout session
    // Append session_id to success_url for manual activation fallback
    const successUrlWithSession = successUrl.includes('?') 
      ? `${successUrl}&session_id={CHECKOUT_SESSION_ID}`
      : `${successUrl}?session_id={CHECKOUT_SESSION_ID}`;
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: plan.displayName,
              description: plan.description,
            },
            unit_amount: plan.price * 100, // Convert to cents
            recurring: (() => {
              const billingCycle = plan.billingCycle || BillingCycle.MONTHLY;
              const stripeInterval = getStripeBillingInterval(billingCycle);
              return {
                interval: stripeInterval.interval as 'month' | 'year',
                interval_count: stripeInterval.intervalCount,
              };
            })(),
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrlWithSession,
      cancel_url: cancelUrl,
      metadata: {
        companyId: companyId,
        planName: planName,
        planId: (plan as any)._id.toString(),
      },
    });
    return {
      sessionId: session.id,
      url: session.url,
    };
  }
  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = this.configService.get('stripe.webhookSecret');
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new BadRequestException('Invalid webhook signature');
    }
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        }
    return { received: true };
  }
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const { companyId, planName } = session.metadata;
    if (!companyId || !planName) {
      console.error('Missing metadata in checkout session');
      return;
    }
    // Update company subscription
    const company = await this.companyModel.findById(companyId);
    if (!company) {
      console.error('Company not found:', companyId);
      return;
    }
    const plan = await this.subscriptionPlansService.findByName(planName);
    if (!plan) {
      console.error('Plan not found:', planName);
      return;
    }
    // Calculate subscription dates using millisecond-based calculation
    const now = new Date();
    // Add 30 days for monthly subscription (more accurate than setMonth)
    const subscriptionEndDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
    // Update company subscription - use $unset to completely remove trialEndDate field
    // Properly merge settings to ensure features are saved correctly
    const existingSettings = company.settings || {};
    // Create updated settings object with plan features
    const updatedSettings = {
      ...existingSettings,
      features: plan.features, // Ensure plan features override any existing features
    };
    await this.companyModel.findByIdAndUpdate(
      companyId,
      {
        $set: {
          subscriptionPlan: planName,
          subscriptionStatus: 'active',
          subscriptionStartDate: now,
          subscriptionEndDate: subscriptionEndDate,
          nextBillingDate: subscriptionEndDate, // CRITICAL: Set nextBillingDate for plan changes
          settings: updatedSettings, // Update entire settings object with merged features
        },
        $unset: {
          trialEndDate: '', // Explicitly remove trialEndDate field completely
        },
      },
    );
    // Verify the update by fetching the company again
    const updatedCompany = await this.companyModel.findById(companyId).lean().exec();
    // Find or create subscription record
    const companyObjectId = new Types.ObjectId(companyId);
    let subscription = await this.subscriptionModel.findOne({
      companyId: companyObjectId,
    }).exec();
    if (subscription) {
      // Update existing subscription
      subscription.status = SubscriptionStatus.ACTIVE;
      subscription.plan = planName as any;
      subscription.price = plan.price;
      subscription.currency = plan.currency || 'BDT';
      subscription.billingCycle = (plan.billingCycle || 'monthly') as BillingCycle;
      subscription.trialEndDate = null;
      subscription.currentPeriodStart = now;
      subscription.currentPeriodEnd = subscriptionEndDate;
      subscription.nextBillingDate = subscriptionEndDate;
      subscription.lastPaymentDate = now;
      subscription.failedPaymentAttempts = 0;
      // CRITICAL: Extract ID from customer/subscription objects if they're expanded
      const customerId = typeof session.customer === 'string' 
        ? session.customer 
        : (session.customer as any)?.id || session.customer;
      const subscriptionId = typeof session.subscription === 'string'
        ? (session.subscription || undefined)
        : (session.subscription as any)?.id || undefined;
      subscription.isActive = true; // CRITICAL: Ensure isActive is true for active subscriptions
      subscription.stripeCustomerId = customerId;
      subscription.stripeSubscriptionId = subscriptionId;
      subscription.stripePriceId = this.resolveStripePriceId(plan.name, plan.stripePriceId) || undefined;
      // CRITICAL: Populate enabledFeatures from plan's enabledFeatureKeys
      if (plan.enabledFeatureKeys && Array.isArray(plan.enabledFeatureKeys) && plan.enabledFeatureKeys.length > 0) {
        subscription.enabledFeatures = plan.enabledFeatureKeys;
      } else {
        // Fallback: convert legacy features to keys
        subscription.enabledFeatures = [];
        }
      // Build limits from plan (using same logic as SubscriptionsService)
      const maxBranches = plan.limits?.maxBranches ?? plan.features?.maxBranches ?? -1;
      const maxUsers = plan.limits?.maxUsers ?? plan.features?.maxUsers ?? -1;
      const derive = (value: number, multiplier: number) => value > 0 ? value * multiplier : -1;
      subscription.limits = {
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
        prioritySupportEnabled: plan.limits?.prioritySupportEnabled ?? plan.features?.aiInsights ?? false,
        storageGB: plan.limits?.storageGB ?? 0,
        // Public ordering system
        publicOrderingEnabled: plan.limits?.publicOrderingEnabled ?? false,
        maxPublicBranches: plan.limits?.maxPublicBranches ?? -1, // Default to unlimited
        // Review system
        reviewsEnabled: plan.limits?.reviewsEnabled ?? false,
        reviewModerationRequired: plan.limits?.reviewModerationRequired ?? false,
        maxReviewsPerMonth: plan.limits?.maxReviewsPerMonth ?? -1, // Default to unlimited
      } as any;
      await subscription.save();
      } else {
      // Create new subscription record
      const maxBranches = plan.limits?.maxBranches ?? plan.features?.maxBranches ?? -1;
      const maxUsers = plan.limits?.maxUsers ?? plan.features?.maxUsers ?? -1;
      const derive = (value: number, multiplier: number) => value > 0 ? value * multiplier : -1;
      subscription = new this.subscriptionModel({
        companyId: companyObjectId,
        plan: planName as any,
        status: SubscriptionStatus.ACTIVE,
        billingCycle: (plan.billingCycle || 'monthly') as BillingCycle,
        price: plan.price,
        currency: plan.currency || 'BDT',
        stripeCustomerId: typeof session.customer === 'string' 
          ? session.customer 
          : (session.customer as any)?.id || session.customer,
        stripeSubscriptionId: typeof session.subscription === 'string'
          ? (session.subscription || undefined)
          : (session.subscription as any)?.id || undefined,
        stripePriceId: this.resolveStripePriceId(plan.name, plan.stripePriceId) || undefined,
        // CRITICAL: Populate enabledFeatures from plan's enabledFeatureKeys
        enabledFeatures: plan.enabledFeatureKeys && Array.isArray(plan.enabledFeatureKeys) && plan.enabledFeatureKeys.length > 0
          ? plan.enabledFeatureKeys
          : [],
        currentPeriodStart: now,
        currentPeriodEnd: subscriptionEndDate,
        nextBillingDate: subscriptionEndDate,
        lastPaymentDate: now,
        trialEndDate: null,
        limits: {
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
          prioritySupportEnabled: plan.limits?.prioritySupportEnabled ?? plan.features?.aiInsights ?? false,
          storageGB: plan.limits?.storageGB ?? 0,
        } as any,
        usage: {
          currentBranches: 0,
          currentUsers: 0,
          currentMenuItems: 0,
          currentOrders: 0,
          currentTables: 0,
          currentCustomers: 0,
          storageUsed: 0,
          lastUpdated: new Date(),
        },
        autoRenew: true,
        isActive: true,
      });
      await subscription.save();
      }
    // Notify all super admins about new subscription
    try {
      const superAdmins = await this.userModel.find({ 
        role: UserRole.SUPER_ADMIN,
        isActive: true 
      }).select('_id email firstName lastName').exec();
      if (superAdmins && superAdmins.length > 0) {
        const companyName = company.name || 'Unknown Company';
        const planDisplayName = plan.displayName || planName;
        // Send notification to each super admin via WebSocket
        for (const admin of superAdmins) {
          // Use admin ID as branchId to send personal notification
          this.websocketsGateway.notifySystemNotification(admin._id.toString(), {
            type: 'subscription',
            title: 'New Subscription Activated',
            message: `${companyName} has successfully subscribed to ${planDisplayName} plan (${plan.price} ${plan.currency || 'BDT'}/${plan.billingCycle || 'monthly'})`,
            data: {
              companyId: companyId,
              companyName: companyName,
              planName: planName,
              planDisplayName: planDisplayName,
              subscriptionId: subscription._id.toString(),
              amount: plan.price,
              currency: plan.currency || 'BDT',
              billingCycle: plan.billingCycle || 'monthly',
            },
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('❌ Error notifying super admins:', error);
      // Don't fail subscription activation if notification fails
    }
  }
  // Manual activation method - called from frontend when webhook hasn't processed yet
  async activateSubscriptionFromSession(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Retrieve the checkout session from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'customer', 'subscription'],
      });
      // Check if payment was successful
      if (session.payment_status !== 'paid') {
        return {
          success: false,
          message: `Payment status is ${session.payment_status}. Subscription cannot be activated.`,
        };
      }
      // Check if already processed
      const { companyId } = session.metadata || {};
      if (!companyId) {
        return {
          success: false,
          message: 'No company ID found in session metadata.',
        };
      }
      const company = await this.companyModel.findById(companyId);
      if (!company) {
        return {
          success: false,
          message: 'Company not found.',
        };
      }
      // Check if this is a plan change (different plan than current)
      const { planName } = session.metadata || {};
      const isPlanChange = planName && company.subscriptionPlan && company.subscriptionPlan !== planName;
      // If subscription is already active and NOT a plan change, return early
      if (company.subscriptionStatus === 'active' && !company.trialEndDate && !isPlanChange) {
        return {
          success: true,
          message: 'Subscription is already active.',
        };
      }
      // Call handleCheckoutCompleted to activate or update plan
      // This will handle both initial activation and plan changes
      await this.handleCheckoutCompleted(session);
      return {
        success: true,
        message: 'Subscription activated successfully.',
      };
    } catch (error: any) {
      console.error('Error activating subscription from session:', error);
      return {
        success: false,
        message: error.message || 'Failed to activate subscription.',
      };
    }
  }
  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    // Handle successful recurring payment
    }
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // Handle failed payment
    }
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Handle subscription cancellation
    }
}
