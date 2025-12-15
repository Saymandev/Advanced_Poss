import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { DEFAULT_CATEGORY_TYPE } from '../constants/category-types.constant';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  image?: string;

  @Prop()
  icon?: string;

  @Prop()
  color?: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    default: DEFAULT_CATEGORY_TYPE,
  })
  type: string;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Indexes
CategorySchema.index({ companyId: 1, branchId: 1 });
CategorySchema.index({ type: 1 });
CategorySchema.index({ isActive: 1 });
CategorySchema.index({ sortOrder: 1 });

// Transform output
CategorySchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform`n    // @ts-ignore - Mongoose transform`n    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

