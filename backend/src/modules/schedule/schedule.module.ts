import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { ScheduleShift, ScheduleShiftSchema } from './schemas/schedule-shift.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ScheduleShift.name, schema: ScheduleShiftSchema },
    ]),
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
