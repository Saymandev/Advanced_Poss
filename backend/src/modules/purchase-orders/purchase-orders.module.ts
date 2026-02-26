import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpensesModule } from '../expenses/expenses.module';
import { Ingredient, IngredientSchema } from '../ingredients/schemas/ingredient.schema';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Supplier, SupplierSchema } from '../suppliers/schemas/supplier.schema';
import { WorkPeriodsModule } from '../work-periods/work-periods.module';
import { PurchaseOrdersController } from './purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders.service';
import {
    PurchaseOrder,
    PurchaseOrderSchema,
} from './schemas/purchase-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Supplier.name, schema: SupplierSchema },
      { name: Ingredient.name, schema: IngredientSchema },
    ]),
    forwardRef(() => ExpensesModule),
    SubscriptionsModule,
    forwardRef(() => WorkPeriodsModule),
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule { }


