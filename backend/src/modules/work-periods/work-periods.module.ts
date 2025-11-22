import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { POSModule } from '../pos/pos.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { WorkPeriod, WorkPeriodSchema } from './schemas/work-period.schema';
import { WorkPeriodsController } from './work-periods.controller';
import { WorkPeriodsService } from './work-periods.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkPeriod.name, schema: WorkPeriodSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
    POSModule,
  ],
  controllers: [WorkPeriodsController],
  providers: [WorkPeriodsService],
  exports: [WorkPeriodsService],
})
export class WorkPeriodsModule {}
