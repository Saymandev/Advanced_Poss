import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemsModule } from '../menu-items/menu-items.module';
import { IngredientsModule } from '../ingredients/ingredients.module';
import { TablesModule } from '../tables/tables.module';
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
    ]),
    MenuItemsModule,
    IngredientsModule,
    forwardRef(() => TablesModule),
  ],
  controllers: [POSController, PrinterManagementController],
  providers: [POSService, ReceiptService, PDFGeneratorService, PrinterService],
  exports: [POSService, ReceiptService, PDFGeneratorService, PrinterService],
})
export class POSModule {}

