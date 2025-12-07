import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SystemFeedbackDocument = SystemFeedback & Document;

export enum FeedbackType {
  FEEDBACK = 'feedback',
  REVIEW = 'review',
  SUGGESTION = 'suggestion',
  BUG_REPORT = 'bug_report',
}

@Schema({ timestamps: true })
export class SystemFeedback {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({
    type: String,
    enum: FeedbackType,
    default: FeedbackType.FEEDBACK,
  })
  type: FeedbackType;

  @Prop({ required: true })
  rating: number; // 1-5 stars

  @Prop()
  title?: string;

  @Prop({ required: true })
  message: string;

  @Prop([String])
  categories?: string[]; // e.g., ['ui', 'performance', 'features']

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop({ default: true })
  isPublic: boolean; // Can be shown as testimonial if true

  @Prop({ default: false })
  isResolved: boolean;

  @Prop()
  response?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  respondedBy?: Types.ObjectId;

  @Prop()
  respondedAt?: Date;

  @Prop({ default: true })
  isActive: boolean;
}

export const SystemFeedbackSchema = SchemaFactory.createForClass(SystemFeedback);

// Indexes
SystemFeedbackSchema.index({ userId: 1, companyId: 1 });
SystemFeedbackSchema.index({ type: 1, isPublic: 1, rating: -1 });
SystemFeedbackSchema.index({ createdAt: -1 });

