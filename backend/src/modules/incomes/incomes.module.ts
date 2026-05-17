import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleFeatureGuard } from '../../common/guards/role-feature.guard';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WorkPeriodsModule } from '../work-periods/work-periods.module';
import { IncomesController } from './incomes.controller';
import { IncomesService } from './incomes.service';
import { Income, IncomeSchema } from './schemas/income.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Income.name, schema: IncomeSchema }]),
    RolePermissionsModule, // Import to use RolePermissionsService in RoleFeatureGuard
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => TransactionsModule),
    forwardRef(() => WorkPeriodsModule),
  ],
  controllers: [IncomesController],
  providers: [IncomesService, RoleFeatureGuard],
  exports: [IncomesService],
})
export class IncomesModule {}
