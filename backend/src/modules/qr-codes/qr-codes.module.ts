import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QRCodesController } from './qr-codes.controller';
import { QRCodesService } from './qr-codes.service';
import { QRCode, QRCodeSchema } from './schemas/qr-code.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: QRCode.name, schema: QRCodeSchema }]),
  ],
  controllers: [QRCodesController],
  providers: [QRCodesService],
  exports: [QRCodesService],
})
export class QRCodesModule {}

