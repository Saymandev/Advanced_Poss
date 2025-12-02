import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateLoginActivityDto, CreateLoginSessionDto, LoginActivityFilterDto, SessionFilterDto, TerminateSessionDto, UpdateSessionActivityDto } from './dto/login-activity.dto';
import { LoginActivity, LoginActivityDocument, LoginStatus } from './schemas/login-activity.schema';
import { LoginSession, LoginSessionDocument, SessionStatus } from './schemas/login-session.schema';

@Injectable()
export class LoginActivityService {
  constructor(
    @InjectModel(LoginActivity.name) private loginActivityModel: Model<LoginActivityDocument>,
    @InjectModel(LoginSession.name) private loginSessionModel: Model<LoginSessionDocument>,
  ) {}

  async createLoginActivity(createDto: CreateLoginActivityDto): Promise<LoginActivity> {
    // Handle 'unknown' userId - don't try to create ObjectId from it
    let userId: Types.ObjectId | undefined;
    if (createDto.userId && createDto.userId !== 'unknown' && Types.ObjectId.isValid(createDto.userId)) {
      userId = new Types.ObjectId(createDto.userId);
    }
    
    const loginActivity = new this.loginActivityModel({
      ...createDto,
      userId: userId,
      companyId: createDto.companyId && Types.ObjectId.isValid(createDto.companyId) 
        ? new Types.ObjectId(createDto.companyId) 
        : undefined,
      branchId: createDto.branchId && Types.ObjectId.isValid(createDto.branchId)
        ? new Types.ObjectId(createDto.branchId)
        : undefined,
      loginTime: createDto.loginTime || new Date(),
    });

    return await loginActivity.save();
  }

  async createLoginSession(createDto: CreateLoginSessionDto): Promise<LoginSession> {
    const loginSession = new this.loginSessionModel({
      ...createDto,
      userId: new Types.ObjectId(createDto.userId),
      companyId: createDto.companyId ? new Types.ObjectId(createDto.companyId) : undefined,
      branchId: createDto.branchId ? new Types.ObjectId(createDto.branchId) : undefined,
      lastActivity: new Date(),
      expiresAt: createDto.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours default
    });

    return await loginSession.save();
  }

  async updateSessionActivity(sessionId: string, updateDto: UpdateSessionActivityDto): Promise<LoginSession> {
    return await this.loginSessionModel.findOneAndUpdate(
      { sessionId },
      { 
        ...updateDto,
        lastActivity: updateDto.lastActivity || new Date(),
        $inc: { activityCount: 1 }
      },
      { new: true }
    );
  }

  async terminateSession(sessionId: string, terminateDto: TerminateSessionDto): Promise<LoginSession> {
    return await this.loginSessionModel.findOneAndUpdate(
      { sessionId },
      {
        status: SessionStatus.TERMINATED,
        logoutTime: new Date(),
        terminatedBy: terminateDto.terminatedBy ? new Types.ObjectId(terminateDto.terminatedBy) : undefined,
        terminationReason: terminateDto.terminationReason,
        sessionDuration: this.calculateSessionDuration(sessionId),
      },
      { new: true }
    );
  }

  async getLoginActivities(filterDto: LoginActivityFilterDto): Promise<{ activities: LoginActivity[], total: number, page: number, limit: number }> {
    const { page = 1, limit = 20, ...filters } = filterDto;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filters.userId) query.userId = new Types.ObjectId(filters.userId);
    if (filters.companyId) query.companyId = new Types.ObjectId(filters.companyId);
    if (filters.branchId) query.branchId = new Types.ObjectId(filters.branchId);
    if (filters.email) query.email = { $regex: filters.email, $options: 'i' };
    if (filters.status) query.status = filters.status;
    if (filters.method) query.method = filters.method;
    if (filters.ipAddress) query.ipAddress = filters.ipAddress;

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const activities = await this.loginActivityModel
      .find(query)
      .populate('userId', 'firstName lastName email')
      .populate('companyId', 'name email')
      .populate('branchId', 'name address')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.loginActivityModel.countDocuments(query);

