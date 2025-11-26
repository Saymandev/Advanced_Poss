import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ServiceChargeSettingDocument = ServiceChargeSetting & Document;

@Schema({ timestamps: true })
export class ServiceChargeSetting {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  rate: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({
    required: true,
    enum: ['all', 'dine_in', 'takeout', 'delivery'],
    default: 'all',
  })
  appliesTo: 'all' | 'dine_in' | 'takeout' | 'delivery';
}

export const ServiceChargeSettingSchema =
  SchemaFactory.createForClass(ServiceChargeSetting);

ServiceChargeSettingSchema.index({ companyId: 1, name: 1 }, { unique: true });

ServiceChargeSettingSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = ret as any;
    result.id = result._id;
    delete result._id;
    delete result.__v;
    return result;
  },
});

