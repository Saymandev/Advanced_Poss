import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailService } from '../../common/services/email.service';
import { SmsService } from '../../common/services/sms.service';
import { BookingsModule } from '../bookings/bookings.module';
import { BranchesModule } from '../branches/branches.module';
import { CompaniesModule } from '../companies/companies.module';
import { CustomersModule } from '../customers/customers.module';
import { DeliveryZonesModule } from '../delivery-zones/delivery-zones.module';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { KitchenModule } from '../kitchen/kitchen.module';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { SystemSettings, SystemSettingsSchema } from '../settings/schemas/system-settings.schema';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../subscriptions/schemas/subscription-plan.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { Table, TableSchema } from '../tables/schemas/table.schema';
import { TablesModule } from '../tables/tables.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { WebsocketsModule } from '../websockets/websockets.module';
import { WorkPeriodsModule } from '../work-periods/work-periods.module';
import { PDFGeneratorService } from './pdf-generator.service';
import { POSController } from './pos.controller';
import { POSService } from './pos.service';
import { PrinterManagementController } from './printer-management.controller';
import { PrinterService } from './printer.service';
import { ReceiptService } from './receipt.service';
import { POSOrder, POSOrderSchema } from './schemas/pos-order.schema';
import { POSPayment, POSPaymentSchema } from './schemas/pos-payment.schema';
import { POSSettings, POSSettingsSchema } from './schemas/pos-settings.schema';
import { PrinterConfig, PrinterConfigSchema } from './schemas/printer-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: POSOrder.name, schema: POSOrderSchema },
      { name: POSPayment.name, schema: POSPaymentSchema },
      { name: POSSettings.name, schema: POSSettingsSchema },
      { name: PrinterConfig.name, schema: PrinterConfigSchema },
      { name: User.name, schema: UserSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: SystemSettings.name, schema: SystemSettingsSchema },
      { name: Table.name, schema: TableSchema },
    ]),
    MenuItemsModule,
    IngredientsModule,
    WebsocketsModule,
    CompaniesModule,
    BranchesModule,
    UsersModule,
    SettingsModule,
    RolePermissionsModule,
    forwardRef(() => TablesModule),
    forwardRef(() => KitchenModule),
    forwardRef(() => CustomersModule),
    forwardRef(() => WorkPeriodsModule),
    forwardRef(() => BookingsModule),
    DeliveryZonesModule,
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
  ],
  controllers: [POSController, PrinterManagementController],
  providers: [POSService, ReceiptService, PDFGeneratorService, PrinterService, EmailService, SmsService],
  exports: [POSService, ReceiptService, PDFGeneratorService, PrinterService],
})
export class POSModule {}

