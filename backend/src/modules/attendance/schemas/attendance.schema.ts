import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  checkIn: Date;

  @Prop()
  checkOut?: Date;

  @Prop({
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'on-leave'],
    default: 'present',
  })
  status: string;

  @Prop()
  workHours?: number;

  @Prop()
  overtimeHours?: number;

  @Prop()
  breakTime?: number; // in minutes

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approvedBy?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop({ default: false })
  isLate: boolean;

  @Prop()
  lateBy?: number; // in minutes

  @Prop({ default: false })
  isOvertime: boolean;

  // Location tracking
  @Prop({
    type: {
      latitude: Number,
      longitude: Number,
    },
  })
  checkInLocation?: {
    latitude: number;
    longitude: number;
  };

  @Prop({
    type: {
      latitude: Number,
      longitude: Number,
    },
  })
  checkOutLocation?: {
    latitude: number;
    longitude: number;
  };
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

// Indexes
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ branchId: 1, date: 1 });
AttendanceSchema.index({ status: 1 });
AttendanceSchema.index({ date: -1 });

// Calculate work hours on checkout
AttendanceSchema.pre('save', function (next) {
  if (this.checkOut && this.checkIn) {
    const diffMs = this.checkOut.getTime() - this.checkIn.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // Subtract break time
    const breakHours = this.breakTime ? this.breakTime / 60 : 0;
    this.workHours = Math.max(0, diffHours - breakHours);

    // Calculate overtime (assuming 8 hours standard)
    this.overtimeHours = Math.max(0, this.workHours - 8);
    this.isOvertime = this.overtimeHours > 0;
  }
  next();
});

// Transform output
AttendanceSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform`n    // @ts-ignore - Mongoose transform`n    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

