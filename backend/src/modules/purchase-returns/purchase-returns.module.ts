import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PurchaseReturnsController } from './purchase-returns.controller';
import { PurchaseReturnsService } from './purchase-returns.service';
import { PurchaseReturn, PurchaseReturnSchema } from './schemas/purchase-return.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../purchase-orders/schemas/purchase-order.schema';
import { Ingredient, IngredientSchema } from '../ingredients/schemas/ingredient.schema';
import { IncomesModule } from '../incomes/incomes.module';
import { Supplier, SupplierSchema } from '../suppliers/schemas/supplier.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseReturn.name, schema: PurchaseReturnSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Ingredient.name, schema: IngredientSchema },
      { name: Supplier.name, schema: SupplierSchema },
    ]),
    forwardRef(() => SubscriptionsModule),
    forwardRef(() => IncomesModule),
  ],
  controllers: [PurchaseReturnsController],
  providers: [PurchaseReturnsService],
  exports: [PurchaseReturnsService],
})
export class PurchaseReturnsModule {}
