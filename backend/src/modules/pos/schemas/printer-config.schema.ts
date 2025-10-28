import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PrinterConfigDocument = PrinterConfig & Document;

export interface PrinterLocation {
  name: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

@Schema({ timestamps: true })
export class PrinterConfig {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, enum: ['thermal', 'laser', 'inkjet', 'network'] })
  type: string;

  @Prop({ required: true })
  width: number; // in mm

  @Prop()
  height?: number; // in mm

  @Prop()
  networkUrl?: string;

  @Prop()
  driver?: string;

  @Prop({ default: true })
  enabled: boolean;

  @Prop({ type: Object })
  location?: PrinterLocation;

  @Prop({ default: 1 })
  copies: number;

  @Prop({ enum: ['low', 'normal', 'high'], default: 'normal' })
  priority: string;

  @Prop({ default: false })
  autoPrint: boolean;

  @Prop()
  description?: string;

  @Prop({ type: Object })
  settings?: {
    paperSize?: string;
    orientation?: 'portrait' | 'landscape';
    quality?: 'draft' | 'normal' | 'high';
    colorMode?: 'monochrome' | 'color';
    duplex?: boolean;
  };

  @Prop({ type: Date })
  lastUsed?: Date;

  @Prop({ type: Date })
  lastTested?: Date;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop()
  errorMessage?: string;
}

export const PrinterConfigSchema = SchemaFactory.createForClass(PrinterConfig);
