import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true })
  type: string; // e.g., order.created, feature.assigned

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  // Roles that should receive (lowercase stored)
  @Prop({ type: [String], default: [] })
  roles?: string[];

  // Feature keys required to see this notification
  @Prop({ type: [String], default: [] })
  features?: string[];

  // Explicit user targets (ObjectId)
  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  userIds?: Types.ObjectId[];

  // Actor
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ type: Date })
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ companyId: 1, branchId: 1, createdAt: -1 });
NotificationSchema.index({ roles: 1 });
NotificationSchema.index({ userIds: 1 });
NotificationSchema.index({ features: 1 });

NotificationSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id?.toString() || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

