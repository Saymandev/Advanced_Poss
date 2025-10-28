import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { ScheduleFiltersDto } from './dto/schedule-filters.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { ScheduleShift, ScheduleShiftDocument } from './schemas/schedule-shift.schema';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(ScheduleShift.name) private scheduleShiftModel: Model<ScheduleShiftDocument>,
  ) {}

  // Create a new shift
  async createShift(createScheduleDto: CreateScheduleDto, createdBy: string): Promise<ScheduleShift> {
    // Check for overlapping shifts
    const overlappingShift = await this.scheduleShiftModel.findOne({
      userId: new Types.ObjectId(createScheduleDto.userId),
      date: new Date(createScheduleDto.date),
      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
      $or: [
        {
          'time.start': { $lt: createScheduleDto.time.end },
          'time.end': { $gt: createScheduleDto.time.start },
        },
      ],
    }).exec();

    if (overlappingShift) {
      throw new ConflictException('User already has a shift scheduled during this time');
    }

    const shiftData = {
      ...createScheduleDto,
      userId: new Types.ObjectId(createScheduleDto.userId),
      branchId: new Types.ObjectId(createScheduleDto.branchId),
      date: new Date(createScheduleDto.date),
      createdBy: new Types.ObjectId(createdBy),
    };

    const shift = new this.scheduleShiftModel(shiftData);
    return shift.save();
  }

  // Get shifts with filters
  async getShifts(filters: ScheduleFiltersDto): Promise<{ shifts: ScheduleShift[]; total: number }> {
    const query: any = {};

    if (filters.branchId) {
      query.branchId = new Types.ObjectId(filters.branchId);
    }

    if (filters.userId) {
      query.userId = new Types.ObjectId(filters.userId);
    }

    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate + 'T23:59:59.999Z');
      }
    }

    if (filters.shiftType) {
      query.shiftType = filters.shiftType;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.position) {
      query.position = { $regex: filters.position, $options: 'i' };
    }

    if (filters.search) {
      query.$or = [
        { position: { $regex: filters.search, $options: 'i' } },
        { notes: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [shifts, total] = await Promise.all([
      this.scheduleShiftModel
        .find(query)
        .populate('userId', 'name email phone')
        .populate('branchId', 'name address')
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .populate('cancelledBy', 'name email')
        .sort({ date: 1, 'time.start': 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.scheduleShiftModel.countDocuments(query).exec(),
    ]);

    return { shifts, total };
  }

  // Get shift by ID
  async getShiftById(id: string): Promise<ScheduleShift> {
    const shift = await this.scheduleShiftModel
      .findById(id)
      .populate('userId', 'name email phone')
      .populate('branchId', 'name address')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('cancelledBy', 'name email')
      .exec();

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  // Update shift
  async updateShift(id: string, updateScheduleDto: UpdateScheduleDto, updatedBy: string): Promise<ScheduleShift> {
    const shift = await this.scheduleShiftModel.findById(id).exec();
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Check for overlapping shifts if time is being updated
    if (updateScheduleDto.time) {
      const overlappingShift = await this.scheduleShiftModel.findOne({
        _id: { $ne: id },
        userId: shift.userId,
        date: shift.date,
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
        $or: [
          {
            'time.start': { $lt: updateScheduleDto.time.end },
            'time.end': { $gt: updateScheduleDto.time.start },
          },
        ],
      }).exec();

      if (overlappingShift) {
        throw new ConflictException('User already has a shift scheduled during this time');
      }
    }

    const updateData: any = {
      ...updateScheduleDto,
      updatedBy: new Types.ObjectId(updatedBy),
    };

    // Handle status changes
    if (updateScheduleDto.status === 'confirmed') {
      updateData.confirmedAt = new Date();
    } else if (updateScheduleDto.status === 'in_progress') {
      updateData.startedAt = new Date();
    } else if (updateScheduleDto.status === 'completed') {
      updateData.completedAt = new Date();
      // Calculate hours worked
      if (shift.startedAt) {
        const startTime = new Date(shift.startedAt);
        const endTime = new Date();
        const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        updateData.hoursWorked = Math.round(hoursWorked * 100) / 100;
      }
    } else if (updateScheduleDto.status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = new Types.ObjectId(updatedBy);
    }

    return this.scheduleShiftModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  // Delete shift
  async deleteShift(id: string): Promise<void> {
    const shift = await this.scheduleShiftModel.findById(id).exec();
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status === 'in_progress') {
      throw new ConflictException('Cannot delete a shift that is currently in progress');
    }

    await this.scheduleShiftModel.findByIdAndDelete(id).exec();
  }

  // Update shift status
  async updateShiftStatus(id: string, status: string, updatedBy: string, reason?: string): Promise<ScheduleShift> {
    const shift = await this.scheduleShiftModel.findById(id).exec();
    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    const updateData: any = {
      status,
      updatedBy: new Types.ObjectId(updatedBy),
    };

    // Handle status-specific updates
    if (status === 'confirmed') {
      updateData.confirmedAt = new Date();
    } else if (status === 'in_progress') {
      updateData.startedAt = new Date();
    } else if (status === 'completed') {
      updateData.completedAt = new Date();
      // Calculate hours worked
      if (shift.startedAt) {
        const startTime = new Date(shift.startedAt);
        const endTime = new Date();
        const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        updateData.hoursWorked = Math.round(hoursWorked * 100) / 100;
      }
    } else if (status === 'cancelled') {
      updateData.cancelledAt = new Date();
      updateData.cancelledBy = new Types.ObjectId(updatedBy);
      if (reason) {
        updateData.cancellationReason = reason;
      }
    }

    return this.scheduleShiftModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  // Get shifts by date range
  async getShiftsByDateRange(branchId: string, startDate: string, endDate: string): Promise<ScheduleShift[]> {
    return this.scheduleShiftModel
      .find({
        branchId: new Types.ObjectId(branchId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate + 'T23:59:59.999Z'),
        },
      })
      .populate('userId', 'name email phone')
      .populate('branchId', 'name address')
      .sort({ date: 1, 'time.start': 1 })
      .exec();
  }

  // Get schedule statistics
  async getScheduleStats(filters: ScheduleFiltersDto): Promise<any> {
    const matchQuery: any = {};

    if (filters.branchId) {
      matchQuery.branchId = new Types.ObjectId(filters.branchId);
    }

    if (filters.startDate || filters.endDate) {
      matchQuery.date = {};
      if (filters.startDate) {
        matchQuery.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        matchQuery.date.$lte = new Date(filters.endDate + 'T23:59:59.999Z');
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayMatchQuery = {
      ...matchQuery,
      date: {
        $gte: today,
        $lt: tomorrow,
      },
    };

    const [
      totalShifts,
      shiftsToday,
      shiftsByStatus,
      shiftsByType,
      averageHoursWorked,
    ] = await Promise.all([
      this.scheduleShiftModel.countDocuments(matchQuery).exec(),
      this.scheduleShiftModel.countDocuments(todayMatchQuery).exec(),
      this.scheduleShiftModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).exec(),
      this.scheduleShiftModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$shiftType', count: { $sum: 1 } } },
      ]).exec(),
      this.scheduleShiftModel.aggregate([
        { $match: { ...matchQuery, hoursWorked: { $exists: true, $gt: 0 } } },
        { $group: { _id: null, average: { $avg: '$hoursWorked' } } },
      ]).exec(),
    ]);

    return {
      totalShifts,
      shiftsToday,
      shiftsByStatus: shiftsByStatus.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      shiftsByType: shiftsByType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      averageHoursWorked: averageHoursWorked[0]?.average || 0,
    };
  }

  // Get upcoming shifts for a user
  async getUpcomingShifts(userId: string, limit: number = 10): Promise<ScheduleShift[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.scheduleShiftModel
      .find({
        userId: new Types.ObjectId(userId),
        date: { $gte: today },
        status: { $in: ['scheduled', 'confirmed'] },
      })
      .populate('branchId', 'name address')
      .sort({ date: 1, 'time.start': 1 })
      .limit(limit)
      .exec();
  }

  // Get shifts for a specific user and date range
  async getUserShifts(userId: string, startDate: string, endDate: string): Promise<ScheduleShift[]> {
    return this.scheduleShiftModel
      .find({
        userId: new Types.ObjectId(userId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate + 'T23:59:59.999Z'),
        },
      })
      .populate('branchId', 'name address')
      .sort({ date: 1, 'time.start': 1 })
      .exec();
  }
}
