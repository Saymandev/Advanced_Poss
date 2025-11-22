import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PasswordUtil } from '../../common/utils/password.util';
import { POSService } from '../pos/pos.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { EndWorkPeriodDto } from './dto/end-work-period.dto';
import { StartWorkPeriodDto } from './dto/start-work-period.dto';
import { WorkPeriod, WorkPeriodDocument } from './schemas/work-period.schema';

@Injectable()
export class WorkPeriodsService {
  constructor(
    @InjectModel(WorkPeriod.name) private workPeriodModel: Model<WorkPeriodDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private usersService: UsersService,
    private posService: POSService,
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
    // Verify PIN against user's login PIN
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user with PIN for verification
    const userWithPin = await this.userModel.findById(userId).select('+pin');
    if (!userWithPin?.pin) {
      throw new BadRequestException('PIN not set for this user');
    }

    const isPinValid = await PasswordUtil.compare(startWorkPeriodDto.pin, userWithPin.pin);
    if (!isPinValid) {
      throw new UnauthorizedException('Invalid PIN');
    }

    // Check if there's already an active work period
    const existingActive = await this.workPeriodModel.findOne({
      companyId: new Types.ObjectId(companyId),
      status: 'active',
    });

    if (existingActive) {
      // Return more details about the existing active period
      throw new BadRequestException(
        `There is already an active work period (Serial #${existingActive.serial}) started at ${existingActive.startTime}. Please close it before starting a new one.`
      );
    }

    // Get the next serial number
    const lastWorkPeriod = await this.workPeriodModel
      .findOne({ companyId: new Types.ObjectId(companyId) })
      .sort({ serial: -1 })
      .exec();

    const serial = lastWorkPeriod ? lastWorkPeriod.serial + 1 : 1;

    const workPeriod = new this.workPeriodModel({
      openingBalance: startWorkPeriodDto.openingBalance,
      companyId: new Types.ObjectId(companyId),
      startedBy: new Types.ObjectId(userId),
      serial,
      status: 'active',
      startTime: new Date(),
    });

    return workPeriod.save();
  }

