import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsModule } from '../bookings/bookings.module';
import { BranchesModule } from '../branches/branches.module';
import { CategoriesModule } from '../categories/categories.module';
import { CompaniesModule } from '../companies/companies.module';
import { CustomersModule } from '../customers/customers.module';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { GalleryModule } from '../gallery/gallery.module';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { OrdersModule } from '../orders/orders.module';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { RoomsModule } from '../rooms/rooms.module';
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
    RoomsModule, // For public room browsing
    BookingsModule, // For public bookings
  ],
  controllers: [PublicController],
  providers: [PublicService],
  exports: [PublicService],
})
export class PublicModule {}

