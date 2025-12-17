import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room {
  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  // Room Details
  @Prop({ required: true, trim: true })
  roomNumber: string;

  @Prop({
    type: String,
    enum: ['single', 'double', 'suite', 'deluxe', 'presidential'],
    required: true,
  })
  roomType: string;

  @Prop({ type: Number })
  floor?: number;

  @Prop({ trim: true })
  building?: string;

  @Prop({ trim: true })
  description?: string;

  // Capacity & Features
  @Prop({ required: true, min: 1 })
  maxOccupancy: number;

  @Prop({
    type: {
      single: { type: Number, default: 0 },
      double: { type: Number, default: 0 },
      king: { type: Number, default: 0 },
    },
    default: {},
  })
  beds?: {
    single: number;
    double: number;
    king: number;
  };

  @Prop({ type: [String], default: [] })
  amenities: string[]; // ['wifi', 'tv', 'ac', 'minibar', 'balcony', 'jacuzzi']

  // Pricing
  @Prop({ required: true, min: 0 })
  basePrice: number; // per night

  @Prop({
    type: [
      {
        startDate: Date,
        endDate: Date,
        price: Number,
      },
    ],
    default: [],
  })
  seasonalPricing?: {
    startDate: Date;
    endDate: Date;
    price: number;
  }[];

  // Status Management
  @Prop({
    type: String,
    enum: ['available', 'occupied', 'reserved', 'maintenance', 'out_of_order'],
    default: 'available',
  })
  status: string;

  // Current Booking
  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  currentBookingId?: Types.ObjectId;

  @Prop()
  checkedInAt?: Date;

  @Prop()
  checkedOutAt?: Date;

  // Room Features
  @Prop({ type: Number })
  size?: number; // Square meters/feet

  @Prop({ trim: true })
  view?: string; // 'ocean', 'mountain', 'city', 'garden'

  @Prop({ default: false })
  smokingAllowed: boolean;

  // Images
  @Prop({ type: [String], default: [] })
  images: string[]; // URLs to room photos

  // QR Code (for room service, check-in, etc.)
  @Prop({ unique: true })
  qrCode: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const RoomSchema = SchemaFactory.createForClass(Room);

// Indexes
RoomSchema.index({ branchId: 1, roomNumber: 1 }, { unique: true });
RoomSchema.index({ branchId: 1, status: 1 });
RoomSchema.index({ branchId: 1, roomType: 1 });
RoomSchema.index({ currentBookingId: 1 });
RoomSchema.index({ qrCode: 1 }, { unique: true });

// Transform output
RoomSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

