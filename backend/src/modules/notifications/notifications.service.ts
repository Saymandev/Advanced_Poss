import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly websocketsGateway: WebsocketsGateway,
  ) {}

  private normalizeRoles(roles?: string[]) {
    return roles?.map((r) => r.toLowerCase()) || [];
  }

  async create(dto: CreateNotificationDto) {
    const doc = new this.notificationModel({
      ...dto,
      companyId: dto.companyId ? new Types.ObjectId(dto.companyId) : undefined,
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : undefined,
      roles: this.normalizeRoles(dto.roles),
      userIds: dto.userIds?.map((id) => new Types.ObjectId(id)) || [],
      createdBy: dto.createdBy ? new Types.ObjectId(dto.createdBy) : undefined,
    });
    const saved = await doc.save();

    // Broadcast via WebSocket
    try {
      this.websocketsGateway.emitScopedNotification({
        companyId: dto.companyId,
        branchId: dto.branchId,
        roles: this.normalizeRoles(dto.roles),
        features: dto.features || [],
        userIds: dto.userIds || [],
        payload: saved.toJSON(),
      });
    } catch (err) {
      this.logger.warn(`Failed to emit notification: ${err?.message || err}`);
    }

    return saved;
  }

  async list(params: {
    companyId?: string;
    branchId?: string;
    role?: string;
    userId?: string;
    features?: string[];
    page?: number;
    limit?: number;
  }) {
    const {
      companyId,
      branchId,
      role,
      userId,
      features = [],
      page = 1,
      limit = 20,
    } = params;

    const filter: any = {};
    if (companyId) filter.companyId = new Types.ObjectId(companyId);
    if (branchId) filter.branchId = new Types.ObjectId(branchId);
    if (role) filter.roles = role.toLowerCase();
    if (userId) filter.userIds = new Types.ObjectId(userId);
    if (features.length > 0) filter.features = { $in: features };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.notificationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean().exec(),
      this.notificationModel.countDocuments(filter).exec(),
    ]);

    const unreadCount = await this.notificationModel.countDocuments({
      ...filter,
      readAt: { $exists: false },
    });

    return { items, total, unreadCount };
  }

  async markAsRead(id: string, userId?: string) {
    // If userId provided, only mark if targeted to that user
    const filter: any = { _id: id };
    if (userId) {
      filter.$or = [
        { userIds: new Types.ObjectId(userId) },
        { userIds: { $size: 0 } }, // broadcast without specific users
      ];
    }
    await this.notificationModel.findOneAndUpdate(filter, { readAt: new Date() }).exec();
  }

  async markAllAsRead(params: { companyId?: string; branchId?: string; role?: string; userId?: string }) {
    const filter: any = { readAt: { $exists: false } };
    if (params.companyId) filter.companyId = new Types.ObjectId(params.companyId);
    if (params.branchId) filter.branchId = new Types.ObjectId(params.branchId);
    if (params.role) filter.roles = params.role.toLowerCase();
    if (params.userId) filter.userIds = new Types.ObjectId(params.userId);
    await this.notificationModel.updateMany(filter, { readAt: new Date() }).exec();
  }

  async delete(id: string) {
    await this.notificationModel.findByIdAndDelete(id).exec();
  }

  async deleteAll(params: { companyId?: string; branchId?: string }) {
    const filter: any = {};
    if (params.companyId) filter.companyId = new Types.ObjectId(params.companyId);
    if (params.branchId) filter.branchId = new Types.ObjectId(params.branchId);
    await this.notificationModel.deleteMany(filter).exec();
  }
}

