import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../../common/enums/user-role.enum';

export type LoginActivityDocument = LoginActivity & Document;

export enum LoginStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  EXPIRED = 'expired',
}

export enum LoginMethod {
  EMAIL_PASSWORD = 'email_password',
  PIN_ROLE = 'pin_role',
  REFRESH_TOKEN = 'refresh_token',
}

@Schema({ timestamps: true })
export class LoginActivity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: false })
  companyId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: false })
  branchId?: Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ type: String, required: true, enum: UserRole })
  role: UserRole;

  @Prop({ type: String, required: true, enum: LoginStatus })
  status: LoginStatus;

  @Prop({ type: String, required: true, enum: LoginMethod })
  method: LoginMethod;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ required: false })
  location?: string;

  @Prop({ required: false })
  deviceInfo?: string;

  @Prop({ required: false })
  failureReason?: string;

  @Prop({ required: false })
  sessionId?: string;

  @Prop({ required: false })
  loginTime: Date;

  @Prop({ required: false })
  logoutTime?: Date;

  @Prop({ required: false })
  sessionDuration?: number; // in minutes

  @Prop({ default: false })
  isActive: boolean;
}

export const LoginActivitySchema = SchemaFactory.createForClass(LoginActivity);

// Add indexes for better query performance
LoginActivitySchema.index({ userId: 1, createdAt: -1 });
LoginActivitySchema.index({ companyId: 1, createdAt: -1 });
LoginActivitySchema.index({ status: 1, createdAt: -1 });
LoginActivitySchema.index({ ipAddress: 1, createdAt: -1 });
LoginActivitySchema.index({ email: 1, createdAt: -1 });
LoginActivitySchema.index({ sessionId: 1 });
