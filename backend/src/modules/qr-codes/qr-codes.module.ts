import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BranchesModule } from '../branches/branches.module';
import { CompaniesModule } from '../companies/companies.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { QRCodesController } from './qr-codes.controller';
import { QRCodesService } from './qr-codes.service';
import { QRCode, QRCodeSchema } from './schemas/qr-code.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: QRCode.name, schema: QRCodeSchema }]),
    BranchesModule,
    CompaniesModule,
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
  ],
  controllers: [QRCodesController],
  providers: [QRCodesService],
  exports: [QRCodesService],
})
export class QRCodesModule {}

