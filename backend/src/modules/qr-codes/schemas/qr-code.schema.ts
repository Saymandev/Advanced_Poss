import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type QRCodeDocument = QRCode & Document;

@Schema({ timestamps: true })
export class QRCode {
  @Prop({ required: true, type: MongooseSchema.Types.ObjectId, ref: 'Branch' })
  branchId: MongooseSchema.Types.ObjectId;

  @Prop({ type: Number })
  tableNumber?: number;

  @Prop({ required: true, enum: ['full', 'food', 'drinks', 'desserts'] })
  menuType: string;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  qrCodeImage: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  scanCount: number;

  @Prop({ type: Date })
  lastScanned?: Date;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const QRCodeSchema = SchemaFactory.createForClass(QRCode);

