import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type IncomeDocument = Income & Document;

@Schema({ timestamps: true })
export class Income {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ required: true })
  incomeNumber: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: String,
    enum: [
      'catering',
      'event',
      'room-service',
      'interest',
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
    default: 'cash',
  })
  paymentMethod: string;

  @Prop()
  invoiceNumber?: string;

  @Prop()
  customerName?: string;

  @Prop()
  customerPhone?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  receivedBy?: Types.ObjectId;

  @Prop()
  receivedAt?: Date;

  @Prop({
    type: String,
    enum: ['pending', 'received'],
    default: 'pending',
  })
  status: string;

  @Prop()
  receiptUrl?: string;

  @Prop()
  notes?: string;

  @Prop([String])
  tags?: string[];

  @Prop({ type: Types.ObjectId, ref: 'WorkPeriod' })
  workPeriodId?: Types.ObjectId;
}

export const IncomeSchema = SchemaFactory.createForClass(Income);

// Indexes
IncomeSchema.index({ companyId: 1, branchId: 1 });
IncomeSchema.index({ incomeNumber: 1 }, { unique: true });
IncomeSchema.index({ category: 1 });
IncomeSchema.index({ status: 1 });
IncomeSchema.index({ date: -1 });
IncomeSchema.index({ workPeriodId: 1 });
IncomeSchema.index({ createdBy: 1 });

// Transform output
IncomeSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    const obj = ret as any;
    obj.id = obj._id;
    delete obj._id;
    delete obj.__v;
    return obj;
  },
});
