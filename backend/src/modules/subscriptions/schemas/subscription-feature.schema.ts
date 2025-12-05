import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SubscriptionFeatureDocument = SubscriptionFeature & Document;

/**
 * SubscriptionFeature - Catalog of available features
 * Super Admin can manage this catalog
 * Companies can select individual features from this catalog
 */
@Schema({ timestamps: true })
export class SubscriptionFeature {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  key: string; // Feature key (e.g., 'pos', 'inventory', 'ai-insights')

  @Prop({ required: true, trim: true })
  name: string; // Display name (e.g., 'POS System', 'Inventory Management')

  @Prop({ trim: true })
  description?: string; // Feature description

  @Prop({ required: true, trim: true })
  category: string; // Category (e.g., 'Orders', 'Inventory', 'AI Features')

  // Pricing
  @Prop({ required: true, default: 0 })
  basePriceMonthly: number; // Base price per month (in BDT)

  @Prop({ default: 0 })
  basePriceYearly: number; // Base price per year (in BDT) - if 0, calculated from monthly

  @Prop({ default: 0 })
  perBranchPriceMonthly?: number; // Additional price per branch per month

  @Prop({ default: 0 })
  perUserPriceMonthly?: number; // Additional price per user per month

  // Limits/Features associated with this feature
  @Prop({
    type: {
      maxBranches: Number,
      maxUsers: Number,
      maxMenuItems: Number,
      maxOrders: Number,
      maxTables: Number,
      maxCustomers: Number,
      storageGB: Number,
      // Feature flags
      allowMultiBranch: Boolean,
      allowAIInsights: Boolean,
      allowAdvancedReports: Boolean,
      allowAPI: Boolean,
      allowWhitelabel: Boolean,
    },
    default: {},
  })
  defaultLimits?: {
    maxBranches?: number;
    maxUsers?: number;
    maxMenuItems?: number;
    maxOrders?: number;
    maxTables?: number;
    maxCustomers?: number;
    storageGB?: number;
    allowMultiBranch?: boolean;
    allowAIInsights?: boolean;
    allowAdvancedReports?: boolean;
    allowAPI?: boolean;
    allowWhitelabel?: boolean;
  };

  @Prop({ default: true })
  isActive: boolean; // Is this feature available for selection

  @Prop({ default: false })
  isRequired: boolean; // Is this feature required for all companies (e.g., POS core)

  @Prop({ default: 0 })
  sortOrder: number; // Display order

  @Prop({ type: [String], default: [] })
  dependencies?: string[]; // Other feature keys this feature depends on

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>; // Additional metadata
}

export const SubscriptionFeatureSchema =
  SchemaFactory.createForClass(SubscriptionFeature);

// Indexes
SubscriptionFeatureSchema.index({ key: 1 }, { unique: true });
SubscriptionFeatureSchema.index({ category: 1 });
SubscriptionFeatureSchema.index({ isActive: 1 });
SubscriptionFeatureSchema.index({ sortOrder: 1 });

// Transform output
SubscriptionFeatureSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    (ret as any).id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

