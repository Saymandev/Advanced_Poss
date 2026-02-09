import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import {
  Customer,
  CustomerSchema,
} from '../customers/schemas/customer.schema';
import {
  MenuItem,
  MenuItemSchema,
} from '../menu-items/schemas/menu-item.schema';
import { SuperAdminNotificationsModule } from '../super-admin-notifications/super-admin-notifications.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Table, TableSchema } from '../tables/schemas/table.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import {
  BillingHistory,
  BillingHistorySchema,
} from './schemas/billing-history.schema';
import {
  SubscriptionFeature,
  SubscriptionFeatureSchema,
} from './schemas/subscription-feature.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from './schemas/subscription-plan.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { StripeService } from './stripe.service';
import { SubscriptionFeaturesController } from './subscription-features.controller';
import { SubscriptionFeaturesService } from './subscription-features.service';
import { SubscriptionsWebhookController } from './subscriptions-webhook.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: SubscriptionFeature.name, schema: SubscriptionFeatureSchema },
      { name: BillingHistory.name, schema: BillingHistorySchema },
      { name: Company.name, schema: CompanySchema },
      { name: Branch.name, schema: BranchSchema },
      { name: User.name, schema: UserSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Table.name, schema: TableSchema },
    ]),
    SuperAdminNotificationsModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [
    SubscriptionsController,
    SubscriptionsWebhookController,
    SubscriptionFeaturesController,
  ],
  providers: [
    SubscriptionsService,
    SubscriptionFeaturesService,
    StripeService,
  ],
  exports: [
    SubscriptionsService,
    SubscriptionFeaturesService,
    StripeService,
    MongooseModule, // Export to make Subscription model available to other modules
    SubscriptionPlansService,
  ],
})
export class SubscriptionsModule { }

