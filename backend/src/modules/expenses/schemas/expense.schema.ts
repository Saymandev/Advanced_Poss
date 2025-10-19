import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExpenseDocument = Expense & Document;

@Schema({ timestamps: true })
export class Expense {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ required: true })
  expenseNumber: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: [
      'ingredient',
      'utility',
      'rent',
      'salary',
      'maintenance',
      'marketing',
      'equipment',
      'transport',
      'other',
    ],
    required: true,
  })
  category: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  date: Date;

  @Prop({
    type: String,
    enum: ['cash', 'card', 'bank-transfer', 'cheque', 'online', 'other'],
    default: 'cash',
  })
  paymentMethod: string;

  @Prop()
  invoiceNumber?: string;

  @Prop()
  vendorName?: string;

  @Prop()
  vendorPhone?: string;

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  supplierId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'pending',
  })
  status: string;

  @Prop([String])
  attachments?: string[];

  @Prop()
  receiptUrl?: string;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  isRecurring: boolean;

  @Prop({
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  recurringFrequency?: string;

  @Prop()
  nextRecurringDate?: Date;

  @Prop([String])
  tags?: string[];
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

// Indexes
ExpenseSchema.index({ companyId: 1, branchId: 1 });
ExpenseSchema.index({ expenseNumber: 1 }, { unique: true });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ status: 1 });
ExpenseSchema.index({ date: -1 });
ExpenseSchema.index({ createdBy: 1 });
ExpenseSchema.index({ isRecurring: 1 });

// Transform output
ExpenseSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform`n    // @ts-ignore - Mongoose transform`n    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

