import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BranchDocument = Branch & Document;

@Schema({ timestamps: true })
export class Branch {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ unique: true, trim: true })
  code: string;

  // Contact
  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  // Address
  @Prop({
    type: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: String,
      country: { type: String, required: true },
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    required: true,
  })
  address: {
    street: string;
    city: string;
    state?: string;
    country: string;
    zipCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Manager
  @Prop({ type: Types.ObjectId, ref: 'User' })
  managerId?: Types.ObjectId;

  // Operational
  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    type: [
      {
        day: {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
        open: String,
        close: String,
        isClosed: { type: Boolean, default: false },
      },
    ],
    default: [],
  })
  openingHours: Array<{
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }>;

  // Capacity
  @Prop()
  totalTables?: number;

  @Prop()
  totalSeats?: number;

  // Settings
  @Prop({
    type: {
      autoAcceptOrders: { type: Boolean, default: true },
      printReceipts: { type: Boolean, default: true },
      allowTips: { type: Boolean, default: true },
      defaultTipPercentage: Number,
    },
    default: {},
  })
  settings: {
    autoAcceptOrders: boolean;
    printReceipts: boolean;
    allowTips: boolean;
    defaultTipPercentage?: number;
  };
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

// Indexes
BranchSchema.index({ companyId: 1 });
BranchSchema.index({ code: 1 }, { unique: true });
BranchSchema.index({ isActive: 1 });

// Transform output
BranchSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform`n    // @ts-ignore - Mongoose transform`n    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

