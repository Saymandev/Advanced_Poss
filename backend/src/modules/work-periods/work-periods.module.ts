import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { POSModule } from '../pos/pos.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { WorkPeriod, WorkPeriodSchema } from './schemas/work-period.schema';
import { WorkPeriodsController } from './work-periods.controller';
import { WorkPeriodsService } from './work-periods.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkPeriod.name, schema: WorkPeriodSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
    forwardRef(() => POSModule),
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
  ],
  controllers: [WorkPeriodsController],
  providers: [WorkPeriodsService],
  exports: [WorkPeriodsService],
})
export class WorkPeriodsModule {}
