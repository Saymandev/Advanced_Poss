import {
    BadRequestException,
    Controller,
    Headers,
    Post,
    RawBodyRequest,
    Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
// import { WinstonLoggerService } from '../../common/logger/winston.logger';
import { InvoiceStatus, PaymentStatus } from './schemas/billing-history.schema';
import { SubscriptionStatus } from './schemas/subscription.schema';
import { StripeService } from './stripe.service';
import { SubscriptionsService } from './subscriptions.service';

@Controller('webhooks/stripe')
export class SubscriptionsWebhookController {
  // private readonly logger = new WinstonLoggerService(
  //   'SubscriptionsWebhookController',
  // );

  constructor(
    private readonly stripeService: StripeService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @Public()
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new BadRequestException('Webhook secret not configured');
    }

    try {
      const event = this.stripeService.constructWebhookEvent(
        request.rawBody,
        signature,
        webhookSecret,
      );

      // this.logger.log(`Received webhook event: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object);
          break;

        case 'invoice.payment_action_required':
          await this.handleInvoicePaymentActionRequired(event.data.object);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object);
          break;

        case 'charge.succeeded':
          await this.handleChargeSucceeded(event.data.object);
          break;

        case 'charge.failed':
          await this.handleChargeFailed(event.data.object);
          break;

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;

        default:
          // this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      // this.logger.error('Webhook error', error);
      throw new BadRequestException('Webhook error');
    }
  }

  private async handleSubscriptionCreated(subscription: any) {
    // this.logger.log(`Subscription created: ${subscription.id}`);
    // Additional logic if needed
  }

  private async handleSubscriptionUpdated(subscription: any) {
    // this.logger.log(`Subscription updated: ${subscription.id}`);

    // Use service method to handle webhook update (includes plan change and company sync)
    await this.subscriptionsService.updateFromStripeWebhook(
      subscription.id,
      subscription,
    );
  }

  private async handleSubscriptionDeleted(subscription: any) {
    // this.logger.log(`Subscription deleted: ${subscription.id}`);

    const sub = await this.subscriptionsService['subscriptionModel']
      .findOne({
        stripeSubscriptionId: subscription.id,
      })
      .exec();

    if (sub) {
      sub.status = SubscriptionStatus.CANCELLED;
      sub.cancelledAt = new Date();
      await sub.save();
    }
  }

  private async handleInvoicePaid(invoice: any) {
    // this.logger.log(`Invoice paid: ${invoice.id}`);

    // Find billing history record
    const billing = await this.subscriptionsService['billingModel']
      .findOne({
        stripeInvoiceId: invoice.id,
      })
      .exec();

    if (billing) {
      billing.paymentStatus = PaymentStatus.SUCCEEDED;
      billing.invoiceStatus = InvoiceStatus.PAID;
      billing.paidAt = new Date();
      billing.receiptUrl = invoice.hosted_invoice_url;
      billing.invoicePdfUrl = invoice.invoice_pdf;
      await billing.save();
    } else {
      // Create new billing record
      const subscription = await this.subscriptionsService['subscriptionModel']
        .findOne({
          stripeSubscriptionId: invoice.subscription,
        })
        .exec();

      if (subscription) {
        const invoiceNumber =
          await this.subscriptionsService['generateInvoiceNumber']();

        const newBilling = new this.subscriptionsService['billingModel']({
          companyId: subscription.companyId,
          subscriptionId: subscription._id,
          invoiceNumber,
          stripeInvoiceId: invoice.id,
          invoiceStatus: InvoiceStatus.PAID,
          paymentStatus: PaymentStatus.SUCCEEDED,
          amount: invoice.amount_due / 100,
          total: invoice.amount_due / 100,
          currency: invoice.currency,
          billingDate: new Date(invoice.created * 1000),
          paidAt: new Date(),
          receiptUrl: invoice.hosted_invoice_url,
          invoicePdfUrl: invoice.invoice_pdf,
          periodStart: new Date(invoice.period_start * 1000),
          periodEnd: new Date(invoice.period_end * 1000),
          description: invoice.description || 'Subscription payment',
        });

        await newBilling.save();

        // CRITICAL: Update subscription period dates from invoice
        // Invoice contains the actual billing period from Stripe
        if (invoice.period_start) {
          subscription.currentPeriodStart = new Date(invoice.period_start * 1000);
        }
        if (invoice.period_end) {
          subscription.currentPeriodEnd = new Date(invoice.period_end * 1000);
          subscription.nextBillingDate = new Date(invoice.period_end * 1000);
        }
        
        // Update subscription status to ACTIVE if payment succeeded
        subscription.status = SubscriptionStatus.ACTIVE;
        subscription.lastPaymentDate = new Date();
        subscription.failedPaymentAttempts = 0;
        
        await subscription.save();
        
        // CRITICAL: Update company record with correct dates
        await this.subscriptionsService['companyModel']
          .findByIdAndUpdate(
            subscription.companyId,
            {
              subscriptionStatus: 'active',
              nextBillingDate: subscription.nextBillingDate,
              subscriptionEndDate: subscription.currentPeriodEnd,
            },
            { new: true },
          )
          .exec();
      }
    }
  }

  private async handleInvoicePaymentFailed(invoice: any) {
    // this.logger.log(`Invoice payment failed: ${invoice.id}`);

    const subscription = await this.subscriptionsService['subscriptionModel']
      .findOne({
        stripeSubscriptionId: invoice.subscription,
      })
      .exec();

    if (subscription) {
      subscription.failedPaymentAttempts += 1;

      if (subscription.failedPaymentAttempts >= 3) {
        subscription.status = SubscriptionStatus.PAST_DUE;
      }

      await subscription.save();
    }

    // Update billing record
    const billing = await this.subscriptionsService['billingModel']
      .findOne({
        stripeInvoiceId: invoice.id,
      })
      .exec();

    if (billing) {
      billing.paymentStatus = PaymentStatus.FAILED;
      billing.failureReason = invoice.last_finalization_error?.message;
      billing.attemptCount += 1;
      await billing.save();
    }
  }

  private async handleInvoicePaymentActionRequired(invoice: any) {
    // this.logger.log(`Invoice payment action required: ${invoice.id}`);
    // Send notification to customer
  }

  private async handleTrialWillEnd(subscription: any) {
    // this.logger.log(`Trial will end: ${subscription.id}`);
    // Send notification to customer about trial ending
  }

  private async handleChargeSucceeded(charge: any) {
    // this.logger.log(`Charge succeeded: ${charge.id}`);

    // Update billing record with charge ID
    const billing = await this.subscriptionsService['billingModel']
      .findOne({
        stripePaymentIntentId: charge.payment_intent,
      })
      .exec();

    if (billing) {
      billing.stripeChargeId = charge.id;
      billing.receiptUrl = charge.receipt_url;
      billing.last4 = charge.payment_method_details?.card?.last4;
      billing.cardBrand = charge.payment_method_details?.card?.brand;
      await billing.save();
    }
  }

  private async handleChargeFailed(charge: any) {
    // this.logger.log(`Charge failed: ${charge.id}`);

    const billing = await this.subscriptionsService['billingModel']
      .findOne({
        stripePaymentIntentId: charge.payment_intent,
      })
      .exec();

    if (billing) {
      billing.paymentStatus = PaymentStatus.FAILED;
      billing.failureReason = charge.failure_message;
      await billing.save();
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: any) {
    // this.logger.log(`Payment intent succeeded: ${paymentIntent.id}`);
  }

  private async handlePaymentIntentFailed(paymentIntent: any) {
    // this.logger.log(`Payment intent failed: ${paymentIntent.id}`);
  }
}

