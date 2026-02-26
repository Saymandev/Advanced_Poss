import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type KitchenOrderDocument = KitchenOrder & Document;

// This is a view/representation of orders for the kitchen
// It links to the actual Order but provides kitchen-specific data
@Schema({ timestamps: true })
export class KitchenOrder {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ required: true })
  orderNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Table' })
  tableId?: Types.ObjectId;

  @Prop()
  tableNumber?: string;

  @Prop({
    type: String,
    enum: ['dine-in', 'takeaway', 'delivery'],
    required: true,
  })
  orderType: string;

  @Prop({
    type: [
      {
        itemId: String,
        menuItemId: { type: Types.ObjectId, ref: 'MenuItem' },
        name: String,
        quantity: Number,
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
        status: {
          type: String,
          enum: ['pending', 'preparing', 'ready', 'served'],
          default: 'pending',
        },
        priority: {
          type: Number,
          default: 0,
        },
        startedAt: Date,
        completedAt: Date,
        preparedBy: { type: Types.ObjectId, ref: 'User' },
      },
    ],
    required: true,
  })
  items: {
    itemId: string;
    menuItemId: Types.ObjectId;
    name: string;
    quantity: number;
    selectedVariant?: {
      name: string;
      priceModifier: number;
    };
    selectedAddons?: {
      name: string;
      price: number;
    }[];
    specialInstructions?: string;
    status: string;
    priority: number;
    startedAt?: Date;
    completedAt?: Date;
    preparedBy?: Types.ObjectId;
  }[];

  @Prop({
    type: String,
    enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop()
  receivedAt: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: 0 })
  estimatedTime?: number; // in minutes

  @Prop()
  actualTime?: number; // in minutes

  @Prop({ default: false })
  isUrgent: boolean;

  @Prop({ default: false })
  isDelayed: boolean;

  @Prop()
  customerName?: string;

  @Prop()
  notes?: string;
}

export const KitchenOrderSchema = SchemaFactory.createForClass(KitchenOrder);

// Indexes
KitchenOrderSchema.index({ branchId: 1, status: 1 });
KitchenOrderSchema.index({ orderId: 1 }, { unique: true });
KitchenOrderSchema.index({ status: 1 });
KitchenOrderSchema.index({ receivedAt: 1 });
KitchenOrderSchema.index({ isUrgent: 1 });

// Virtual for order age in minutes
KitchenOrderSchema.virtual('orderAge').get(function () {
  if (!this.receivedAt) return 0;
  return Math.floor((Date.now() - this.receivedAt.getTime()) / 60000);
});

// Check if order is delayed (> 30 minutes)
KitchenOrderSchema.pre('save', function (next) {
  if (this.receivedAt && this.status !== 'completed' && this.status !== 'cancelled') {
    const ageInMinutes = Math.floor(
      (Date.now() - this.receivedAt.getTime()) / 60000,
    );
    this.isDelayed = ageInMinutes > 30;
  }
  next();
});

// Transform output
KitchenOrderSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

