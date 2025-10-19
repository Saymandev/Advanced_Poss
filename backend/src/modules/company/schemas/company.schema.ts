import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyDocument = Company & Document;

@Schema({ timestamps: true })
export class Company {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  companyType: string;

  @Prop({ default: 'PAY_LATER' })
  operationType: string;

  @Prop({ required: true })
  email: string;

  @Prop({ default: 'Bangladesh' })
  country: string;

  @Prop({ default: 'Asia/Dhaka (UTC+06:00)' })
  timeZone: string;

  @Prop({ default: '' })
  invoiceSubtitle: string;

  @Prop({ default: '' })
  invoiceFootnote: string;

  @Prop({ default: 'BDT' })
  invoiceCurrency: string;

  @Prop({ default: true })
  vatEnabled: boolean;

  @Prop({ default: 6 })
  vatPercentage: number;

  @Prop({ default: true })
  serviceChargeEnabled: boolean;

  @Prop({ default: 6 })
  serviceChargePercentage: number;

  @Prop({ default: true })
  kitchenControl: boolean;

  @Prop({ default: true })
  printKitchenLabel: boolean;

  @Prop({ default: true })
  invoiceLogo: boolean;

  @Prop({ default: true })
  invoiceRatingQr: boolean;

  @Prop({ default: true })
  dailyReport: boolean;

  @Prop({ default: true })
  deductStockByRecipe: boolean;

  @Prop()
  logo?: string;

  @Prop()
  onlineOrderingUrl?: string;

  @Prop()
  qrCodeUrl?: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