    return {
      activities,
      total,
      page,
      limit,
    };
  }

  async getActiveSessions(filterDto: SessionFilterDto): Promise<{ sessions: LoginSession[], total: number, page: number, limit: number }> {
    const { page = 1, limit = 20, ...filters } = filterDto;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filters.userId) query.userId = new Types.ObjectId(filters.userId);
    if (filters.companyId) query.companyId = new Types.ObjectId(filters.companyId);
    if (filters.branchId) query.branchId = new Types.ObjectId(filters.branchId);
    if (filters.status) query.status = filters.status;
    if (filters.ipAddress) query.ipAddress = filters.ipAddress;
    if (filters.activeOnly) query.status = SessionStatus.ACTIVE;

    const sessions = await this.loginSessionModel
      .find(query)
      .populate('userId', 'firstName lastName email role')
      .populate('companyId', 'name email')
      .populate('branchId', 'name address')
      .populate('terminatedBy', 'firstName lastName email')
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.loginSessionModel.countDocuments(query);

    return {
      sessions,
      total,
      page,
      limit,
    };
  }

  async getLoginStats(companyId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    const matchQuery: any = {};
    
    if (companyId) matchQuery.companyId = new Types.ObjectId(companyId);
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = startDate;
      if (endDate) matchQuery.createdAt.$lte = endDate;
    }

    const stats = await this.loginActivityModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalLogins: { $sum: 1 },
          successfulLogins: { $sum: { $cond: [{ $eq: ['$status', LoginStatus.SUCCESS] }, 1, 0] } },
          failedLogins: { $sum: { $cond: [{ $eq: ['$status', LoginStatus.FAILED] }, 1, 0] } },
          blockedLogins: { $sum: { $cond: [{ $eq: ['$status', LoginStatus.BLOCKED] }, 1, 0] } },
          uniqueUsers: { $addToSet: '$userId' },
          uniqueIPs: { $addToSet: '$ipAddress' },
        }
      },
      {
        $project: {
          _id: 0,
          totalLogins: 1,
          successfulLogins: 1,
          failedLogins: 1,
          blockedLogins: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          uniqueIPs: { $size: '$uniqueIPs' },
          successRate: {
            $multiply: [
              { $divide: ['$successfulLogins', '$totalLogins'] },
              100
            ]
          }
        }
      }
    ]);

    return stats[0] || {
      totalLogins: 0,
      successfulLogins: 0,
      failedLogins: 0,
      blockedLogins: 0,
      uniqueUsers: 0,
      uniqueIPs: 0,
      successRate: 0,
    };
  }

  async getSessionStats(companyId?: string): Promise<any> {
    const matchQuery: any = {};
    if (companyId) matchQuery.companyId = new Types.ObjectId(companyId);

    const stats = await this.loginSessionModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          activeSessions: { $sum: { $cond: [{ $eq: ['$status', SessionStatus.ACTIVE] }, 1, 0] } },
          expiredSessions: { $sum: { $cond: [{ $eq: ['$status', SessionStatus.EXPIRED] }, 1, 0] } },
          terminatedSessions: { $sum: { $cond: [{ $eq: ['$status', SessionStatus.TERMINATED] }, 1, 0] } },
          uniqueUsers: { $addToSet: '$userId' },
          avgSessionDuration: { $avg: '$sessionDuration' },
        }
      },
      {
        $project: {
          _id: 0,
          totalSessions: 1,
          activeSessions: 1,
          expiredSessions: 1,
          terminatedSessions: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          avgSessionDuration: { $round: ['$avgSessionDuration', 2] },
        }
      }
    ]);

    return stats[0] || {
      totalSessions: 0,
      activeSessions: 0,
      expiredSessions: 0,
      terminatedSessions: 0,
      uniqueUsers: 0,
      avgSessionDuration: 0,
    };
  }

  async terminateAllUserSessions(userId: string, terminatedBy?: string, reason?: string): Promise<number> {
    const result = await this.loginSessionModel.updateMany(
      { userId: new Types.ObjectId(userId), status: SessionStatus.ACTIVE },
      {
        status: SessionStatus.TERMINATED,
        logoutTime: new Date(),
        terminatedBy: terminatedBy ? new Types.ObjectId(terminatedBy) : undefined,
        terminationReason: reason || 'Terminated by admin',
        sessionDuration: { $subtract: [new Date(), '$loginTime'] },
      }
    );

    return result.modifiedCount;
  }

  async terminateAllCompanySessions(companyId: string, terminatedBy?: string, reason?: string): Promise<number> {
    const result = await this.loginSessionModel.updateMany(
      { companyId: new Types.ObjectId(companyId), status: SessionStatus.ACTIVE },
      {
        status: SessionStatus.TERMINATED,
        logoutTime: new Date(),
        terminatedBy: terminatedBy ? new Types.ObjectId(terminatedBy) : undefined,
        terminationReason: reason || 'Terminated by admin',
        sessionDuration: { $subtract: [new Date(), '$loginTime'] },
      }
    );

    return result.modifiedCount;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.loginSessionModel.updateMany(
      { 
        status: SessionStatus.ACTIVE,
        expiresAt: { $lt: new Date() }
      },
      {
        status: SessionStatus.EXPIRED,
        logoutTime: new Date(),
        sessionDuration: { $subtract: [new Date(), '$loginTime'] },
      }
    );

    return result.modifiedCount;
  }

  private async calculateSessionDuration(sessionId: string): Promise<number> {
    const session = await this.loginSessionModel.findOne({ sessionId });
    if (session && session.loginTime) {
      return Math.round((Date.now() - session.loginTime.getTime()) / (1000 * 60)); // minutes
    }
    return 0;
  }
}
