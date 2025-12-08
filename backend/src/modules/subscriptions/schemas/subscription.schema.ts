import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SubscriptionDocument = Subscription & Document;

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  PAUSED = 'paused',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export interface SubscriptionLimits {
  maxBranches: number;
  maxUsers: number;
  maxMenuItems: number;
  maxOrders: number; // Per month
  maxTables: number;
  maxCustomers: number;
  aiInsightsEnabled: boolean;
  advancedReportsEnabled: boolean;
  multiLocationEnabled: boolean;
  apiAccessEnabled: boolean;
  whitelabelEnabled: boolean;
  customDomainEnabled: boolean;
  prioritySupportEnabled: boolean;
  storageGB?: number;
  // Public ordering system
  publicOrderingEnabled?: boolean;
  maxPublicBranches?: number;
  // Review system
  reviewsEnabled?: boolean;
  reviewModerationRequired?: boolean;
  maxReviewsPerMonth?: number;
}

export interface UsageMetrics {
  currentBranches: number;
  currentUsers: number;
  currentMenuItems: number;
  currentOrders: number; // Current billing period
  currentTables: number;
  currentCustomers: number;
  storageUsed?: number;
  lastUpdated: Date;
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, enum: SubscriptionPlan, default: SubscriptionPlan.FREE })
  plan: SubscriptionPlan;

  @Prop({ required: true, enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  status: SubscriptionStatus;

  @Prop({ required: true, enum: BillingCycle, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop()
  stripeCustomerId: string;

  @Prop()
  stripeSubscriptionId: string;

  @Prop()
  stripePriceId: string;

  @Prop()
  stripePaymentMethodId: string;

  @Prop({ type: Date })
  trialStartDate: Date;

  @Prop({ type: Date })
  trialEndDate: Date;

  @Prop({ type: Date })
  currentPeriodStart: Date;

  @Prop({ type: Date })
  currentPeriodEnd: Date;

  @Prop({ type: Date })
  cancelAt: Date;

  @Prop({ type: Date })
  cancelledAt: Date;

  @Prop()
  cancellationReason: string;

  @Prop({ type: Date })
  pausedAt: Date;

  @Prop({ type: Date })
  resumeAt: Date;

  @Prop({ type: Object, required: true })
  limits: SubscriptionLimits;

  @Prop({ type: Object, required: true })
  usage: UsageMetrics;

  @Prop({ default: true })
  autoRenew: boolean;

  @Prop({ default: 0 })
  failedPaymentAttempts: number;

  @Prop({ type: Date })
  lastPaymentDate: Date;

  @Prop({ type: Date })
  nextBillingDate: Date;

  @Prop()
  discountCode: string;

  @Prop({ default: 0 })
  discountPercent: number;

  @Prop({ type: Date })
  discountValidUntil: Date;

  @Prop({ type: [String], default: [] })
  addons: string[];

  @Prop({ default: 0 })
  addonsPrice: number;

  // Feature-based subscription: array of enabled feature keys
  @Prop({ type: [String], default: [] })
  enabledFeatures: string[]; // Feature keys from SubscriptionFeature catalog

  @Prop({ type: Object })
  metadata: Record<string, any>;

  @Prop({ default: true })
  isActive: boolean;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Indexes
SubscriptionSchema.index({ companyId: 1, status: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 });
SubscriptionSchema.index({ nextBillingDate: 1 });
SubscriptionSchema.index({ status: 1, nextBillingDate: 1 });

// Virtual for days remaining in current period
SubscriptionSchema.virtual('daysRemainingInPeriod').get(function () {
  if (!this.currentPeriodEnd) return 0;
  const now = new Date();
  const end = new Date(this.currentPeriodEnd);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for is in trial
SubscriptionSchema.virtual('isInTrial').get(function () {
  if (this.status !== SubscriptionStatus.TRIAL) return false;
  if (!this.trialEndDate) return false;
  return new Date() < new Date(this.trialEndDate);
});

// Virtual for trial days remaining
SubscriptionSchema.virtual('trialDaysRemaining').get(function () {
  if (!this.trialEndDate) return 0;
  const now = new Date();
  const end = new Date(this.trialEndDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for usage percentage
SubscriptionSchema.virtual('usagePercentage').get(function () {
  const usage = this.usage as UsageMetrics;
  const limits = this.limits as SubscriptionLimits;
  
  const metrics = [
    limits.maxBranches > 0 ? (usage.currentBranches / limits.maxBranches) * 100 : 0,
    limits.maxUsers > 0 ? (usage.currentUsers / limits.maxUsers) * 100 : 0,
    limits.maxOrders > 0 ? (usage.currentOrders / limits.maxOrders) * 100 : 0,
  ];

  return Math.max(...metrics.filter(m => m > 0));
});

// Method to check if usage limit is reached
SubscriptionSchema.methods.isLimitReached = function (limitType: keyof SubscriptionLimits): boolean {
  const usage = this.usage as UsageMetrics;
  const limits = this.limits as SubscriptionLimits;

  switch (limitType) {
    case 'maxBranches':
      return usage.currentBranches >= limits.maxBranches;
    case 'maxUsers':
      return usage.currentUsers >= limits.maxUsers;
    case 'maxMenuItems':
      return usage.currentMenuItems >= limits.maxMenuItems;
    case 'maxOrders':
      return usage.currentOrders >= limits.maxOrders;
    case 'maxTables':
      return usage.currentTables >= limits.maxTables;
    case 'maxCustomers':
      return usage.currentCustomers >= limits.maxCustomers;
    default:
      return false;
  }
};

// Method to check if feature is enabled
SubscriptionSchema.methods.isFeatureEnabled = function (feature: keyof SubscriptionLimits): boolean {
  const limits = this.limits as SubscriptionLimits;
  return limits[feature] === true;
};

// Set virtuals to be included in JSON
SubscriptionSchema.set('toJSON', { virtuals: true });
SubscriptionSchema.set('toObject', { virtuals: true });

