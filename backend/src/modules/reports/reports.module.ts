import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from '../bookings/schemas/booking.schema';
import { CustomersModule } from '../customers/customers.module';
import { Expense, ExpenseSchema } from '../expenses/schemas/expense.schema';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../purchase-orders/schemas/purchase-order.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Transaction, TransactionSchema } from '../transactions/schemas/transaction.schema';
import { WastageModule } from '../wastage/wastage.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: POSOrder.name, schema: POSOrderSchema },
      { name: Expense.name, schema: ExpenseSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    CustomersModule,
    MenuItemsModule,
    IngredientsModule,
    WastageModule,
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

