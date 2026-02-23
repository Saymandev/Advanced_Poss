import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WastageDocument = Wastage & Document;

export enum WastageReason {
  EXPIRED = 'expired',
  DAMAGED = 'damaged',
  SPOILAGE = 'spoilage',
  OVER_PRODUCTION = 'over_production',
  PREPARATION_ERROR = 'preparation_error',
  STORAGE_ISSUE = 'storage_issue',
  CONTAMINATION = 'contamination',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Wastage {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ingredient', required: false })
  ingredientId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: false })
  menuItemId?: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true })
  unit: string; // Store unit for reference (kg, g, l, ml, etc.)

  @Prop({
    type: String,
    enum: Object.values(WastageReason),
    required: true,
    default: WastageReason.OTHER,
  })
  reason: WastageReason;

  @Prop({ required: true, min: 0 })
  unitCost: number; // Cost per unit at time of wastage

  @Prop({ required: true, min: 0 })
  totalCost: number; // quantity * unitCost

  @Prop({ required: true })
  wastageDate: Date; // When the wastage occurred

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reportedBy: Types.ObjectId; // Who reported the wastage

  @Prop()
  notes?: string; // Additional details about the wastage

  @Prop()
  batchNumber?: string; // If tracking by batch

  @Prop()
  expiryDate?: Date; // Original expiry date if expired

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status: string; // Approval status (if needed)

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop([String])
  attachments?: string[]; // Photos or documents
}

export const WastageSchema = SchemaFactory.createForClass(Wastage);

// Indexes for better query performance
WastageSchema.index({ companyId: 1, wastageDate: -1 });
WastageSchema.index({ branchId: 1, wastageDate: -1 });
WastageSchema.index({ ingredientId: 1 });
WastageSchema.index({ reason: 1 });

