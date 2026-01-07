import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { AttendanceService } from './attendance.service';

@Injectable()
export class AttendanceSchedulerService {
  private readonly logger = new Logger(AttendanceSchedulerService.name);

  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    private attendanceService: AttendanceService,
  ) {}

  /**
   * Auto-checkout forgotten check-ins at end of day (11:59 PM)
   * This runs daily to check out any employees who forgot to check out
   */
  @Cron(CronExpression.EVERY_DAY_AT_11PM)
  async autoCheckoutForgottenCheckIns() {
    try {
      this.logger.log('Starting auto-checkout for forgotten check-ins...');

      // Find all open attendance records (no checkOut)
      const openAttendances = await this.attendanceModel
        .find({
          $or: [
            { checkOut: { $exists: false } },
            { checkOut: null },
          ],
        })
        .populate('userId', 'firstName lastName email')
        .populate('branchId', 'name code')
        .exec();

      if (openAttendances.length === 0) {
        this.logger.log('No forgotten check-ins found');
        return;
      }

      this.logger.log(`Found ${openAttendances.length} forgotten check-in(s) to auto-checkout`);

      let successCount = 0;
      let errorCount = 0;

      for (const attendance of openAttendances) {
        try {
          const userId = attendance.userId instanceof Types.ObjectId 
            ? attendance.userId.toString() 
            : (attendance.userId as any)?._id?.toString() || attendance.userId;

          if (!userId) {
            this.logger.warn(`Skipping attendance ${attendance._id}: invalid userId`);
            errorCount++;
            continue;
          }

          // Calculate hours since check-in
          const checkInTime = new Date(attendance.checkIn).getTime();
          const now = Date.now();
          const hoursSinceCheckIn = (now - checkInTime) / (1000 * 60 * 60);

          // Auto-checkout with a note
          await this.attendanceService.checkOut({
            userId,
            notes: `Auto-checked out at end of day (was checked in for ${Math.floor(hoursSinceCheckIn)} hours)`,
          });

          const userName = (attendance.userId as any)?.firstName 
            ? `${(attendance.userId as any).firstName} ${(attendance.userId as any).lastName || ''}`.trim()
            : (attendance.userId as any)?.email || 'Unknown';

          this.logger.log(
            `Auto-checked out: ${userName} (${hoursSinceCheckIn.toFixed(1)} hours)`,
          );
          successCount++;
        } catch (error: any) {
          this.logger.error(
            `Failed to auto-checkout attendance ${attendance._id}:`,
            error.message || error,
          );
          errorCount++;
        }
      }

      this.logger.log(
        `Auto-checkout completed: ${successCount} successful, ${errorCount} failed`,
      );
    } catch (error: any) {
      this.logger.error('Error in auto-checkout scheduler:', error);
    }
  }

  /**
   * Check for long-running check-ins every hour and log warnings
   * (for monitoring purposes, doesn't auto-checkout)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async monitorLongRunningCheckIns() {
    try {
      const openAttendances = await this.attendanceModel
        .find({
          $or: [
            { checkOut: { $exists: false } },
            { checkOut: null },
          ],
        })
        .populate('userId', 'firstName lastName email')
        .populate('branchId', 'name code')
        .exec();

      for (const attendance of openAttendances) {
        const checkInTime = new Date(attendance.checkIn).getTime();
        const now = Date.now();
        const hoursSinceCheckIn = (now - checkInTime) / (1000 * 60 * 60);

        // Log warning if check-in is longer than 12 hours (likely forgotten)
        if (hoursSinceCheckIn > 12) {
          const userName = (attendance.userId as any)?.firstName 
            ? `${(attendance.userId as any).firstName} ${(attendance.userId as any).lastName || ''}`.trim()
            : (attendance.userId as any)?.email || 'Unknown';
          
          this.logger.warn(
            `Long-running check-in detected: ${userName} has been checked in for ${hoursSinceCheckIn.toFixed(1)} hours`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error('Error in long-running check-in monitor:', error);
    }
  }
}

