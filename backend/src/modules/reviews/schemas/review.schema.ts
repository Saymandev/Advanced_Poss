import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'POSOrder', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId?: Types.ObjectId;

  @Prop()
  customerName?: string;

  @Prop()
  customerEmail?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  waiterId?: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  waiterRating?: number;

  @Prop({ required: true, min: 1, max: 5 })
  foodRating: number;

  @Prop({ min: 1, max: 5 })
  ambianceRating?: number;

  @Prop({ required: true, min: 1, max: 5 })
  overallRating: number;

  @Prop()
  comment?: string;

  @Prop({
    type: [
      {
        menuItemId: { type: Types.ObjectId, ref: 'MenuItem' },
        menuItemName: String,
        rating: { type: Number, min: 1, max: 5 },
        comment: String,
      },
    ],
  })
  itemReviews?: Array<{
    menuItemId: Types.ObjectId;
    menuItemName: string;
    rating: number;
    comment?: string;
  }>;

  @Prop()
  response?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  respondedBy?: Types.ObjectId;

  @Prop()
  respondedAt?: Date;

  @Prop({ default: true })
  isPublished: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ companyId: 1, branchId: 1 });
ReviewSchema.index({ customerId: 1 });
ReviewSchema.index({ orderId: 1 }, { unique: true });
ReviewSchema.index({ overallRating: 1 });
ReviewSchema.index({ waiterId: 1 });

