import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionPaymentRequestDocument = SubscriptionPaymentRequest & Document;

export enum PaymentRequestStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class SubscriptionPaymentRequest {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Company' })
  companyId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'SubscriptionPaymentMethod' })
  paymentMethodId: Types.ObjectId;

  @Prop()
  planName?: string; // Optional for plan-based subscriptions

  @Prop({ type: [String] })
  enabledFeatures?: string[]; // Optional for feature-based subscriptions

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'BDT' })
  currency: string;

  @Prop({ default: 'monthly' })
  billingCycle: string;

  // Payment details submitted by user
  @Prop({ required: true })
  transactionId: string; // Transaction ID from bKash/Nagad

  @Prop({ required: true })
  phoneNumber: string; // Phone number used for payment

  @Prop()
  referenceNumber?: string; // Optional reference number

  @Prop()
  notes?: string; // Additional notes from user

  @Prop()
  screenshotUrl?: string; // URL of payment screenshot uploaded by user

  // Status and verification
  @Prop({ enum: PaymentRequestStatus, default: PaymentRequestStatus.PENDING })
  status: PaymentRequestStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  verifiedBy?: Types.ObjectId; // Super admin who verified

  @Prop()
  verifiedAt?: Date;

  @Prop()
  rejectionReason?: string; // If rejected, reason for rejection

  @Prop()
  adminNotes?: string; // Notes from super admin during verification

  // Expiration (e.g., 7 days from creation)
  @Prop({ default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })
  expiresAt: Date;
}

export const SubscriptionPaymentRequestSchema = SchemaFactory.createForClass(SubscriptionPaymentRequest);

// Index for efficient queries
SubscriptionPaymentRequestSchema.index({ companyId: 1, status: 1 });
SubscriptionPaymentRequestSchema.index({ status: 1, createdAt: -1 });
SubscriptionPaymentRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

