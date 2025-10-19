import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
// import { WinstonLoggerService } from '../../common/logger/winston.logger';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  // private readonly logger = new WinstonLoggerService('StripeService');

  constructor(private configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      console.warn('Stripe secret key not configured');
    }

    this.stripe = new Stripe(stripeSecretKey || '', {
      apiVersion: '2023-10-16',
    });
  }

  // Customer methods
  async createCustomer(params: {
    email: string;
    name: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: params.metadata,
      });
    } catch (error) {
      console.error('Failed to create Stripe customer', error);
      throw error;
    }
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    } catch (error) {
      console.error('Failed to retrieve Stripe customer', error);
      throw error;
    }
  }

  async updateCustomer(
    customerId: string,
    params: Stripe.CustomerUpdateParams,
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.update(customerId, params);
    } catch (error) {
      console.error('Failed to update Stripe customer', error);
      throw error;
    }
  }

  async deleteCustomer(customerId: string): Promise<Stripe.DeletedCustomer> {
    try {
      return await this.stripe.customers.del(customerId);
    } catch (error) {
      console.error('Failed to delete Stripe customer', error);
      throw error;
    }
  }

  // Payment method methods
  async attachPaymentMethod(
    paymentMethodId: string,
    customerId: string,
  ): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error) {
      console.error('Failed to attach payment method', error);
      throw error;
    }
  }

  async detachPaymentMethod(
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod> {
    try {
      return await this.stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      console.error('Failed to detach payment method', error);
      throw error;
    }
  }

  async listPaymentMethods(
    customerId: string,
  ): Promise<Stripe.PaymentMethod[]> {
    try {
      const methods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return methods.data;
    } catch (error) {
      console.error('Failed to list payment methods', error);
      throw error;
    }
  }

  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string,
  ): Promise<Stripe.Customer> {
    try {
      return await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      console.error('Failed to set default payment method', error);
      throw error;
    }
  }

  // Payment intent methods
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customer: string;
    paymentMethod: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency,
        customer: params.customer,
        payment_method: params.paymentMethod,
        description: params.description,
        metadata: params.metadata,
        confirm: false,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      });
    } catch (error) {
      console.error('Failed to create payment intent', error);
      throw error;
    }
  }

  async confirmPayment(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.confirm(paymentIntentId);
    } catch (error) {
      console.error('Failed to confirm payment', error);
      throw error;
    }
  }

  async cancelPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.cancel(paymentIntentId);
    } catch (error) {
      console.error('Failed to cancel payment intent', error);
      throw error;
    }
  }

  // Subscription methods
  async createSubscription(params: {
    customer: string;
    priceId: string;
    trialDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.create({
        customer: params.customer,
        items: [{ price: params.priceId }],
        trial_period_days: params.trialDays,
        metadata: params.metadata,
      });
    } catch (error) {
      console.error('Failed to create subscription', error);
      throw error;
    }
  }

  async updateSubscription(
    subscriptionId: string,
    params: {
      priceId?: string;
      prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
    },
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(
        subscriptionId,
      );

      return await this.stripe.subscriptions.update(subscriptionId, {
        items: params.priceId
          ? [
              {
                id: subscription.items.data[0].id,
                price: params.priceId,
              },
            ]
          : undefined,
        proration_behavior: params.prorationBehavior,
      });
    } catch (error) {
      console.error('Failed to update subscription', error);
      throw error;
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    options: { immediate?: boolean; atPeriodEnd?: boolean } = {},
  ): Promise<Stripe.Subscription> {
    try {
      if (options.immediate) {
        return await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        return await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }
    } catch (error) {
      console.error('Failed to cancel subscription', error);
      throw error;
    }
  }

  async reactivateSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });
    } catch (error) {
      console.error('Failed to reactivate subscription', error);
      throw error;
    }
  }

  async pauseSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: 'mark_uncollectible',
        },
      });
    } catch (error) {
      console.error('Failed to pause subscription', error);
      throw error;
    }
  }

  async resumeSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    try {
      return await this.stripe.subscriptions.update(subscriptionId, {
        pause_collection: null,
      });
    } catch (error) {
      console.error('Failed to resume subscription', error);
      throw error;
    }
  }

  // Invoice methods
  async createInvoice(params: {
    customer: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.create({
        customer: params.customer,
        description: params.description,
        metadata: params.metadata,
        auto_advance: true,
      });
    } catch (error) {
      console.error('Failed to create invoice', error);
      throw error;
    }
  }

  async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.retrieve(invoiceId);
    } catch (error) {
      console.error('Failed to retrieve invoice', error);
      throw error;
    }
  }

  async listInvoices(customerId: string): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit: 100,
      });
      return invoices.data;
    } catch (error) {
      console.error('Failed to list invoices', error);
      throw error;
    }
  }

  async finalizeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.finalizeInvoice(invoiceId);
    } catch (error) {
      console.error('Failed to finalize invoice', error);
      throw error;
    }
  }

  async payInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      return await this.stripe.invoices.pay(invoiceId);
    } catch (error) {
      console.error('Failed to pay invoice', error);
      throw error;
    }
  }

  // Refund methods
  async createRefund(params: {
    paymentIntent: string;
    amount?: number;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  }): Promise<Stripe.Refund> {
    try {
      return await this.stripe.refunds.create({
        payment_intent: params.paymentIntent,
        amount: params.amount,
        reason: params.reason,
      });
    } catch (error) {
      console.error('Failed to create refund', error);
      throw error;
    }
  }

  // Webhook methods
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    webhookSecret: string,
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      console.error('Failed to construct webhook event', error);
      throw error;
    }
  }
}

