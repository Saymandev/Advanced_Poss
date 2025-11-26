import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import {
  Customer,
  CustomerSchema,
} from '../customers/schemas/customer.schema';
import {
  MenuItem,
  MenuItemSchema,
} from '../menu-items/schemas/menu-item.schema';
import { Table, TableSchema } from '../tables/schemas/table.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
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
      { name: Branch.name, schema: BranchSchema },
      { name: User.name, schema: UserSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Table.name, schema: TableSchema },
    ]),
  ],
  controllers: [SubscriptionsController, SubscriptionsWebhookController],
  providers: [SubscriptionsService, StripeService],
  exports: [SubscriptionsService, StripeService],
})
export class SubscriptionsModule {}

