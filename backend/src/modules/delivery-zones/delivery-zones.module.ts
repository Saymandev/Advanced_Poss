import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryZonesController } from './delivery-zones.controller';
import { DeliveryZonesService } from './delivery-zones.service';
import { DeliveryZone, DeliveryZoneSchema } from './schemas/delivery-zone.schema';
import { WorkPeriodsModule } from '../work-periods/work-periods.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: DeliveryZone.name, schema: DeliveryZoneSchema }]),
    forwardRef(() => WorkPeriodsModule),
  ],
  controllers: [DeliveryZonesController],
  providers: [DeliveryZonesService],
  exports: [DeliveryZonesService],
})
export class DeliveryZonesModule {}

