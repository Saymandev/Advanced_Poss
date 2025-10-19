import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkPeriod, WorkPeriodSchema } from './schemas/work-period.schema';
import { WorkPeriodsController } from './work-periods.controller';
import { WorkPeriodsService } from './work-periods.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: WorkPeriod.name, schema: WorkPeriodSchema }]),
  ],
  controllers: [WorkPeriodsController],
  providers: [WorkPeriodsService],
  exports: [WorkPeriodsService],
})
export class WorkPeriodsModule {}
