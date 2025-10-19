import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TableDocument = Table & Document;

@Schema({ timestamps: true })
export class Table {
  @Prop({ type: Types.ObjectId, ref: 'Branch', required: true })
  branchId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  tableNumber: string;

  @Prop({ unique: true })
  qrCode: string;

  @Prop({ required: true })
  capacity: number;

  @Prop({ trim: true })
  location?: string;

  @Prop({
    type: String,
    enum: ['available', 'occupied', 'reserved', 'cleaning'],
    default: 'available',
  })
  status: string;

  // Current session
  @Prop({ type: Types.ObjectId, ref: 'Order' })
  currentOrderId?: Types.ObjectId;

  @Prop()
  occupiedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  occupiedBy?: Types.ObjectId;

  // Reservation
  @Prop()
  reservedFor?: Date;

  @Prop({
    type: {
      name: String,
      phone: String,
      partySize: Number,
    },
  })
  reservedBy?: {
    name: string;
    phone: string;
    partySize: number;
  };

  @Prop({ default: true })
  isActive: boolean;
}

export const TableSchema = SchemaFactory.createForClass(Table);

// Indexes
TableSchema.index({ branchId: 1, tableNumber: 1 }, { unique: true });
TableSchema.index({ status: 1 });
TableSchema.index({ reservedFor: 1 });
TableSchema.index({ qrCode: 1 }, { unique: true });

// Transform output
TableSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform`n    // @ts-ignore - Mongoose transform`n    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

