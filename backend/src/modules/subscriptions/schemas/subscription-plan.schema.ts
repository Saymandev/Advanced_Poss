import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionPlanDocument = SubscriptionPlan & Document;

@Schema({ timestamps: true })
export class SubscriptionPlan {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  displayName: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  price: number; // Price in BDT

  @Prop({ required: true })
  currency: string; // Always 'BDT'

  @Prop({ required: true })
  billingCycle: string; // 'monthly', 'yearly'

  @Prop({ required: true })
  trialPeriod: number; // Trial period in hours

  @Prop({
    type: Object,
    default: {
      pos: true,
      inventory: false,
      crm: false,
      accounting: false,
      aiInsights: false,
      multiBranch: false,
      maxUsers: 2,
      maxBranches: 1,
    },
  })
  features: {
    pos: boolean;
    inventory: boolean;
    crm: boolean;
    accounting: boolean;
    aiInsights: boolean;
    multiBranch: boolean;
    maxUsers: number;
    maxBranches: number;
  };

  @Prop({ required: true })
  stripePriceId: string; // Stripe price ID for payment

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isPopular?: boolean;

  @Prop({
    type: {
      maxBranches: Number,
      maxUsers: Number,
      storageGB: Number,
      maxTables: Number,
      maxMenuItems: Number,
      maxOrders: Number,
      maxCustomers: Number,
      whitelabelEnabled: Boolean,
      customDomainEnabled: Boolean,
      prioritySupportEnabled: Boolean,
    },
    default: {},
  })
  limits?: {
    maxBranches?: number;
    maxUsers?: number;
    storageGB?: number;
    maxTables?: number;
    maxMenuItems?: number;
    maxOrders?: number;
    maxCustomers?: number;
    whitelabelEnabled?: boolean;
    customDomainEnabled?: boolean;
    prioritySupportEnabled?: boolean;
  };

  @Prop({ default: 0 })
  sortOrder: number; // For display ordering

  @Prop({ type: [String], default: [] })
  featureList: string[]; // Array of feature descriptions to display
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);

// Indexes
SubscriptionPlanSchema.index({ name: 1 });
SubscriptionPlanSchema.index({ isActive: 1 });
SubscriptionPlanSchema.index({ sortOrder: 1 });

// Transform output
SubscriptionPlanSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});