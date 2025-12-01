import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { UsersModule } from '../users/users.module';
import { Branch, BranchSchema } from '../branches/schemas/branch.schema';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
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
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}

