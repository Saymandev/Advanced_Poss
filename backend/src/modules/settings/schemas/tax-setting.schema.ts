import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaxSettingDocument = TaxSetting & Document;

@Schema({ timestamps: true })
export class TaxSetting {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: ['percentage', 'fixed'], default: 'percentage' })
  type: 'percentage' | 'fixed';

  @Prop({ required: true })
  rate: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    required: true,
    enum: ['all', 'food', 'beverage', 'alcohol'],
    default: 'all',
  })
  appliesTo: 'all' | 'food' | 'beverage' | 'alcohol';
}

export const TaxSettingSchema = SchemaFactory.createForClass(TaxSetting);

TaxSettingSchema.index({ companyId: 1, name: 1 }, { unique: true });

TaxSettingSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = ret as any;
    result.id = result._id;
    delete result._id;
    delete result.__v;
    return result;
  },
});

