import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type BillingHistoryDocument = BillingHistory & Document;

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

@Schema({ timestamps: true })
export class BillingHistory {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subscription', required: true, index: true })
  subscriptionId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true })
  invoiceNumber: string;

  @Prop()
  stripeInvoiceId: string;

  @Prop()
  stripePaymentIntentId: string;

  @Prop()
  stripeChargeId: string;

  @Prop({ required: true, enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  invoiceStatus: InvoiceStatus;

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 0 })
  tax: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true })
  total: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: true, type: Date })
  billingDate: Date;

  @Prop({ type: Date })
  dueDate: Date;

  @Prop({ type: Date })
  paidAt: Date;

  @Prop()
  paymentMethod: string;

  @Prop()
  last4: string;

  @Prop()
  cardBrand: string;

  @Prop({ type: Date })
  periodStart: Date;

  @Prop({ type: Date })
  periodEnd: Date;

  @Prop()
  description: string;

  @Prop({ type: [Object], default: [] })
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;

  @Prop()
  receiptUrl: string;

  @Prop()
  invoicePdfUrl: string;

  @Prop()
  failureReason: string;

  @Prop({ type: Date })
  refundedAt: Date;

  @Prop({ default: 0 })
  refundedAmount: number;

  @Prop()
  refundReason: string;

  @Prop({ default: 0 })
  attemptCount: number;

  @Prop({ type: Date })
  nextRetryDate: Date;

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;
}

export const BillingHistorySchema = SchemaFactory.createForClass(BillingHistory);

// Indexes
BillingHistorySchema.index({ companyId: 1, billingDate: -1 });
BillingHistorySchema.index({ subscriptionId: 1, billingDate: -1 });
BillingHistorySchema.index({ invoiceNumber: 1 }, { unique: true });
BillingHistorySchema.index({ stripeInvoiceId: 1 });
BillingHistorySchema.index({ paymentStatus: 1 });

// Virtual for is overdue
BillingHistorySchema.virtual('isOverdue').get(function () {
  if (this.paymentStatus === PaymentStatus.SUCCEEDED) return false;
  if (!this.dueDate) return false;
  return new Date() > new Date(this.dueDate);
});

// Virtual for days overdue
BillingHistorySchema.virtual('daysOverdue').get(function () {
  if (!this.dueDate || this.paymentStatus === PaymentStatus.SUCCEEDED) return 0;
  const now = new Date();
  const due = new Date(this.dueDate);
  if (now <= due) return 0;
  const diff = now.getTime() - due.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

BillingHistorySchema.set('toJSON', { virtuals: true });
BillingHistorySchema.set('toObject', { virtuals: true });

