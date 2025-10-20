import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LoginSessionDocument = LoginSession & Document;

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated',
  SUSPENDED = 'suspended',
}

@Schema({ timestamps: true })
export class LoginSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: false })
  companyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false })
  branchId?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ required: true })
  accessToken: string;

  @Prop({ required: true })
  refreshToken: string;

  @Prop({ type: String, required: true, enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ required: false })
  location?: string;

  @Prop({ required: false })
  deviceInfo?: string;

  @Prop({ required: true })
  loginTime: Date;

  @Prop({ required: false })
  lastActivity: Date;

  @Prop({ required: false })
  logoutTime?: Date;

  @Prop({ required: false })
  expiresAt: Date;

  @Prop({ required: false })
  sessionDuration?: number; // in minutes

  @Prop({ default: 0 })
  activityCount: number; // number of API calls made during session

  @Prop({ required: false })
  terminatedBy?: Types.ObjectId; // user who terminated the session

  @Prop({ required: false })
  terminationReason?: string;
}

export const LoginSessionSchema = SchemaFactory.createForClass(LoginSession);

// Add indexes for better query performance
LoginSessionSchema.index({ userId: 1, status: 1 });
LoginSessionSchema.index({ sessionId: 1 });
LoginSessionSchema.index({ companyId: 1, status: 1 });
LoginSessionSchema.index({ expiresAt: 1 });
LoginSessionSchema.index({ lastActivity: 1 });
LoginSessionSchema.index({ ipAddress: 1 });
