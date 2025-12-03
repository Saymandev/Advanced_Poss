import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from '../companies/companies.module';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { Table, TableSchema } from '../tables/schemas/table.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { Branch, BranchSchema } from './schemas/branch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Branch.name, schema: BranchSchema },
      { name: Table.name, schema: TableSchema },
      { name: User.name, schema: UserSchema },
      { name: POSOrder.name, schema: POSOrderSchema },
    ]),
    forwardRef(() => CompaniesModule),
    SubscriptionPlansModule,
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}

