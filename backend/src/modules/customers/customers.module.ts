import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { Customer, CustomerSchema } from './schemas/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: POSOrder.name, schema: POSOrderSchema },
    ]),
  ],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}

