import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ScheduleShiftDocument = ScheduleShift & Document;

export interface ShiftTime {
  start: string; // HH:MM format
  end: string;   // HH:MM format
}

@Schema({ timestamps: true })
export class ScheduleShift {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Branch' })
  branchId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  shiftType: 'morning' | 'afternoon' | 'evening' | 'night' | 'custom';

  @Prop({ required: true, type: Object })
  time: ShiftTime;

  @Prop({ required: true })
  position: string; // job title/position

  @Prop({ required: true, enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] })
  status: string;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;

  @Prop()
  confirmedAt?: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  cancelledBy?: Types.ObjectId;

  @Prop({ default: 0 })
  hoursWorked?: number;

  @Prop()
  breakDuration?: number; // in minutes

  @Prop({ type: [String] })
  skills?: string[];

  @Prop({ default: false })
  isOvertime?: boolean;

  @Prop()
  overtimeHours?: number;

  @Prop({ type: Object })
  location?: {
    name: string;
    address?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

export const ScheduleShiftSchema = SchemaFactory.createForClass(ScheduleShift);

// Indexes
ScheduleShiftSchema.index({ userId: 1, date: 1 });
ScheduleShiftSchema.index({ branchId: 1, date: 1 });
ScheduleShiftSchema.index({ status: 1 });
ScheduleShiftSchema.index({ shiftType: 1 });
ScheduleShiftSchema.index({ createdAt: -1 });
