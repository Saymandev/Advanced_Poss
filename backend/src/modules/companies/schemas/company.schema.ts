import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompanyDocument = Company & Document;

@Schema({ timestamps: true })
export class Company {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ unique: true, sparse: true, trim: true, lowercase: true })
  slug?: string;

  @Prop({ trim: true })
  legalName?: string;

  @Prop({ trim: true })
  registrationNumber?: string;

  @Prop()
  logo?: string;

  // Contact
  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  website?: string;

  // Address
  @Prop({
    type: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
  })
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Ownership
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  // Subscription
  @Prop({
    type: String,
    enum: ['basic', 'premium', 'enterprise'],
    default: 'basic',
  })
  subscriptionPlan: string;

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'trial', 'expired'],
    default: 'trial',
  })
  subscriptionStatus: string;

  @Prop()
  subscriptionStartDate?: Date;

  @Prop()
  subscriptionEndDate?: Date;

  @Prop()
  trialEndDate?: Date;

  @Prop()
  stripeCustomerId?: string;

  // Settings
  @Prop({
    type: {
      currency: { type: String, default: 'BDT' },
      timezone: String,
      dateFormat: String,
      language: { type: String, default: 'en' },
      taxRate: Number,
      taxName: String,
      features: {
        pos: { type: Boolean, default: true },
        inventory: Boolean,
        crm: Boolean,
        accounting: Boolean,
        aiInsights: Boolean,
      },
    },
    default: {},
  })
  settings: {
    currency: string;
    timezone?: string;
    dateFormat?: string;
    language: string;
    taxRate?: number;
    taxName?: string;
    features: {
      pos: boolean;
      inventory?: boolean;
      crm?: boolean;
      accounting?: boolean;
      aiInsights?: boolean;
    };
  };

  @Prop({ default: true })
  isActive: boolean;
}

export const CompanySchema = SchemaFactory.createForClass(Company);

// Indexes
CompanySchema.index({ ownerId: 1 });
CompanySchema.index({ email: 1 });
CompanySchema.index({ slug: 1 }, { unique: true, sparse: true });
CompanySchema.index({ subscriptionStatus: 1 });

// Transform output
CompanySchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // @ts-ignore - Mongoose transform`n    // @ts-ignore - Mongoose transform`n    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

