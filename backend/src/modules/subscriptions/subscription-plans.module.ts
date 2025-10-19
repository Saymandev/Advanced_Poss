import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { PaymentsModule } from '../payments/payments.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from './schemas/subscription-plan.schema';
import { SubscriptionManagementController } from './subscription-management.controller';
import { SubscriptionPlansController } from './subscription-plans.controller';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionRemindersService } from './subscription-reminders.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
    ]),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [SubscriptionPlansController, SubscriptionManagementController],
  providers: [SubscriptionPlansService, SubscriptionRemindersService],
  exports: [SubscriptionPlansService, SubscriptionRemindersService],
})
export class SubscriptionPlansModule {}
