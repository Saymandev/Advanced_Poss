import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RoleFeatureGuard } from '../../common/guards/role-feature.guard';
import { BranchesModule } from '../branches/branches.module';
import { RolePermissionsModule } from '../role-permissions/role-permissions.module';
import { SettingsModule } from '../settings/settings.module';
import { SubscriptionPlansModule } from '../subscriptions/subscription-plans.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceSchedulerService } from './attendance-scheduler.service';
import { AttendanceService } from './attendance.service';
import { Attendance, AttendanceSchema } from './schemas/attendance.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => BranchesModule),
    forwardRef(() => SettingsModule),
    RolePermissionsModule, // Import to use RolePermissionsService in RoleFeatureGuard
    forwardRef(() => SubscriptionPlansModule), // Required for SubscriptionFeatureGuard
    forwardRef(() => SubscriptionsModule), // Required for SubscriptionFeatureGuard
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceSchedulerService, RoleFeatureGuard],
  exports: [AttendanceService],
})
export class AttendanceModule {}

