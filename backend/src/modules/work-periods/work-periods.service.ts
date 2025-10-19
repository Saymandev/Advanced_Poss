import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EndWorkPeriodDto } from './dto/end-work-period.dto';
import { StartWorkPeriodDto } from './dto/start-work-period.dto';
import { WorkPeriod, WorkPeriodDocument } from './schemas/work-period.schema';

@Injectable()
export class WorkPeriodsService {
  constructor(
    @InjectModel(WorkPeriod.name) private workPeriodModel: Model<WorkPeriodDocument>,
  ) {}

  async findAll(options: {
    page: number;
    limit: number;
    status?: 'active' | 'completed';
    companyId?: string;
  }) {
    const { page, limit, status, companyId } = options;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (status) filter.status = status;
    if (companyId) filter.companyId = new Types.ObjectId(companyId);

    const [workPeriods, total] = await Promise.all([
      this.workPeriodModel
        .find(filter)
        .populate('startedBy', 'firstName lastName')
        .populate('endedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.workPeriodModel.countDocuments(filter),
    ]);

    return {
      workPeriods,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findActive(companyId: string) {
    const activeWorkPeriod = await this.workPeriodModel
      .findOne({ companyId: new Types.ObjectId(companyId), status: 'active' })
      .populate('startedBy', 'firstName lastName')
      .exec();

    return activeWorkPeriod;
  }

  async startWorkPeriod(
    userId: string,
    companyId: string,
    startWorkPeriodDto: StartWorkPeriodDto,
  ) {
    // Check if there's already an active work period
    const existingActive = await this.workPeriodModel.findOne({
      companyId: new Types.ObjectId(companyId),
      status: 'active',
    });

    if (existingActive) {
      throw new Error('There is already an active work period');
    }

    // Get the next serial number
    const lastWorkPeriod = await this.workPeriodModel
      .findOne({ companyId: new Types.ObjectId(companyId) })
      .sort({ serial: -1 })
      .exec();

    const serial = lastWorkPeriod ? lastWorkPeriod.serial + 1 : 1;

    const workPeriod = new this.workPeriodModel({
      ...startWorkPeriodDto,
      companyId: new Types.ObjectId(companyId),
      startedBy: new Types.ObjectId(userId),
      serial,
      status: 'active',
    });

    return workPeriod.save();
  }

  async endWorkPeriod(workPeriodId: string, userId: string, endWorkPeriodDto: EndWorkPeriodDto) {
    const workPeriod = await this.workPeriodModel.findById(workPeriodId);

    if (!workPeriod) {
      throw new NotFoundException('Work period not found');
    }

    if (workPeriod.status !== 'active') {
      throw new Error('Work period is not active');
    }

    const endTime = new Date();
    const startTime = new Date(workPeriod.startTime);
    const durationMs = endTime.getTime() - startTime.getTime();
    
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    const duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    workPeriod.endTime = endTime;
    workPeriod.endedBy = new Types.ObjectId(userId);
    workPeriod.duration = duration;
    workPeriod.closingBalance = endWorkPeriodDto.actualClosingBalance;
    workPeriod.status = 'completed';

    return workPeriod.save();
  }

  async findOne(id: string) {
    const workPeriod = await this.workPeriodModel
      .findById(id)
      .populate('startedBy', 'firstName lastName')
      .populate('endedBy', 'firstName lastName')
      .exec();

    if (!workPeriod) {
      throw new NotFoundException('Work period not found');
    }

    return workPeriod;
  }

  async getSalesSummary(workPeriodId: string) {
    const workPeriod = await this.workPeriodModel.findById(workPeriodId);
    
    if (!workPeriod) {
      throw new NotFoundException('Work period not found');
    }

    // In a real application, you would query the orders collection
    // to get actual sales data for the work period
    // For now, returning mock data
    return {
      totalOrders: 1,
      grossSales: 695,
      subtotal: 650,
      vatTotal: 0,
      serviceCharge: 45.50,
    };
  }
}
