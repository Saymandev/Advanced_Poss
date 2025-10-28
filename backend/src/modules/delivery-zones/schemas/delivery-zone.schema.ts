import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeliveryZoneDocument = DeliveryZone & Document;

@Schema({ timestamps: true })
export class DeliveryZone {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true })
  deliveryCharge: number;

  @Prop({ default: 0 })
  minimumOrderAmount?: number;

  @Prop({ default: false })
  freeDeliveryAbove?: number;

  @Prop({
    type: {
      type: String,
      enum: ['polygon', 'radius'],
      default: 'polygon',
    },
    coordinates: [[Number]], // For polygon or circle center for radius
    radius: Number, // For radius type in meters
  })
  coverageArea?: {
    type: 'polygon' | 'radius';
    coordinates?: number[][];
    radius?: number;
  };

  // Area description for manual selection
  @Prop([String])
  areas?: string[]; // e.g., ['Downtown', 'Uptown', 'North Side']

  @Prop({
    type: {
      zipCodes: [String],
      neighborhoods: [String],
      landmarks: [String],
    },
  })
  deliveryAreas?: {
    zipCodes?: string[];
    neighborhoods?: string[];
    landmarks?: string[];
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const DeliveryZoneSchema = SchemaFactory.createForClass(DeliveryZone);

// Indexes
DeliveryZoneSchema.index({ companyId: 1 });
DeliveryZoneSchema.index({ branchId: 1 });
DeliveryZoneSchema.index({ companyId: 1, isActive: 1 });

// Transform output
DeliveryZoneSchema.set('toJSON', {
  virtuals: true,
  transform: function (_doc: any, ret: any) {
    ret.id = ret._id?.toString() || ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

