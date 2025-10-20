import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AttendanceFilterDto } from '../../common/dto/pagination.dto';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
  ) {}

  async checkIn(checkInDto: CheckInDto): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already checked in today
    const existingAttendance = await this.attendanceModel.findOne({
      userId: new Types.ObjectId(checkInDto.userId),
      date: { $gte: today, $lt: tomorrow },
    });

    if (existingAttendance) {
      throw new BadRequestException('Already checked in today');
    }

    const checkInTime = new Date();
    const expectedStartTime = new Date();
    expectedStartTime.setHours(9, 0, 0, 0); // Assuming 9 AM start time

    const isLate = checkInTime > expectedStartTime;
    const lateBy = isLate
      ? Math.floor((checkInTime.getTime() - expectedStartTime.getTime()) / 60000)
      : 0;

    const attendance = new this.attendanceModel({
      userId: checkInDto.userId,
      branchId: checkInDto.branchId,
      date: today,
      checkIn: checkInTime,
      status: isLate ? 'late' : 'present',
      isLate,
      lateBy,
      checkInLocation: checkInDto.location,
    });

    return attendance.save();
  }

  async checkOut(checkOutDto: CheckOutDto): Promise<Attendance> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await this.attendanceModel.findOne({
      userId: new Types.ObjectId(checkOutDto.userId),
      date: { $gte: today, $lt: tomorrow },
    });

    if (!attendance) {
      throw new NotFoundException('Check-in record not found for today');
    }

    if (attendance.checkOut) {
      throw new BadRequestException('Already checked out today');
    }

    attendance.checkOut = new Date();
    attendance.checkOutLocation = checkOutDto.location;
    attendance.breakTime = checkOutDto.breakTime || 0;
    attendance.notes = checkOutDto.notes;

    return attendance.save();
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
    const query: any = { ...filters };

    // Add date range filtering
    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) query.date.$lte = new Date(filters.endDate);
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { 'user.firstName': { $regex: search, $options: 'i' } },
        { 'user.lastName': { $regex: search, $options: 'i' } },
        { 'user.employeeId': { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

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

  async getTodayAttendance(branchId: string): Promise<Attendance[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.attendanceModel
      .find({
        branchId: new Types.ObjectId(branchId),
        date: { $gte: today, $lt: tomorrow },
      })
      .populate('userId', 'firstName lastName employeeId role')
      .exec();
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
  ): Promise<any> {
    const attendances = await this.attendanceModel.find({
      branchId: new Types.ObjectId(branchId),
      date: { $gte: startDate, $lte: endDate },
    });

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