  async endWorkPeriod(workPeriodId: string, userId: string, endWorkPeriodDto: EndWorkPeriodDto) {
    // Verify PIN against user's login PIN
    const userWithPin = await this.userModel.findById(userId).select('+pin');
    if (!userWithPin?.pin) {
      throw new BadRequestException('PIN not set for this user');
    }

    const isPinValid = await PasswordUtil.compare(endWorkPeriodDto.pin, userWithPin.pin);
    if (!isPinValid) {
      throw new UnauthorizedException('Invalid PIN');
    }

    const workPeriod = await this.workPeriodModel.findById(workPeriodId);

    if (!workPeriod) {
      throw new NotFoundException('Work period not found');
    }

    if (workPeriod.status !== 'active') {
      throw new BadRequestException('Work period is not active');
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

  async getSalesSummary(workPeriodId: string, branchId?: string) {
    const workPeriod = await this.workPeriodModel.findById(workPeriodId)
      .populate('startedBy', 'branchId')
      .exec();
    
    if (!workPeriod) {
      throw new NotFoundException('Work period not found');
    }

    // Get branchId from user if not provided, or use the one from startedBy user
    let effectiveBranchId = branchId;
    if (!effectiveBranchId && workPeriod.startedBy && typeof workPeriod.startedBy === 'object' && 'branchId' in workPeriod.startedBy) {
      effectiveBranchId = (workPeriod.startedBy as any).branchId?.toString();
    }

    // Get orders created during this work period
    const startTime = new Date(workPeriod.startTime);
    const endTime = workPeriod.endTime ? new Date(workPeriod.endTime) : new Date();

    // Format dates properly for filtering
    // For startDate, use the exact start time (ISO string) so orders created after work period start are included
    const startDateStr = startTime.toISOString();
    
    // For endDate:
    // - If it's an active period (no endTime), use current time (full ISO string)
    // - If it's completed, use the exact end time (full ISO string)
    // pos.service.ts now handles both date-only strings and full ISO strings
    const endDateStr = workPeriod.endTime 
      ? endTime.toISOString()  // Full ISO string for completed periods
      : new Date().toISOString();  // Current time for active periods

    // Get POS orders created during this period
    // Filter by branchId if available, and by date range
    // Note: If branchId is not available, we'll get orders from all branches (which might be desired)
    const orders = await this.posService.getOrders({
      branchId: effectiveBranchId || undefined, // Only filter by branchId if we have it
      startDate: startDateStr,
      endDate: endDateStr,
      page: 1,
      limit: 10000, // Get all orders
    });

    // Calculate totals and statistics
    let grossSales = 0;
    let subtotal = 0;
    let vatTotal = 0;
    let serviceCharge = 0;
    let totalOrders = orders.orders.length;
    let voidCount = 0;
    let cancelCount = 0;
    
    // Payment methods breakdown
    const paymentMethods: Record<string, { count: number; amount: number }> = {};
    const totalByPaymentMethod: Record<string, number> = {};

    orders.orders.forEach((order: any) => {
      // Count cancelled orders
      if (order.status === 'cancelled') {
        cancelCount++;
      }
      
      // Count void orders (if status is void or similar)
      // Note: Adjust based on your actual void status
      if (order.status === 'void' || order.status === 'voided') {
        voidCount++;
      }

      // Only count paid orders in gross sales
      if (order.status === 'paid') {
        grossSales += order.totalAmount || 0;
        subtotal += order.totalAmount || 0;
      }

      // Payment method breakdown
      const paymentMethod = order.paymentMethod || 'cash';
      if (!paymentMethods[paymentMethod]) {
        paymentMethods[paymentMethod] = { count: 0, amount: 0 };
      }
      paymentMethods[paymentMethod].count += 1;
      if (order.status === 'paid') {
        paymentMethods[paymentMethod].amount += order.totalAmount || 0;
        totalByPaymentMethod[paymentMethod] = (totalByPaymentMethod[paymentMethod] || 0) + (order.totalAmount || 0);
      }
    });

    // Calculate payment method percentages and commissions
    const paymentMethodsArray = Object.entries(paymentMethods).map(([method, data]) => {
      const percentage = grossSales > 0 ? (data.amount / grossSales) * 100 : 0;
      // Commission calculation (example: 2% for cash, 3.5% for card)
      const commissionRate = method === 'cash' ? 0.02 : method === 'card' ? 0.035 : 0;
      const commission = data.amount * commissionRate;
      
      return {
        type: method.charAt(0).toUpperCase() + method.slice(1),
        percentage: percentage.toFixed(2),
        count: data.count,
        amount: data.amount,
        commission: commission.toFixed(2),
      };
    });

    return {
      totalOrders,
      grossSales,
      subtotal,
      vatTotal,
      serviceCharge,
      voidCount,
      cancelCount,
      paymentMethods: paymentMethodsArray,
      orders: orders.orders.map((order: any) => ({
        id: order._id || order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        orderType: order.orderType,
        status: order.status,
        paymentMethod: order.paymentMethod,
      })),
    };
  }

  async getPeriodActivities(workPeriodId: string, branchId?: string) {
    const workPeriod = await this.workPeriodModel.findById(workPeriodId);
    
    if (!workPeriod) {
      throw new NotFoundException('Work period not found');
    }

    const startTime = new Date(workPeriod.startTime);
    const endTime = workPeriod.endTime ? new Date(workPeriod.endTime) : new Date();

    // Format dates properly for filtering (same as getSalesSummary)
    // Use exact start time for accurate filtering
    const startDateStr = startTime.toISOString();
    const endDateStr = workPeriod.endTime 
      ? endTime.toISOString()  // Full ISO string for completed periods
      : new Date().toISOString();  // Current time for active periods

    // Get orders created during this period
    const orders = await this.posService.getOrders({
      branchId: branchId,
      startDate: startDateStr,
      endDate: endDateStr,
      page: 1,
      limit: 10000,
    });

    const activities = [];

    // Add order activities
    orders.orders.forEach((order: any) => {
      activities.push({
        type: 'order_created',
        description: `Created order ${order.orderNumber}`,
        timestamp: order.createdAt,
        details: {
          orderId: order._id || order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          orderType: order.orderType,
        },
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      totalActivities: activities.length,
      activities,
    };
  }
}
