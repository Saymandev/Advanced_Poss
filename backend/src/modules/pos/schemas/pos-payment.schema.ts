import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type POSPaymentDocument = POSPayment & Document;

@Schema({ timestamps: true })
export class POSPayment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'POSOrder' })
  orderId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true }) // Accepts any method: 'cash', 'card', 'split', 'bkash', 'nagad', etc.
  method: string;

  @Prop({ required: true, enum: ['pending', 'completed', 'failed', 'refunded'] })
  status: string;

  @Prop()
  transactionId?: string;

  @Prop()
  referenceNumber?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  processedBy?: Types.ObjectId;

  @Prop()
  processedAt?: Date;

  @Prop()
  failureReason?: string;

  @Prop({ type: Object })
  paymentDetails?: {
    cardLast4?: string;
    cardType?: string;
    authorizationCode?: string;
    processor?: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId: Types.ObjectId;

  @Prop({ type: Number })
  amountReceived?: number;

  @Prop({ type: Number })
  changeDue?: number;
}

export const POSPaymentSchema = SchemaFactory.createForClass(POSPayment);

// Indexes
POSPaymentSchema.index({ orderId: 1 });
POSPaymentSchema.index({ status: 1 });
POSPaymentSchema.index({ branchId: 1 });
POSPaymentSchema.index({ createdAt: -1 });
POSPaymentSchema.index({ transactionId: 1 });

