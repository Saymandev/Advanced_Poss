import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Stripe from 'stripe';
import { Company, CompanyDocument } from '../companies/schemas/company.schema';
import { Subscription, SubscriptionDocument, SubscriptionStatus, BillingCycle } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionPlansService } from '../subscriptions/subscription-plans.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private subscriptionPlansService: SubscriptionPlansService,
  ) {
    this.stripe = new Stripe(this.configService.get('stripe.secretKey'), {
      apiVersion: '2023-10-16',
    });
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
            recurring: {
              interval: plan.billingCycle === 'monthly' ? 'month' : 'year',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
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
        console.log(`Unhandled event type: ${event.type}`);
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
    // First, update the fields we want to set
    await this.companyModel.findByIdAndUpdate(
      companyId,
      {
        $set: {
          subscriptionPlan: planName,
          subscriptionStatus: 'active',
          subscriptionStartDate: now,
          subscriptionEndDate: subscriptionEndDate,
          settings: {
            ...company.settings,
            features: plan.features,
          },
        },
        $unset: {
          trialEndDate: '', // Explicitly remove trialEndDate field completely
        },
      },
    );
    
    // Verify the update by fetching the company again
    const updatedCompany = await this.companyModel.findById(companyId).lean().exec();
    console.log(`✅ Company ${companyId} updated after payment:`, {
      subscriptionStatus: updatedCompany?.subscriptionStatus,
      subscriptionPlan: updatedCompany?.subscriptionPlan,
      trialEndDate: updatedCompany?.trialEndDate,
      hasTrialEndDate: updatedCompany?.trialEndDate !== null && updatedCompany?.trialEndDate !== undefined,
      subscriptionEndDate: updatedCompany?.subscriptionEndDate,
      allKeys: updatedCompany ? Object.keys(updatedCompany) : [],
    });

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
      subscription.isActive = true;
      subscription.stripeCustomerId = session.customer as string;
      subscription.stripeSubscriptionId = session.subscription as string || undefined;
      subscription.stripePriceId = plan.stripePriceId || undefined;
      
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
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string || undefined,
        stripePriceId: plan.stripePriceId || undefined,
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

    console.log(`Subscription activated for company ${companyId} with plan ${planName}`);
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    // Handle successful recurring payment
    console.log('Invoice payment succeeded:', invoice.id);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // Handle failed payment
    console.log('Invoice payment failed:', invoice.id);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Handle subscription cancellation
    console.log('Subscription deleted:', subscription.id);
  }
}
