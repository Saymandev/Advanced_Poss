import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailService } from '../../common/services/email.service';
import { SmsService } from '../../common/services/sms.service';
import { CustomersModule } from '../customers/customers.module';
import { POSModule } from '../pos/pos.module';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { DigitalReceiptsController } from './digital-receipts.controller';
import { DigitalReceiptsService } from './digital-receipts.service';
import { DigitalReceipt, DigitalReceiptSchema } from './schemas/digital-receipt.schema';
import { SystemSettings, SystemSettingsSchema } from '../settings/schemas/system-settings.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DigitalReceipt.name, schema: DigitalReceiptSchema },
      { name: POSOrder.name, schema: POSOrderSchema },
      { name: SystemSettings.name, schema: SystemSettingsSchema },
    ]),
    forwardRef(() => POSModule),
    CustomersModule,
    forwardRef(() => SubscriptionPlansModule),
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [DigitalReceiptsController],
  providers: [DigitalReceiptsService, EmailService, SmsService],
  exports: [DigitalReceiptsService],
})
export class DigitalReceiptsModule { }

