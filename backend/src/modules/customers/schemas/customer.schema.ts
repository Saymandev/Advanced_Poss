import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  avatar?: string;

  @Prop({
    type: String,
    enum: ['male', 'female', 'other'],
  })
  gender?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({
    type: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
  })
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Loyalty Program
  @Prop({ default: 0 })
  loyaltyPoints: number;

  @Prop({
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze',
  })
  loyaltyTier: string;

  @Prop()
  loyaltyTierSince?: Date;

  // Statistics
  @Prop({ default: 0 })
  totalOrders: number;

  @Prop({ default: 0 })
  totalSpent: number;

  @Prop({ default: 0 })
  averageOrderValue: number;

  @Prop()
  lastOrderDate?: Date;

  @Prop()
  firstOrderDate?: Date;

  // Preferences
  @Prop([String])
  favoriteItems?: string[];

  @Prop([String])
  dietaryRestrictions?: string[];

  @Prop([String])
  allergies?: string[];

  @Prop()
  preferredLanguage?: string;

  // Marketing
  @Prop({ default: true })
  emailOptIn: boolean;

  @Prop({ default: true })
  smsOptIn: boolean;

  @Prop({ default: false })
  isVIP: boolean;

  @Prop()
  vipSince?: Date;

  @Prop([String])
  tags?: string[];

  @Prop()
  notes?: string;

  // Status
  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  deactivatedAt?: Date;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// Indexes
CustomerSchema.index({ companyId: 1 });
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ companyId: 1, email: 1 }, { unique: true });
CustomerSchema.index({ companyId: 1, phone: 1 });
CustomerSchema.index({ loyaltyPoints: -1 });
CustomerSchema.index({ totalSpent: -1 });
CustomerSchema.index({ isVIP: 1 });
CustomerSchema.index({ isActive: 1 });

// Virtual for full name
CustomerSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Transform output
CustomerSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform`n    // @ts-ignore - Mongoose transform`n    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

