import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomersModule } from '../customers/customers.module';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: POSOrder.name, schema: POSOrderSchema }]),
    CustomersModule,
    MenuItemsModule,
    IngredientsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

