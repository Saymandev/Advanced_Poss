import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from '../companies/companies.module';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import {
    SubscriptionPaymentMethod,
    SubscriptionPaymentMethodSchema,
} from './schemas/subscription-payment-method.schema';
import { SubscriptionPaymentsController } from './subscription-payments.controller';
import { SubscriptionPaymentsService } from './subscription-payments.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPaymentMethod.name, schema: SubscriptionPaymentMethodSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    CompaniesModule,
    SubscriptionPlansModule,
  ],
  controllers: [SubscriptionPaymentsController],
  providers: [SubscriptionPaymentsService],
  exports: [SubscriptionPaymentsService],
})
export class SubscriptionPaymentsModule {}

