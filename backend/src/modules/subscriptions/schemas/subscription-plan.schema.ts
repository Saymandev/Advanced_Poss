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
  price: number; // Price amount

  @Prop({ required: true, default: 'BDT' })
  currency: string; // Currency is set from system settings (default: BDT)

  @Prop({ required: true })
  billingCycle: string; // 'monthly', 'yearly'

  @Prop({ required: true })
  trialPeriod: number; // Trial period in hours

  // Legacy features object (for backward compatibility)
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

  // New: Array of enabled feature keys from FEATURES constants
  // Super Admin can enable/disable any feature dynamically
  @Prop({ type: [String], default: [] })
  enabledFeatureKeys: string[]; // e.g., ['dashboard', 'reports', 'menu-management', 'inventory', ...]

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
      // Public ordering system
      publicOrderingEnabled: Boolean,
      maxPublicBranches: Number,
      // Review system
      reviewsEnabled: Boolean,
      reviewModerationRequired: Boolean,
      maxReviewsPerMonth: Number,
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
    // Public ordering system
    publicOrderingEnabled?: boolean; // Enable/disable public ordering pages
    maxPublicBranches?: number; // Max branches that can have public ordering pages (-1 = unlimited)
    // Review system
    reviewsEnabled?: boolean; // Enable/disable customer reviews
    reviewModerationRequired?: boolean; // Require admin approval before publishing reviews
    maxReviewsPerMonth?: number; // Max reviews per month (-1 = unlimited)
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