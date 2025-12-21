import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type POSSettingsDocument = POSSettings & Document;

export interface ReceiptSettings {
  header: string;
  footer: string;
  showLogo: boolean;
  logoUrl?: string;
  fontSize?: number;
  paperWidth?: number;
  wifi?: string;
  wifiPassword?: string;
}

export interface PrinterSettings {
  enabled: boolean;
  printerId: string;
  autoPrint: boolean;
  printerType?: 'thermal' | 'laser' | 'inkjet';
  paperSize?: '58mm' | '80mm' | 'A4';
}

@Schema({ timestamps: true })
export class POSSettings {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Branch' })
  branchId: Types.ObjectId;

  @Prop({ required: true, default: 10 })
  taxRate: number;

  @Prop({ required: true, default: 0 })
  serviceCharge: number;

  @Prop({ required: true, default: 'USD' })
  currency: string;

  @Prop({ required: true, type: Object })
  receiptSettings: ReceiptSettings;

  @Prop({ required: true, type: Object })
  printerSettings: PrinterSettings;

  @Prop({ required: true, enum: ['pay-first', 'pay-later'], default: 'pay-later' })
  defaultPaymentMode: 'pay-first' | 'pay-later';

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const POSSettingsSchema = SchemaFactory.createForClass(POSSettings);

// Indexes
POSSettingsSchema.index({ branchId: 1 }, { unique: true });
POSSettingsSchema.index({ isActive: 1 });

