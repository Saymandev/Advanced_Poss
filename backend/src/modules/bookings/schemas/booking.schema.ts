import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document;

@Schema({ timestamps: true })
export class Booking {
  @Prop({ required: true, unique: true })
  bookingNumber: string; // Auto-generated: 'HTL-YYMMDD-####'

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  // Guest Information
  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  guestId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  guestName: string;

  @Prop({ trim: true })
  guestEmail?: string;

  @Prop({ required: true, trim: true })
  guestPhone: string;

  @Prop({ trim: true })
  guestIdNumber?: string; // Passport/ID for check-in

  @Prop({ required: true, min: 1 })
  numberOfGuests: number;

  // Room Assignment
  @Prop({ type: Types.ObjectId, ref: 'Room', required: true })
  roomId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  roomNumber: string; // Denormalized for quick access

  // Booking Period
  @Prop({ required: true })
  checkInDate: Date;

  @Prop({ required: true })
  checkOutDate: Date;

  @Prop({ type: Number })
  numberOfNights: number; // Calculated

  // Pricing
  @Prop({ required: true, min: 0 })
  roomRate: number; // per night

  @Prop({ required: true, min: 0 })
  totalRoomCharges: number;

  @Prop({
    type: [
      {
        type: { type: String },
        description: { type: String },
        amount: { type: Number },
      },
    ],
    default: [],
  })
  additionalCharges?: {
    type: string; // 'breakfast', 'parking', 'late_checkout', 'extra_bed'
    description: string;
    amount: number;
  }[];

  @Prop({ default: 0, min: 0 })
  discount: number;

  @Prop({ default: 0, min: 0 })
  tax: number;

  @Prop({ default: 0, min: 0 })
  serviceCharge: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  // Payment
  @Prop({
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending',
  })
  paymentStatus: string;

  @Prop({ trim: true })
  paymentMethod?: string;

  @Prop({ type: Number, min: 0 })
  depositAmount?: number;

  @Prop({ type: Number, min: 0 })
  balanceAmount?: number;

  // Booking Status
  @Prop({
    type: String,
    enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'pending',
  })
  status: string;

  // Special Requests
  @Prop({ trim: true })
  specialRequests?: string;

  @Prop()
  arrivalTime?: Date;

  @Prop({ default: false })
  lateCheckout?: boolean;

  // Check-in/Check-out
  @Prop()
  checkedInAt?: Date;

  @Prop()
  checkedOutAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  checkedInBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  checkedOutBy?: Types.ObjectId;

  // Cancellation
  @Prop()
  cancelledAt?: Date;

  @Prop({ trim: true })
  cancellationReason?: string;

  @Prop({ type: Number, min: 0 })
  refundAmount?: number;

  // Notes
  @Prop({ trim: true })
  notes?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Indexes
BookingSchema.index({ branchId: 1, checkInDate: 1, checkOutDate: 1 });
BookingSchema.index({ roomId: 1, status: 1 });
BookingSchema.index({ guestId: 1 });
BookingSchema.index({ bookingNumber: 1 }, { unique: true });
BookingSchema.index({ status: 1, checkInDate: 1 });
BookingSchema.index({ companyId: 1, branchId: 1 });

// Transform output
BookingSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret: any) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

