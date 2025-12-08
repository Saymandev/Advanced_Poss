import { Model } from 'mongoose';
import {
  SubscriptionPlan,
  SubscriptionPlanDocument,
} from './schemas/subscription-plan.schema';

export async function seedSubscriptionPlans(
  planModel: Model<SubscriptionPlanDocument>,
) {
  const existingPlans = await planModel.countDocuments();
  if (existingPlans > 0) {
    console.log('Subscription plans already seeded');
    return;
  }

  const priceFromEnv = (key: string, fallback: string) =>
    process.env[key] && process.env[key]?.trim() !== '' ? process.env[key] : fallback;

  const plans: Partial<SubscriptionPlan>[] = [
    {
      name: 'free',
      displayName: 'Free Trial',
      description: 'Perfect for testing the system',
      price: 0,
      currency: 'BDT',
      billingCycle: 'monthly',
      trialPeriod: 12, // 12 hours
      features: {
        pos: true,
        inventory: false,
        crm: false,
        accounting: false,
        aiInsights: false,
        multiBranch: false,
        maxUsers: 2,
        maxBranches: 1,
      },
      limits: {
        storageGB: 5,
        publicOrderingEnabled: false, // Free plan: no public ordering
        maxPublicBranches: 0,
        reviewsEnabled: false, // Free plan: no reviews
      },
      featureList: [
        'POS module access',
        'Basic analytics',
        'Single branch support',
      ],
      stripePriceId: priceFromEnv('STRIPE_PRICE_FREE_MONTHLY', 'price_free_trial'),
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'basic',
      displayName: 'Basic',
      description: 'Ideal for small restaurants',
      price: 2500,
      currency: 'BDT',
      billingCycle: 'monthly',
      trialPeriod: 168, // 7 days
      features: {
        pos: true,
        inventory: true,
        crm: false,
        accounting: false,
        aiInsights: false,
        multiBranch: false,
        maxUsers: 5,
        maxBranches: 2,
      },
      limits: {
        storageGB: 15,
        maxMenuItems: 250,
        publicOrderingEnabled: true, // Basic plan: public ordering enabled
        maxPublicBranches: 1, // Basic plan: 1 public branch
        reviewsEnabled: true, // Basic plan: reviews enabled
        reviewModerationRequired: false, // Auto-publish reviews
        maxReviewsPerMonth: 50, // Basic plan: 50 reviews per month
      },
      featureList: [
        'POS + Inventory',
        'Customer CRM lite',
        'Up to 2 branches',
      ],
      stripePriceId: priceFromEnv('STRIPE_PRICE_BASIC_MONTHLY', 'price_basic_monthly'),
      isActive: true,
      isPopular: true,
      sortOrder: 2,
    },
    {
      name: 'premium',
      displayName: 'Premium',
      description: 'Perfect for growing restaurants',
      price: 5000,
      currency: 'BDT',
      billingCycle: 'monthly',
      trialPeriod: 168, // 7 days
      features: {
        pos: true,
        inventory: true,
        crm: true,
        accounting: true,
        aiInsights: false,
        multiBranch: true,
        maxUsers: 10,
        maxBranches: 5,
      },
      limits: {
        storageGB: 50,
        maxMenuItems: 500,
        maxTables: 200,
        publicOrderingEnabled: true, // Premium plan: public ordering enabled
        maxPublicBranches: 3, // Premium plan: 3 public branches
        reviewsEnabled: true, // Premium plan: reviews enabled
        reviewModerationRequired: true, // Require moderation
        maxReviewsPerMonth: 200, // Premium plan: 200 reviews per month
      },
      featureList: [
        'Advanced inventory & CRM',
        'Multi-branch management',
        'Priority support',
      ],
      stripePriceId: priceFromEnv('STRIPE_PRICE_PREMIUM_MONTHLY', 'price_premium_monthly'),
      isActive: true,
      isPopular: true,
      sortOrder: 3,
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise',
      description: 'For large restaurant chains',
      price: 10000,
      currency: 'BDT',
      billingCycle: 'monthly',
      trialPeriod: 168, // 7 days
      features: {
        pos: true,
        inventory: true,
        crm: true,
        accounting: true,
        aiInsights: true,
        multiBranch: true,
        maxUsers: -1, // Unlimited
        maxBranches: -1, // Unlimited
      },
      limits: {
        storageGB: 200,
        maxMenuItems: -1,
        maxTables: -1,
        whitelabelEnabled: true,
        prioritySupportEnabled: true,
        publicOrderingEnabled: true, // Enterprise plan: public ordering enabled
        maxPublicBranches: -1, // Enterprise plan: unlimited public branches
        reviewsEnabled: true, // Enterprise plan: reviews enabled
        reviewModerationRequired: false, // Auto-publish (can be changed)
        maxReviewsPerMonth: -1, // Enterprise plan: unlimited reviews
      },
      featureList: [
        'Unlimited everything',
        'AI insights included',
        'Dedicated success manager',
      ],
      stripePriceId: priceFromEnv('STRIPE_PRICE_ENTERPRISE_MONTHLY', 'price_enterprise_monthly'),
      isActive: true,
      sortOrder: 4,
    },
  ];

  await planModel.insertMany(plans);
  console.log('Subscription plans seeded successfully');
}