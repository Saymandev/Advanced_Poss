import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleFeatureGuard } from '../../common/guards/role-feature.guard';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { Expense, ExpenseSchema } from './schemas/expense.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Expense.name, schema: ExpenseSchema }]),
    RolePermissionsModule, // Import to use RolePermissionsService in RoleFeatureGuard
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService, RoleFeatureGuard],
  exports: [ExpensesService],
})
export class ExpensesModule {}

