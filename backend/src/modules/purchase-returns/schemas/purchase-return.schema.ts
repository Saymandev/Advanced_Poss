import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PurchaseReturnDocument = PurchaseReturn & Document;

@Schema({ timestamps: true })
export class PurchaseReturn {
  @Prop({ required: true, unique: true, trim: true })
  returnNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Supplier' })
  supplierId?: Types.ObjectId;

  @Prop({ trim: true })
  supplierName?: string;

  @Prop({ type: Types.ObjectId, ref: 'PurchaseOrder' })
  purchaseOrderId?: Types.ObjectId;

  @Prop({
    type: [
      {
        productId: { type: Types.ObjectId, ref: 'Ingredient', required: true },
        productName: String,
        quantity: { type: Number, required: true, min: 1 },
        unitCost: { type: Number, default: 0 },
        reason: {
          type: String,
          enum: ['damaged', 'expired', 'defective', 'wrong_item', 'other'],
          default: 'damaged',
        },
        notes: String,
      },
    ],
    required: true,
  })
  items: {
    productId: Types.ObjectId;
    productName: string;
    quantity: number;
    unitCost: number;
    reason: 'damaged' | 'expired' | 'defective' | 'wrong_item' | 'other';
    notes?: string;
  }[];

  @Prop({ default: 0 })
  totalAmount: number;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected', 'settled'],
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'rejected' | 'settled';

  @Prop({
    type: String,
    enum: ['replacement', 'credit_note', 'refund'],
  })
  settlementType?: 'replacement' | 'credit_note' | 'refund';

  @Prop()
  settlementDate?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop({ trim: true })
  notes?: string;
}

export const PurchaseReturnSchema = SchemaFactory.createForClass(PurchaseReturn);

PurchaseReturnSchema.index({ companyId: 1, status: 1 });
PurchaseReturnSchema.index({ branchId: 1 });
PurchaseReturnSchema.index({ supplierId: 1 });
PurchaseReturnSchema.index({ returnNumber: 1 }, { unique: true });

PurchaseReturnSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret) => {
    (ret as any).id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
