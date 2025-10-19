import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BillingHistory,
  BillingHistorySchema,
} from './schemas/billing-history.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from './schemas/subscription-plan.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { StripeService } from './stripe.service';
import { SubscriptionsWebhookController } from './subscriptions-webhook.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: BillingHistory.name, schema: BillingHistorySchema },
    ]),
  ],
  controllers: [SubscriptionsController, SubscriptionsWebhookController],
  providers: [SubscriptionsService, StripeService],
  exports: [SubscriptionsService, StripeService],
})
export class SubscriptionsModule {}

