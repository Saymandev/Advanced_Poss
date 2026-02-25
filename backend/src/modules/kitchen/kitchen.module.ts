import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersModule } from '../orders/orders.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';
import { KitchenOrder, KitchenOrderSchema } from './schemas/kitchen-order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: KitchenOrder.name, schema: KitchenOrderSchema },
    ]),
    forwardRef(() => OrdersModule),
    forwardRef(() => WebsocketsModule),
  ],
  controllers: [KitchenController],
  providers: [KitchenService],
  exports: [KitchenService],
})
export class KitchenModule {}

