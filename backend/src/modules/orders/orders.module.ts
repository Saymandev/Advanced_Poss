import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { POSModule } from '../pos/pos.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TablesModule } from '../tables/tables.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    forwardRef(() => POSModule),
    forwardRef(() => TablesModule), // Circular dependency through SubscriptionsModule
    forwardRef(() => MenuItemsModule), // Circular dependency through SubscriptionsModule
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => TransactionsModule), // Used to record payments in accounting ledger
    forwardRef(() => NotificationsModule),
    forwardRef(() => WebsocketsModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [
    OrdersService,
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
})
export class OrdersModule {}

