import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PurchaseReturnsController } from './purchase-returns.controller';
import { PurchaseReturnsService } from './purchase-returns.service';
import { PurchaseReturn, PurchaseReturnSchema } from './schemas/purchase-return.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PurchaseReturn.name, schema: PurchaseReturnSchema }]),
    forwardRef(() => SubscriptionsModule),
  ],
  controllers: [PurchaseReturnsController],
  providers: [PurchaseReturnsService],
  exports: [PurchaseReturnsService],
})
export class PurchaseReturnsModule {}
