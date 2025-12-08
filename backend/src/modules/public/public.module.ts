import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchesModule } from '../branches/branches.module';
import { CategoriesModule } from '../categories/categories.module';
import { CompaniesModule } from '../companies/companies.module';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { CustomersModule } from '../customers/customers.module';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { GalleryModule } from '../gallery/gallery.module';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { OrdersModule } from '../orders/orders.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SystemFeedbackModule } from '../system-feedback/system-feedback.module';
import { UsersModule } from '../users/users.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { ContactForm, ContactFormSchema } from './schemas/contact-form.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: ContactForm.name, schema: ContactFormSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    CompaniesModule,
    BranchesModule,
    MenuItemsModule,
    CategoriesModule,
    OrdersModule,
    CustomersModule,
    DeliveryZonesModule,
    GalleryModule,
    UsersModule,
    WebsocketsModule,
    SystemFeedbackModule,
    SubscriptionsModule, // For subscription limit validation
  ],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}

