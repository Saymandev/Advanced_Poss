import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AttendanceFilterDto } from '../../common/dto/pagination.dto';
import { BranchesService } from '../branches/branches.service';
import { SettingsService } from '../settings/settings.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    private branchesService: BranchesService,
    private settingsService: SettingsService,
  ) {}

  // SHARED HELPER: Find open attendance record for a user
  // This ensures checkIn, checkOut, and getTodayAttendance use EXACTLY the same query
  private async findOpenAttendance(userId: string): Promise<AttendanceDocument | null> {
    // In most cases userId will be a string representation of an ObjectId and the
    // schema field is an ObjectId. However, to be extra defensive (and to help in
    // cases where historical data might have been stored as a plain string), we
    // search using BOTH the casted ObjectId and the raw string.
    const isValidObjectId = Types.ObjectId.isValid(userId);
    const userConditions: any[] = [];

    if (isValidObjectId) {
      userConditions.push({ userId: new Types.ObjectId(userId) });
    }

    // Also try matching the raw string value in case some documents were stored that way
    userConditions.push({ userId });

    const query: any = {
      $and: [
        { $or: userConditions },
        {
          $or: [
            { checkOut: { $exists: false } },
            { checkOut: null },
          ],
        },
      ],
    };

    const result = await this.attendanceModel
      .findOne(query)
      .sort({ checkIn: -1 })
      .exec();
    
    // DEBUG: Log what we're finding
    if (result) {
      console.log('🔍 Found open attendance:', {
        id: result._id,
        userId: result.userId,
        branchId: result.branchId,
        date: result.date,
        checkIn: result.checkIn,
        checkOut: result.checkOut,
        status: result.status,
      });
    } else {
      // Also check what records exist for this user
      const userFilter: any = isValidObjectId
        ? {
            $or: [
              { userId: new Types.ObjectId(userId) },
              { userId },
            ],
          }
        : { userId };

      const allRecords = await this.attendanceModel
        .find(userFilter)
        .limit(5)
        .sort({ checkIn: -1 })
        .exec();

      console.log(
        '🔍 No open attendance found. Recent records for user:',
        allRecords.map((r) => ({
          id: r._id,
          userId: r.userId,
          date: r.date,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          hasCheckOut: !!r.checkOut,
        })),
      );
    }
    
    return result;
  }

  // Helper to get company timezone from branch
  private async getCompanyTimezone(branchId: string): Promise<string> {
    try {
      const branch = await this.branchesService.findOne(branchId);
      if (!branch?.companyId) {
        return 'Asia/Dhaka'; // Default to Bangladesh timezone
      }

      const companyId = typeof branch.companyId === 'object' && branch.companyId !== null
        ? (branch.companyId as any)._id?.toString() || (branch.companyId as any).id?.toString()
        : branch.companyId.toString();

      if (!companyId) {
        return 'Asia/Dhaka';
      }

      const companySettings = await this.settingsService.getCompanySettings(companyId);
      return companySettings?.timezone || 'Asia/Dhaka';
    } catch (error) {
      console.warn('Could not get company timezone, using default:', error);
      return 'Asia/Dhaka';
    }
  }

  // Helper to get the local date (YYYY-MM-DD) from a UTC timestamp in a given timezone
  private getLocalDateString(timestamp: Date, timezone: string): string {
    // Convert timezone to offset hours (UTC offset - positive means ahead of UTC)
    const timezoneOffsets: { [key: string]: number } = {
      'Asia/Dhaka': 6,        // UTC+6
      'Asia/Kolkata': 5.5,    // UTC+5:30
      'Asia/Karachi': 5,      // UTC+5
      'Asia/Tokyo': 9,        // UTC+9
      'America/New_York': -5, // UTC-5 (EST)
      'America/Chicago': -6,  // UTC-6 (CST)
      'Europe/London': 0,     // UTC+0
      'Europe/Paris': 1,      // UTC+1
    };

    const offsetHours = timezoneOffsets[timezone] || 6; // Default to UTC+6 (Bangladesh)
    // Add offset to UTC time to get local time
    const localTimestamp = timestamp.getTime() + (offsetHours * 60 * 60 * 1000);
    const localDate = new Date(localTimestamp);
    
    // Get YYYY-MM-DD from the local time
    const year = localDate.getUTCFullYear();
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localDate.getUTCDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  // Helper to get start and end of local date in UTC timestamps
  private getLocalDateRange(dateString: string, timezone: string): { start: Date; end: Date } {
    // Parse YYYY-MM-DD
    const [year, month, day] = dateString.split('-').map(Number);
    
    // Timezone offsets (UTC offset - positive means ahead of UTC)
    const timezoneOffsets: { [key: string]: number } = {
      'Asia/Dhaka': 6,        // UTC+6
      'Asia/Kolkata': 5.5,    // UTC+5:30
      'Asia/Karachi': 5,      // UTC+5
      'Asia/Tokyo': 9,        // UTC+9
      'America/New_York': -5, // UTC-5
      'America/Chicago': -6,  // UTC-6
      'Europe/London': 0,     // UTC+0
      'Europe/Paris': 1,      // UTC+1
    };

    const offsetHours = timezoneOffsets[timezone] || 6;
    
    // Create UTC dates representing start and end of the local day
    // If timezone is UTC+6, midnight local = 6 PM previous day UTC
    const startLocal = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const startUTC = new Date(startLocal.getTime() - (offsetHours * 60 * 60 * 1000));
    
    const endLocal = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    const endUTC = new Date(endLocal.getTime() - (offsetHours * 60 * 60 * 1000));

    return { start: startUTC, end: endUTC };
  }

  async checkIn(checkInDto: CheckInDto): Promise<Attendance> {
    if (!checkInDto.userId) {
      throw new BadRequestException('User ID is required');
    }

    const checkInTime = new Date();
    
    // Get company timezone to calculate the correct local date
    const timezone = await this.getCompanyTimezone(checkInDto.branchId);
    const localDateString = this.getLocalDateString(checkInTime, timezone);
    
    // Get the date range for today in local timezone (as UTC timestamps)
    const { start: todayStart } = this.getLocalDateRange(localDateString, timezone);

    // Check if there's any OPEN attendance record using shared helper
    // This ensures checkIn and checkOut find the SAME record
    console.log('🔵 CHECK-IN: Checking for open attendance for user:', checkInDto.userId);
    const openAttendance = await this.findOpenAttendance(checkInDto.userId);

    if (openAttendance) {
      console.log('❌ CHECK-IN BLOCKED: Found open attendance record:', {
        id: openAttendance._id,
        date: openAttendance.date,
        checkIn: openAttendance.checkIn,
        branchId: openAttendance.branchId,
      });
      throw new BadRequestException('You have already checked in. Please check out first.');
    }
    console.log('✅ CHECK-IN ALLOWED: No open attendance found');

    const expectedStartTime = new Date(checkInTime);
    expectedStartTime.setHours(9, 0, 0, 0); // Assuming 9 AM start time

    const isLate = checkInTime > expectedStartTime;
    const lateBy = isLate
      ? Math.floor((checkInTime.getTime() - expectedStartTime.getTime()) / 60000)
      : 0;

    // Store date as the start of the local day in UTC
    const attendance = new this.attendanceModel({
      userId: checkInDto.userId,
      branchId: checkInDto.branchId,
      date: todayStart, // Store as start of local day in UTC
      checkIn: checkInTime,
      status: isLate ? 'late' : 'present',
      isLate,
      lateBy,
      notes: checkInDto.notes,
      checkInLocation: checkInDto.location,
    });

    try {
      const savedAttendance = await attendance.save();
      
      // Populate user and branch data before returning
      return this.attendanceModel
        .findById(savedAttendance._id)
        .populate('userId', 'firstName lastName employeeId role email')
        .populate('branchId', 'name code')
        .exec()
        .then((populated: any) => {
          if (!populated) return savedAttendance;
          const user = populated.userId;
          const branch = populated.branchId;
          return {
            ...populated.toObject(),
            userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown',
            branchName: branch ? branch.name || branch.code || 'Unknown' : 'Unknown',
            totalHours: populated.workHours || 0,
          };
        });
    } catch (error: any) {
      // Handle MongoDB duplicate key error (E11000)
      if (error?.code === 11000 && error?.keyPattern) {
        // Check if it's a duplicate userId + date constraint
        if (error.keyPattern.userId && error.keyPattern.date) {
          throw new BadRequestException('You have already checked in today');
        }
      }
      throw error;
    }
  }

  async checkOut(checkOutDto: CheckOutDto): Promise<Attendance> {
    if (!checkOutDto.userId) {
      throw new BadRequestException('User ID is required');
    }

    // Find the open attendance record using the SHARED helper
    // This ensures we find the same record that checkIn would block on
    const attendance = await this.findOpenAttendance(checkOutDto.userId);

    if (!attendance) {
      throw new NotFoundException('Check-in record not found. Please check in first.');
    }

    if (attendance.checkOut) {
      throw new BadRequestException('Already checked out');
    }

    attendance.checkOut = new Date();
    attendance.checkOutLocation = checkOutDto.location;
    attendance.breakTime = checkOutDto.breakTime || 0;
    // Append notes if check-in had notes, otherwise set new notes
    if (checkOutDto.notes) {
      attendance.notes = attendance.notes 
        ? `${attendance.notes}\nCheck-out: ${checkOutDto.notes}`
        : `Check-out: ${checkOutDto.notes}`;
    }

    const savedAttendance = await attendance.save();
    
    // Populate user and branch data before returning
    return this.attendanceModel
      .findById(savedAttendance._id)
      .populate('userId', 'firstName lastName employeeId role email')
      .populate('branchId', 'name code')
      .exec()
      .then((populated: any) => {
        if (!populated) return savedAttendance;
        const user = populated.userId;
        const branch = populated.branchId;
        return {
          ...populated.toObject(),
          userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown' : 'Unknown',
          branchName: branch ? branch.name || branch.code || 'Unknown' : 'Unknown',
          totalHours: populated.workHours || 0,
        };
      });
  }

  async findAll(filterDto: AttendanceFilterDto): Promise<{ attendance: Attendance[], total: number, page: number, limit: number }> {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'date', 
      sortOrder = 'desc',
      search,
      ...filters 
    } = filterDto;
    
    const skip = (page - 1) * limit;
    const andConditions: any[] = [];

    // Add status filtering
    if (filters.status) {
      andConditions.push({ status: filters.status });
    }

    // Add branchId filtering (with flexible ObjectId/string matching)
    if (filters.branchId) {
      const branchConditions: any[] = [{ branchId: filters.branchId }];
      if (Types.ObjectId.isValid(filters.branchId)) {
        branchConditions.push({ branchId: new Types.ObjectId(filters.branchId) });
      }
      andConditions.push({ $or: branchConditions });
    }

    // Add userId filtering (with flexible ObjectId/string matching)
    if (filters.userId) {
      const userConditions: any[] = [{ userId: filters.userId }];
      if (Types.ObjectId.isValid(filters.userId)) {
        userConditions.push({ userId: new Types.ObjectId(filters.userId) });
      }
      andConditions.push({ $or: userConditions });
    }

    // Add date range filtering (use checkIn for more reliable date matching)
    if (filters.startDate || filters.endDate) {
      const dateCondition: any = {};
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        dateCondition.$gte = startDate;
      }
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        dateCondition.$lte = endDate;
      }
      andConditions.push({ checkIn: dateCondition });
    }

    // Add search functionality (search across populated user fields and notes)
    if (search) {
      const searchConditions = [
        { 'userId.firstName': { $regex: search, $options: 'i' } },
        { 'userId.lastName': { $regex: search, $options: 'i' } },
        { 'userId.employeeId': { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
      andConditions.push({ $or: searchConditions });
    }

    // Build final query
    const query: any = andConditions.length > 0 ? { $and: andConditions } : {};

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const attendance = await this.attendanceModel
      .find(query)
      .populate('userId', 'firstName lastName employeeId')
      .populate('branchId', 'name code')
      .populate('approvedBy', 'firstName lastName')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.attendanceModel.countDocuments(query);

    return {
      attendance,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Attendance> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid attendance ID');
    }

    const attendance = await this.attendanceModel
      .findById(id)
      .populate('userId', 'firstName lastName employeeId')
      .populate('branchId', 'name code')
      .populate('approvedBy', 'firstName lastName');

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return attendance;
  }

  async findByUser(
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Attendance[]> {
    const filter: any = {
      userId: new Types.ObjectId(userId),
    };

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    return this.attendanceModel
      .find(filter)
      .populate('branchId', 'name code')
      .sort({ date: -1 })
      .exec();
  }

  async findByBranch(
    branchId: string,
    date?: Date,
  ): Promise<Attendance[]> {
    const filter: any = {
      branchId: new Types.ObjectId(branchId),
    };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    return this.attendanceModel
      .find(filter)
      .populate('userId', 'firstName lastName employeeId role')
      .sort({ checkIn: 1 })
      .exec();
  }

  async getTodayAttendance(branchId: string, userId?: string): Promise<Attendance[]> {
    // Get company timezone to calculate the correct local date
    const timezone = await this.getCompanyTimezone(branchId);
    const now = new Date();
    const localDateString = this.getLocalDateString(now, timezone);

    // Get the date range for today in local timezone (as UTC timestamps)
    const { start: todayStart, end: todayEnd } = this.getLocalDateRange(
      localDateString,
      timezone,
    );

    // Build flexible branch/user filters that work whether IDs are stored as
    // ObjectId or plain string (historical data may be inconsistent).
    const branchConditions: any[] = [{ branchId }];
    if (Types.ObjectId.isValid(branchId)) {
      branchConditions.push({ branchId: new Types.ObjectId(branchId) });
    }

    const andConditions: any[] = [
      { $or: branchConditions },
      {
        // Today's records based on checkIn time
        checkIn: { $gte: todayStart, $lte: todayEnd },
      },
    ];

    // If userId is provided, only return that user's attendance (for employees)
    const isValidUserId = userId && Types.ObjectId.isValid(userId);
    let userFilter: any = {};
    if (userId) {
      const userConditions: any[] = [{ userId }];
      if (isValidUserId) {
        userConditions.push({ userId: new Types.ObjectId(userId) });
      }
      userFilter = { $or: userConditions };
      andConditions.push(userFilter);
    }

    const query: any = { $and: andConditions };

    // Debug logging
    console.log('📅 getTodayAttendance query:', {
      branchId,
      userId,
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
      now: new Date().toISOString()
    });

    let attendances = await this.attendanceModel
      .find(query)
      .populate('userId', 'firstName lastName employeeId role email')
      .populate('branchId', 'name code')
      .sort({ checkIn: -1 })
      .exec();

    console.log('📅 getTodayAttendance found:', attendances.length, 'records');

    // Fallback: if nothing matched the date-range query but we have a userId, return
    // the MOST RECENT attendance record for this user in this branch using the same
    // flexible ID matching rules.
    if (attendances.length === 0 && userId) {
      console.log(
        '📅 getTodayAttendance fallback: no records in range, fetching most recent record for user/branch',
      );

      const fallbackBranchFilter =
        branchConditions.length > 1 ? { $or: branchConditions } : branchConditions[0];

      const fallbackUserConditions: any[] = [{ userId }];
      if (isValidUserId) {
        fallbackUserConditions.push({ userId: new Types.ObjectId(userId) });
      }

      attendances = await this.attendanceModel
        .find({
          ...fallbackBranchFilter,
          $or: fallbackUserConditions,
        })
        .populate('userId', 'firstName lastName employeeId role email')
        .populate('branchId', 'name code')
        .sort({ checkIn: -1 })
        .limit(1)
        .exec();
      console.log(
        '📅 getTodayAttendance fallback found:',
        attendances.length,
        'records',
      );
    }

    // Transform to include userName and branchName
    return attendances.map((attendance: any) => {
      const user = attendance.userId;
      const branch = attendance.branchId;
      return {
        ...attendance.toObject(),
        userName: user
          ? `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
            user.email ||
            'Unknown'
          : 'Unknown',
        branchName: branch ? branch.name || branch.code || 'Unknown' : 'Unknown',
        totalHours: attendance.workHours || 0,
      };
    });
  }

  async markAbsent(
    userId: string,
    branchId: string,
    date: Date,
  ): Promise<Attendance> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const attendance = new this.attendanceModel({
      userId: new Types.ObjectId(userId),
      branchId: new Types.ObjectId(branchId),
      date: startOfDay,
      status: 'absent',
      checkIn: startOfDay,
    });

    return attendance.save();
  }

  async update(
    id: string,
    updateData: Partial<Attendance>,
  ): Promise<Attendance> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid attendance ID');
    }

    const attendance = await this.attendanceModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return attendance;
  }

  async approve(id: string, approverId: string): Promise<Attendance> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid attendance ID');
    }

    const attendance = await this.attendanceModel.findByIdAndUpdate(
      id,
      {
        approvedBy: new Types.ObjectId(approverId),
        approvedAt: new Date(),
      },
      { new: true },
    );

    if (!attendance) {
      throw new NotFoundException('Attendance record not found');
    }

    return attendance;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid attendance ID');
    }

    const result = await this.attendanceModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Attendance record not found');
    }
  }

  async getStats(
    branchId: string,
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<any> {
    // Flexible branch filter to handle both ObjectId and string stored values
    const branchConditions: any[] = [{ branchId }];
    if (Types.ObjectId.isValid(branchId)) {
      branchConditions.push({ branchId: new Types.ObjectId(branchId) });
    }

    const andConditions: any[] = [
      { $or: branchConditions },
      {
        // Use checkIn for stats range to avoid any inconsistencies with the `date` field
        checkIn: { $gte: startDate, $lte: endDate },
      },
    ];

    const query: any = { $and: andConditions };

    // If userId is provided, only calculate stats for that user (for employees),
    // using the same flexible matching as getTodayAttendance.
    if (userId) {
      const userConditions: any[] = [{ userId }];
      if (Types.ObjectId.isValid(userId)) {
        userConditions.push({ userId: new Types.ObjectId(userId) });
      }
      query.$and.push({ $or: userConditions });
    }

    // Debug logging
    console.log('📊 getStats query:', {
      branchId,
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      query: JSON.stringify(query, null, 2)
    });

    const attendances = await this.attendanceModel.find(query);

    console.log('📊 getStats found:', attendances.length, 'records');

    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const present = attendances.filter((a) => a.status === 'present' || a.status === 'late').length;
    const absent = attendances.filter((a) => a.status === 'absent').length;
    const late = attendances.filter((a) => a.isLate).length;
    const onLeave = attendances.filter((a) => a.status === 'on-leave').length;

    const totalWorkHours = attendances.reduce(
      (sum, a) => sum + (a.workHours || 0),
      0,
    );
    const totalOvertimeHours = attendances.reduce(
      (sum, a) => sum + (a.overtimeHours || 0),
      0,
    );

    return {
      period: { startDate, endDate, days: totalDays },
      totalRecords: attendances.length,
      present,
      absent,
      late,
      onLeave,
      latePercentage: attendances.length > 0 ? (late / attendances.length) * 100 : 0,
      absentPercentage: attendances.length > 0 ? (absent / attendances.length) * 100 : 0,
      totalWorkHours,
      totalOvertimeHours,
      averageWorkHours: attendances.length > 0 ? totalWorkHours / attendances.length : 0,
    };
  }

  async getUserMonthlyStats(
    userId: string,
    year: number,
    month: number,
  ): Promise<any> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const attendances = await this.attendanceModel.find({
      userId: new Types.ObjectId(userId),
      date: { $gte: startDate, $lte: endDate },
    });

    const daysInMonth = endDate.getDate();
    const present = attendances.filter((a) => a.status === 'present' || a.status === 'late').length;
    const absent = attendances.filter((a) => a.status === 'absent').length;
    const late = attendances.filter((a) => a.isLate).length;
    const onLeave = attendances.filter((a) => a.status === 'on-leave').length;

    const totalWorkHours = attendances.reduce(
      (sum, a) => sum + (a.workHours || 0),
      0,
    );
    const totalOvertimeHours = attendances.reduce(
      (sum, a) => sum + (a.overtimeHours || 0),
      0,
    );

    return {
      month,
      year,
      daysInMonth,
      present,
      absent,
      late,
      onLeave,
      workingDays: present + absent + late,
      totalWorkHours,
      totalOvertimeHours,
      attendanceRate: daysInMonth > 0 ? (present / daysInMonth) * 100 : 0,
    };
  }
}

