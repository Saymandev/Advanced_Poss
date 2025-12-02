import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GalleryDocument = Gallery & Document;

@Schema({ timestamps: true })
export class Gallery {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ required: true })
  url: string;

  @Prop()
  publicId?: string;

  @Prop({ trim: true })
  caption?: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Number, default: 0 })
  displayOrder: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}

export const GallerySchema = SchemaFactory.createForClass(Gallery);

GallerySchema.index({ companyId: 1, isActive: 1 });
GallerySchema.index({ companyId: 1, displayOrder: 1 });

