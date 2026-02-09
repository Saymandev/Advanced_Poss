import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../subscriptions/schemas/subscription-plan.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SystemSettings, SystemSettingsSchema } from '../settings/schemas/system-settings.schema';
import { EmailService } from '../../common/services/email.service';
import { SmsService } from '../../common/services/sms.service';
import { MarketingController } from './marketing.controller';
import { MarketingService } from './marketing.service';
import { MarketingSchedulerService } from './marketing-scheduler.service';
import {
  MarketingCampaign,
  MarketingCampaignSchema,
} from './schemas/marketing-campaign.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MarketingCampaign.name, schema: MarketingCampaignSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: SystemSettings.name, schema: SystemSettingsSchema },
    ]),
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
  ],
  controllers: [MarketingController],
  providers: [MarketingService, MarketingSchedulerService, EmailService, SmsService],
  exports: [MarketingService],
})
export class MarketingModule { }

