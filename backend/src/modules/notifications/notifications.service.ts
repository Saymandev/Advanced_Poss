import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification, NotificationDocument } from './schemas/notification.schema';

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

    // Build base scope filters (company + branch)
    const scopeFilter: any = {};
    if (companyId) scopeFilter.companyId = new Types.ObjectId(companyId);
    if (branchId) scopeFilter.branchId = new Types.ObjectId(branchId);

    // A notification is relevant to this user if EITHER:
    //   (a) their role appears in the notification's roles[] array, OR
    //   (b) their userId appears in the notification's userIds[] array, OR
    //   (c) roles[] is empty AND userIds[] is empty (broadcast to everyone in scope)
    const targetingConditions: any[] = [];

    if (role) {
      // Notifications explicitly targeting this role
      targetingConditions.push({ roles: { $in: [role.toLowerCase()] } });
    }

    if (userId) {
      // Direct notifications for this user
      targetingConditions.push({ userIds: new Types.ObjectId(userId) });
    }

    // Broadcast notifications (no role or user restriction)
    targetingConditions.push({
      roles: { $size: 0 },
      userIds: { $size: 0 },
    });

    const filter: any = {
      ...scopeFilter,
      ...(targetingConditions.length > 0 ? { $or: targetingConditions } : {}),
    };

    // Feature gate: if user has specific features enabled, include those notifications
    if (features.length > 0) {
      filter.$and = [
        { $or: [{ features: { $size: 0 } }, { features: { $in: features } }] },
      ];
    }

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
    // Mark as read regardless of role — the user has already been pre-filtered on fetch
    await this.notificationModel.findOneAndUpdate(
      { _id: id },
      { readAt: new Date() },
    ).exec();
  }

  async markAllAsRead(params: { companyId?: string; branchId?: string; role?: string; userId?: string }) {
    const filter: any = { readAt: { $exists: false } };
    if (params.companyId) filter.companyId = new Types.ObjectId(params.companyId);
    if (params.branchId) filter.branchId = new Types.ObjectId(params.branchId);

    // Use $or so we only mark notifications relevant to this user
    const targeting: any[] = [];
    if (params.role) targeting.push({ roles: { $in: [params.role.toLowerCase()] } });
    if (params.userId) targeting.push({ userIds: new Types.ObjectId(params.userId) });
    targeting.push({ roles: { $size: 0 }, userIds: { $size: 0 } });
    filter.$or = targeting;

    await this.notificationModel.updateMany(filter, { readAt: new Date() }).exec();
  }

  async delete(id: string) {
    await this.notificationModel.findByIdAndDelete(id).exec();
  }

  async deleteAll(params: { companyId?: string; branchId?: string; role?: string; userId?: string }) {
    const filter: any = {};
    if (params.companyId) filter.companyId = new Types.ObjectId(params.companyId);
    if (params.branchId) filter.branchId = new Types.ObjectId(params.branchId);

    // Scope deletion to notifications relevant to this role/user — never delete other roles' data
    const targeting: any[] = [];
    if (params.role) targeting.push({ roles: { $in: [params.role.toLowerCase()] } });
    if (params.userId) targeting.push({ userIds: new Types.ObjectId(params.userId) });
    targeting.push({ roles: { $size: 0 }, userIds: { $size: 0 } });
    if (targeting.length > 0) filter.$or = targeting;

    await this.notificationModel.deleteMany(filter).exec();
  }
}

