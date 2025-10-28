import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchesModule } from '../branches/branches.module';
import { CategoriesModule } from '../categories/categories.module';
import { CompaniesModule } from '../companies/companies.module';
import { CustomersModule } from '../customers/customers.module';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { OrdersModule } from '../orders/orders.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { UsersModule } from '../users/users.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    CompaniesModule,
    BranchesModule,
    MenuItemsModule,
    CategoriesModule,
    OrdersModule,
    CustomersModule,
    DeliveryZonesModule,
    UsersModule,
  ],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}

