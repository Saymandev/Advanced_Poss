import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BusinessCategoryDocument = BusinessCategory & Document;

@Schema({ timestamps: true })
export class BusinessCategory {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true, unique: true, lowercase: true })
  code: string;

  @Prop({ required: true, enum: ['restaurant', 'retail'], default: 'restaurant' })
  businessType: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const BusinessCategorySchema = SchemaFactory.createForClass(BusinessCategory);

// Transform output
BusinessCategorySchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});
