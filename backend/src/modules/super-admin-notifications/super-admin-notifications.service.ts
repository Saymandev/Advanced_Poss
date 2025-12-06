import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { SuperAdminNotification, SuperAdminNotificationDocument } from './schemas/super-admin-notification.schema';

interface CreateNotificationInput {
  type: string;
  title: string;
  message: string;
  companyId?: string | Types.ObjectId;
  metadata?: Record<string, any>;
  createdBy?: string | Types.ObjectId;
}

@Injectable()
export class SuperAdminNotificationsService {
  private readonly logger = new Logger(SuperAdminNotificationsService.name);

  constructor(
    @InjectModel(SuperAdminNotification.name)
    private readonly notificationModel: Model<SuperAdminNotificationDocument>,
    private readonly websocketsGateway: WebsocketsGateway,
  ) {}

  async create(payload: CreateNotificationInput): Promise<SuperAdminNotificationDocument> {
    const notification = new this.notificationModel({
      ...payload,
      companyId: payload.companyId ? new Types.ObjectId(payload.companyId) : undefined,
      createdBy: payload.createdBy ? new Types.ObjectId(payload.createdBy) : undefined,
    });
    const saved = await notification.save();

    // Push to all super_admin sockets
    try {
      this.websocketsGateway.broadcastToRole?.('super_admin', 'super-admin-notification', saved.toJSON());
    } catch (error) {
      this.logger.warn(`Failed to broadcast super admin notification: ${error?.message || error}`);
    }

    return saved;
  }

  async list(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.notificationModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments().exec(),
    ]);
    const unreadCount = await this.notificationModel.countDocuments({ readAt: { $exists: false } });
    return { items, total, unreadCount };
  }

  async unreadCount() {
    return this.notificationModel.countDocuments({ readAt: { $exists: false } }).exec();
  }

  async markAsRead(id: string) {
    await this.notificationModel.findByIdAndUpdate(id, { readAt: new Date() }).exec();
  }

  async markAllAsRead() {
    await this.notificationModel.updateMany({ readAt: { $exists: false } }, { readAt: new Date() }).exec();
  }

  async clear(id: string) {
    await this.notificationModel.findByIdAndDelete(id).exec();
  }

  async clearAll() {
    await this.notificationModel.deleteMany({}).exec();
  }
}

