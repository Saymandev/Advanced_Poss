import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type POSOrderDocument = POSOrder & Document;

export interface POSOrderItem {
  menuItemId: Types.ObjectId;
  quantity: number;
  price: number;
  notes?: string;
}

export interface CustomerInfo {
  name?: string;
  phone?: string;
  email?: string;
}

@Schema({ timestamps: true })
export class POSOrder {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ required: true, enum: ['dine-in', 'delivery', 'takeaway'] })
  orderType: 'dine-in' | 'delivery' | 'takeaway';

  @Prop({ type: Types.ObjectId, ref: 'Table' })
  tableId: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  deliveryFee?: number;

  @Prop({ type: Object })
  deliveryDetails?: {
    contactName?: string;
    contactPhone?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    instructions?: string;
    assignedDriver?: string;
  };

  @Prop({ type: Object })
  takeawayDetails?: {
    contactName?: string;
    contactPhone?: string;
    instructions?: string;
    assignedDriver?: string;
  };

  @Prop({ required: true, type: [Object] })
  items: POSOrderItem[];

  @Prop({ type: Object })
  customerInfo?: CustomerInfo;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true, enum: ['pending', 'paid', 'cancelled'] })
  status: string;

  @Prop({ enum: ['cash', 'card', 'split'] })
  paymentMethod?: string;

  @Prop()
  notes?: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Branch' })
  branchId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'POSPayment' })
  paymentId?: Types.ObjectId;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancelledBy?: Types.ObjectId;

  @Prop()
  cancellationReason?: string;

  @Prop({ type: Number })
  guestCount?: number;
}

export const POSOrderSchema = SchemaFactory.createForClass(POSOrder);

// Indexes
POSOrderSchema.index({ orderNumber: 1 });
POSOrderSchema.index({ tableId: 1 });
POSOrderSchema.index({ branchId: 1 });
POSOrderSchema.index({ status: 1 });
POSOrderSchema.index({ createdAt: -1 });
POSOrderSchema.index({ branchId: 1, status: 1 });
POSOrderSchema.index({ branchId: 1, createdAt: -1 });
