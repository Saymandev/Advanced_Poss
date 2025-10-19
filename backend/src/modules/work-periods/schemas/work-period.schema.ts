import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WorkPeriodDocument = WorkPeriod & Document;

@Schema({ timestamps: true })
export class WorkPeriod {
  @Prop({ required: true })
  serial: number;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  startedBy: Types.ObjectId;

  @Prop()
  endTime?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  endedBy?: Types.ObjectId;

  @Prop()
  duration?: string;

  @Prop({ required: true })
  openingBalance: number;

  @Prop()
  closingBalance?: number;

  @Prop({ 
    type: String, 
    enum: ['active', 'completed'], 
    default: 'active' 
  })
  status: 'active' | 'completed';

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;
}

export const WorkPeriodSchema = SchemaFactory.createForClass(WorkPeriod);
