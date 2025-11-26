import { Module, forwardRef } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { WebsocketsGateway } from './websockets.gateway';

@Module({
  imports: [forwardRef(() => OrdersModule)],
  providers: [WebsocketsGateway],
  exports: [WebsocketsGateway],
})
export class WebsocketsModule {}

