import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompanySettingsDocument = CompanySettings & Document;

@Schema({ timestamps: true })
export class CompanySettings {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, unique: true })
  companyId: Types.ObjectId;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ default: 'America/New_York' })
  timezone: string;

  @Prop({ default: 'MM/DD/YYYY' })
  dateFormat: string;

  @Prop({ default: '12h' })
  timeFormat: '12h' | '24h';

  @Prop({ default: 'en' })
  language: string;

  @Prop({ default: 'auto' })
  theme: 'light' | 'dark' | 'auto';

  @Prop({
    type: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
    },
    default: {
      email: true,
      sms: false,
      push: true,
    },
  })
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };

  @Prop({
    type: {
      inventory: { type: Boolean, default: true },
      kitchen: { type: Boolean, default: true },
      reports: { type: Boolean, default: true },
      analytics: { type: Boolean, default: false },
    },
    default: {
      inventory: true,
      kitchen: true,
      reports: true,
      analytics: false,
    },
  })
  features: {
    inventory: boolean;
    kitchen: boolean;
    reports: boolean;
    analytics: boolean;
  };
}

export const CompanySettingsSchema = SchemaFactory.createForClass(CompanySettings);

CompanySettingsSchema.index({ companyId: 1 }, { unique: true });

CompanySettingsSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = ret as any;
    result.id = result._id;
    delete result._id;
    delete result.__v;
    return result;
  },
});

