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
      stripePriceId: 'price_free_trial',
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
      stripePriceId: 'price_basic_monthly',
      isActive: true,
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
      stripePriceId: 'price_premium_monthly',
      isActive: true,
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
      stripePriceId: 'price_enterprise_monthly',
      isActive: true,
      sortOrder: 4,
    },
  ];

  await planModel.insertMany(plans);
  console.log('Subscription plans seeded successfully');
}