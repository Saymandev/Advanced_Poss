import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OpenAIService } from '../../common/services/openai.service';
import { CategoriesModule } from '../categories/categories.module';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { MenuItem, MenuItemSchema } from '../menu-items/schemas/menu-item.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: POSOrder.name, schema: POSOrderSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    CategoriesModule,
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
  ],
  controllers: [AiController],
  providers: [AiService, OpenAIService],
  exports: [AiService],
})
export class AiModule {}

