import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailService } from '../../common/services/email.service';
import { CustomersModule } from '../customers/customers.module';
import { POSModule } from '../pos/pos.module';
import { POSOrder, POSOrderSchema } from '../pos/schemas/pos-order.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../subscriptions/schemas/subscription-plan.schema';
import { DigitalReceiptsController } from './digital-receipts.controller';
import { DigitalReceiptsService } from './digital-receipts.service';
import { DigitalReceipt, DigitalReceiptSchema } from './schemas/digital-receipt.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DigitalReceipt.name, schema: DigitalReceiptSchema },
      { name: POSOrder.name, schema: POSOrderSchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
    ]),
    POSModule,
    CustomersModule,
  ],
  controllers: [DigitalReceiptsController],
  providers: [DigitalReceiptsService, EmailService],
  exports: [DigitalReceiptsService],
})
export class DigitalReceiptsModule {}

