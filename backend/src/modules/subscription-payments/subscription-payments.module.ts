import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from '../companies/companies.module';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import {
  SubscriptionPaymentMethod,
  SubscriptionPaymentMethodSchema,
} from './schemas/subscription-payment-method.schema';
import {
  SubscriptionPaymentRequest,
  SubscriptionPaymentRequestSchema,
} from './schemas/subscription-payment-request.schema';
import { SubscriptionPaymentsController } from './subscription-payments.controller';
import { SubscriptionPaymentsService } from './subscription-payments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPaymentMethod.name, schema: SubscriptionPaymentMethodSchema },
      { name: SubscriptionPaymentRequest.name, schema: SubscriptionPaymentRequestSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    CompaniesModule,
    SubscriptionPlansModule,
    WebsocketsModule,
    NotificationsModule,
  ],
  controllers: [SubscriptionPaymentsController],
  providers: [SubscriptionPaymentsService],
  exports: [SubscriptionPaymentsService],
})
export class SubscriptionPaymentsModule {}

