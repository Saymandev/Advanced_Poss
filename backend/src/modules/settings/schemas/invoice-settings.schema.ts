import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceSettingsDocument = InvoiceSettings & Document;

@Schema({ timestamps: true })
export class InvoiceSettings {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, unique: true })
  companyId: Types.ObjectId;

  @Prop({ default: 'INV' })
  invoicePrefix: string;

  @Prop({ default: 1 })
  invoiceNumber: number;

  @Prop({ default: true })
  showLogo: boolean;

  @Prop()
  logoUrl?: string;

  @Prop({ default: true })
  showAddress: boolean;

  @Prop({ default: true })
  showPhone: boolean;

  @Prop({ default: true })
  showEmail: boolean;

  @Prop({ default: false })
  showWebsite: boolean;

  @Prop()
  footerText?: string;

  @Prop()
  termsAndConditions?: string;
}

export const InvoiceSettingsSchema = SchemaFactory.createForClass(InvoiceSettings);

InvoiceSettingsSchema.index({ companyId: 1 }, { unique: true });

InvoiceSettingsSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = ret as any;
    result.id = result._id;
    delete result._id;
    delete result.__v;
    return result;
  },
});

