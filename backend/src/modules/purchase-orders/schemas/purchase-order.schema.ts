import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PurchaseOrderStatus } from '../../../common/enums/purchase-order-status.enum';

export type PurchaseOrderDocument = PurchaseOrder & Document;

@Schema({ _id: true })
export class PurchaseOrderItem {
  _id?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ingredient', required: true })
  ingredientId: Types.ObjectId;

  @Prop({ required: true })
  ingredientName: string;

  @Prop({ required: true })
  unit: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({ default: 0, min: 0 })
  receivedQuantity: number;

  @Prop()
  notes?: string;
}

const PurchaseOrderItemSchema = SchemaFactory.createForClass(PurchaseOrderItem);

@Schema({ timestamps: true })
export class PurchaseOrder {
  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true })
  supplierId: Types.ObjectId;

  @Prop({
    type: {
      name: String,
      contactPerson: String,
      phone: String,
      email: String,
    },
  })
  supplierSnapshot?: {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
  };

  @Prop({
    type: String,
    enum: Object.values(PurchaseOrderStatus),
    default: PurchaseOrderStatus.PENDING,
  })
  status: PurchaseOrderStatus;

  @Prop({ type: Date, default: Date.now })
  orderDate: Date;

  @Prop({ type: Date })
  expectedDeliveryDate: Date;

  @Prop({ type: Date })
  actualDeliveryDate?: Date;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ default: 0, min: 0 })
  taxAmount: number;

  @Prop({ default: 0, min: 0 })
  discountAmount: number;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: String })
  createdBy?: string;

  @Prop({ type: String })
  approvedBy?: string;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: String })
  cancellationReason?: string;

  @Prop({ type: [PurchaseOrderItemSchema], required: true })
  items: PurchaseOrderItem[];

  @Prop({ type: String, default: 'cash' })
  paymentMethod?: string;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);

PurchaseOrderSchema.index({ companyId: 1, branchId: 1 });
PurchaseOrderSchema.index({ orderNumber: 1 }, { unique: true });
PurchaseOrderSchema.index({ supplierId: 1 });
PurchaseOrderSchema.index({ status: 1 });
PurchaseOrderSchema.index({ orderDate: 1 });

PurchaseOrderSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    (ret as any).id = ret._id;
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});
