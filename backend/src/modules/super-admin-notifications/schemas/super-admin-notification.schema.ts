import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SuperAdminNotificationDocument = SuperAdminNotification & Document;

@Schema({ timestamps: true })
export class SuperAdminNotification {
  @Prop({ required: true })
  type: string; // e.g., company.registered, subscription.expired, subscription.renewed

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'Company' })
  companyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  readAt?: Date;
}

export const SuperAdminNotificationSchema = SchemaFactory.createForClass(SuperAdminNotification);

SuperAdminNotificationSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc: any, ret: any) => {
    ret.id = ret._id?.toString() || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

