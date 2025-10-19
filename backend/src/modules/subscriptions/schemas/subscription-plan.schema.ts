import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BillingCycle, SubscriptionLimits, SubscriptionPlan } from './subscription.schema';

export type SubscriptionPlanDocument = SubscriptionPlanConfig & Document;

export interface PlanPricing {
  monthly: number;
  quarterly: number;
  yearly: number;
}

export interface PlanFeature {
  name: string;
  description: string;
  enabled: boolean;
  icon?: string;
}

@Schema({ timestamps: true })
export class SubscriptionPlanConfig {
  @Prop({ type: String, required: true, enum: SubscriptionPlan, unique: true })
  plan: SubscriptionPlan;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: Object, required: true })
  pricing: PlanPricing;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ type: Object, required: true })
  limits: SubscriptionLimits;

  @Prop({ type: [Object], default: [] })
  features: PlanFeature[];

  @Prop({ default: 14 })
  trialDays: number;

  @Prop()
  stripePriceIdMonthly: string;

  @Prop()
  stripePriceIdQuarterly: string;

  @Prop()
  stripePriceIdYearly: string;

  @Prop({ default: 0 })
  popularityRank: number;

  @Prop({ default: false })
  isPopular: boolean;

  @Prop({ default: false })
  isRecommended: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: true })
  isPublic: boolean;

  @Prop({ type: Object })
  metadata: Record<string, any>;
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlanConfig);

// Method to get pricing for a specific billing cycle
SubscriptionPlanSchema.methods.getPriceForCycle = function (cycle: BillingCycle): number {
  const pricing = this.pricing as PlanPricing;
  switch (cycle) {
    case BillingCycle.MONTHLY:
      return pricing.monthly;
    case BillingCycle.QUARTERLY:
      return pricing.quarterly;
    case BillingCycle.YEARLY:
      return pricing.yearly;
    default:
      return pricing.monthly;
  }
};

// Method to get Stripe price ID for a specific billing cycle
SubscriptionPlanSchema.methods.getStripePriceId = function (cycle: BillingCycle): string {
  switch (cycle) {
    case BillingCycle.MONTHLY:
      return this.stripePriceIdMonthly;
    case BillingCycle.QUARTERLY:
      return this.stripePriceIdQuarterly;
    case BillingCycle.YEARLY:
      return this.stripePriceIdYearly;
    default:
      return this.stripePriceIdMonthly;
  }
};

// Virtual for savings percentage (compared to monthly)
SubscriptionPlanSchema.virtual('savingsQuarterly').get(function () {
  const pricing = this.pricing as PlanPricing;
  if (!pricing.monthly || !pricing.quarterly) return 0;
  const monthlyTotal = pricing.monthly * 3;
  const savings = ((monthlyTotal - pricing.quarterly) / monthlyTotal) * 100;
  return Math.round(savings);
});

SubscriptionPlanSchema.virtual('savingsYearly').get(function () {
  const pricing = this.pricing as PlanPricing;
  if (!pricing.monthly || !pricing.yearly) return 0;
  const monthlyTotal = pricing.monthly * 12;
  const savings = ((monthlyTotal - pricing.yearly) / monthlyTotal) * 100;
  return Math.round(savings);
});

SubscriptionPlanSchema.set('toJSON', { virtuals: true });
SubscriptionPlanSchema.set('toObject', { virtuals: true });

