import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  orderNumber: string;

  @Prop({
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery'],
    default: 'dine-in',
  })
  type: string;

  @Prop({ type: Types.ObjectId, ref: 'Table' })
  tableId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  waiterId: Types.ObjectId;

  @Prop({
    type: [
      {
        menuItemId: { type: Types.ObjectId, ref: 'MenuItem', required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        basePrice: { type: Number, required: true },
        selectedVariant: {
          name: String,
          priceModifier: Number,
        },
        selectedAddons: [
          {
            name: String,
            price: Number,
          },
        ],
        specialInstructions: String,
        unitPrice: { type: Number, required: true },
        totalPrice: { type: Number, required: true },
        status: {
          type: String,
          enum: ['pending', 'preparing', 'ready', 'served'],
          default: 'pending',
        },
        sentToKitchenAt: Date,
        preparedAt: Date,
        servedAt: Date,
      },
    ],
    required: true,
  })
  items: {
    menuItemId: Types.ObjectId;
    name: string;
    quantity: number;
    basePrice: number;
    selectedVariant?: {
      name: string;
      priceModifier: number;
    };
    selectedAddons?: {
      name: string;
      price: number;
    }[];
    specialInstructions?: string;
    unitPrice: number;
    totalPrice: number;
    status: string;
    sentToKitchenAt?: Date;
    preparedAt?: Date;
    servedAt?: Date;
  }[];

  // Pricing
  @Prop({ required: true, default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  taxRate: number;

  @Prop({ default: 0 })
  taxAmount: number;

  @Prop({ default: 0 })
  discountAmount: number;

  @Prop()
  discountReason?: string;

  @Prop({ default: 0 })
  serviceChargeRate: number;

  @Prop({ default: 0 })
  serviceChargeAmount: number;

  @Prop({ default: 0 })
  deliveryFee: number;

  @Prop({ required: true })
  total: number;

  // Status
  @Prop({
    type: String,
    enum: [
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'served',
      'completed',
      'cancelled',
    ],
    default: 'pending',
  })
  status: string;

  // Payment
  @Prop({
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending',
  })
  paymentStatus: string;

  @Prop({
    type: [
      {
        method: {
          type: String,
          enum: ['cash', 'card', 'upi', 'wallet', 'other'],
          required: true,
        },
        amount: { type: Number, required: true },
        transactionId: String,
        paidAt: { type: Date, default: Date.now },
        processedBy: { type: Types.ObjectId, ref: 'User' },
      },
    ],
    default: [],
  })
  payments: {
    method: string;
    amount: number;
    transactionId?: string;
    paidAt: Date;
    processedBy: Types.ObjectId;
  }[];

  @Prop({ default: 0 })
  paidAmount: number;

  @Prop({ default: 0 })
  remainingAmount: number;

  // Delivery info
  @Prop({
    type: {
      name: String,
      phone: String,
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
      instructions: String,
    },
  })
  deliveryInfo?: {
    name: string;
    phone: string;
    address: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    instructions?: string;
  };

  // Timing
  @Prop()
  confirmedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  // Notes
  @Prop()
  customerNotes?: string;

  @Prop()
  internalNotes?: string;

  // Guest info (for walk-ins without customer account)
  @Prop()
  guestName?: string;

  @Prop()
  guestPhone?: string;

  @Prop()
  guestCount?: number;

  // Split billing
  @Prop({ default: false })
  isSplit: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  parentOrderId?: Types.ObjectId;

  @Prop([{ type: Types.ObjectId, ref: 'Order' }])
  splitOrderIds?: Types.ObjectId[];

  createdAt: Date;
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Indexes
OrderSchema.index({ orderNumber: 1 }, { unique: true });
OrderSchema.index({ companyId: 1, branchId: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ tableId: 1 });
OrderSchema.index({ customerId: 1 });
OrderSchema.index({ waiterId: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ type: 1 });

// Virtual for order age
OrderSchema.virtual('orderAge').get(function () {
  // @ts-ignore - Mongoose schema timestamps
  return Date.now() - this.createdAt.getTime();
});

// Transform output
OrderSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform`n    // @ts-ignore - Mongoose transform`n    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

