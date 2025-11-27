import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DigitalReceiptDocument = DigitalReceipt & Document;

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface PersonalizedOffer {
  title: string;
  description: string;
  code: string;
  expiryDate: Date;
}

@Schema({ timestamps: true })
export class DigitalReceipt {
  @Prop({ required: true, unique: true })
  receiptNumber: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'POSOrder' })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId?: Types.ObjectId;

  @Prop()
  customerEmail?: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Branch' })
  branchId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Company' })
  companyId: Types.ObjectId;

  @Prop({ required: true, type: [Object] })
  items: ReceiptItem[];

  @Prop({ required: true })
  subtotal: number;

  @Prop({ required: true })
  tax: number;

  @Prop()
  tip?: number;

  @Prop({ required: true })
  total: number;

  @Prop({ required: true })
  paymentMethod: string;

  @Prop({ default: 0 })
  loyaltyPointsEarned?: number;

  @Prop({ default: 0 })
  loyaltyPointsBalance?: number;

  @Prop({ type: [Object] })
  personalizedOffers?: PersonalizedOffer[];

  @Prop({ default: false })
  emailed: boolean;

  @Prop()
  emailedAt?: Date;

  @Prop()
  emailedTo?: string;
}

export const DigitalReceiptSchema = SchemaFactory.createForClass(DigitalReceipt);

// Indexes
DigitalReceiptSchema.index({ receiptNumber: 1 });
DigitalReceiptSchema.index({ orderId: 1 });
DigitalReceiptSchema.index({ customerId: 1 });
DigitalReceiptSchema.index({ branchId: 1 });
DigitalReceiptSchema.index({ companyId: 1 });
DigitalReceiptSchema.index({ createdAt: -1 });
DigitalReceiptSchema.index({ branchId: 1, createdAt: -1 });

