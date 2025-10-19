import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { WebsocketsGateway } from './websockets.gateway';

@Module({
  imports: [OrdersModule],
  providers: [WebsocketsGateway],
  exports: [WebsocketsGateway],
})
export class WebsocketsModule {}

