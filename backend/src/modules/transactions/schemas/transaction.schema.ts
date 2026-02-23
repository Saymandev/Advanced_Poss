import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
}

export enum TransactionCategory {
  SALE = 'SALE', // Money in from orders
  EXPENSE = 'EXPENSE', // Money out for rent, utilities, vendor payments
  PURCHASE = 'PURCHASE', // Money out for buying ingredients
  REFUND = 'REFUND', // Money out to refund a customer
  PROFIT_WITHDRAWAL = 'PROFIT_WITHDRAWAL', // Money out to the owner
  CAPITAL_INJECTION = 'CAPITAL_INJECTION', // Money in from the owner
  TRANSFER = 'TRANSFER', // Money moved between payment methods
  OTHER = 'OTHER',
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  transactionNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'PaymentMethod', required: true })
  paymentMethodId: Types.ObjectId; // The account the money moved from/to

  @Prop({
    type: String,
    enum: Object.values(TransactionType),
    required: true,
  })
  type: TransactionType;

  @Prop({
    type: String,
    enum: Object.values(TransactionCategory),
    required: true,
  })
  category: TransactionCategory;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: Types.ObjectId })
  referenceId?: Types.ObjectId; // E.g., Order ID, Expense ID, Purchase Order ID

  @Prop({ type: String })
  referenceModel?: string; // E.g., 'Order', 'Expense', 'PurchaseOrder'

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  notes?: string;

  @Prop({ required: true })
  balanceAfter: number; // The running balance of the PaymentMethod after this transaction

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Indexes
TransactionSchema.index({ companyId: 1, branchId: 1 });
TransactionSchema.index({ paymentMethodId: 1, date: -1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ category: 1 });
TransactionSchema.index({ date: -1 });

// Transform output
TransactionSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc: any, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
