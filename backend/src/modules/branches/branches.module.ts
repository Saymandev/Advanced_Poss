import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompaniesModule } from '../companies/companies.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { Branch, BranchSchema } from './schemas/branch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Branch.name, schema: BranchSchema }]),
    CompaniesModule,
    SubscriptionPlansModule,
  ],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}

