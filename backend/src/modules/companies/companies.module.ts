import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { Company, CompanySchema } from './schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: Branch.name, schema: BranchSchema },
      { name: POSOrder.name, schema: POSOrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => SubscriptionPlansModule),
    forwardRef(() => SettingsModule),
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}

