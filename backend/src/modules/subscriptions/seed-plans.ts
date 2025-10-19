import { Model } from 'mongoose';
import {
    SubscriptionPlanConfig,
    SubscriptionPlanDocument,
} from './schemas/subscription-plan.schema';
import { SubscriptionPlan } from './schemas/subscription.schema';

export async function seedSubscriptionPlans(
  planModel: Model<SubscriptionPlanDocument>,
) {
  // Check if plans already exist
  const existingPlans = await planModel.countDocuments();
  if (existingPlans > 0) {
    console.log('Subscription plans already seeded');
    return;
  }

  const plans: Partial<SubscriptionPlanConfig>[] = [
    {
      plan: SubscriptionPlan.FREE,
      name: 'Free Trial',
      description: 'Perfect for testing the system',
      pricing: {
        monthly: 0,
        quarterly: 0,
        yearly: 0,
      },
      currency: 'USD',
      limits: {
        maxBranches: 1,
        maxUsers: 5,
        maxMenuItems: 50,
        maxOrders: 100,
        maxTables: 10,
        maxCustomers: 100,
        aiInsightsEnabled: false,
        advancedReportsEnabled: false,
        multiLocationEnabled: false,
        apiAccessEnabled: false,
        whitelabelEnabled: false,
        customDomainEnabled: false,
        prioritySupportEnabled: false,
      },
      features: [
        {
          name: 'Basic POS',
          description: 'Essential point of sale features',
          enabled: true,
          icon: 'shopping-cart',
        },
        {
          name: 'Up to 10 Tables',
          description: 'Manage up to 10 restaurant tables',
          enabled: true,
          icon: 'table',
        },
        {
          name: 'Basic Reports',
          description: 'Standard sales and inventory reports',
          enabled: true,
          icon: 'chart-bar',
        },
        {
          name: 'Email Support',
          description: '48-hour response time',
          enabled: true,
          icon: 'envelope',
        },
      ],
      trialDays: 14,
      popularityRank: 4,
      isPopular: false,
      isRecommended: false,
      isActive: true,
      isPublic: true,
    },
    {
      plan: SubscriptionPlan.BASIC,
      name: 'Basic',
      description: 'Ideal for small restaurants',
      pricing: {
        monthly: 49,
        quarterly: 132, // 10% discount
        yearly: 470, // 20% discount
      },
      currency: 'USD',
      limits: {
        maxBranches: 1,
        maxUsers: 10,
        maxMenuItems: 200,
        maxOrders: 1000,
        maxTables: 25,
        maxCustomers: 1000,
        aiInsightsEnabled: false,
        advancedReportsEnabled: true,
        multiLocationEnabled: false,
        apiAccessEnabled: false,
        whitelabelEnabled: false,
        customDomainEnabled: false,
        prioritySupportEnabled: false,
      },
      features: [
        {
          name: 'Full POS System',
          description: 'Complete point of sale with all features',
          enabled: true,
          icon: 'shopping-cart',
        },
        {
          name: 'Up to 25 Tables',
          description: 'Manage up to 25 restaurant tables',
          enabled: true,
          icon: 'table',
        },
        {
          name: 'Inventory Management',
          description: 'Track ingredients and stock levels',
          enabled: true,
          icon: 'box',
        },
        {
          name: 'Kitchen Display',
          description: 'Real-time kitchen order management',
          enabled: true,
          icon: 'utensils',
        },
        {
          name: 'Advanced Reports',
          description: 'Detailed analytics and insights',
          enabled: true,
          icon: 'chart-line',
        },
        {
          name: 'Customer Loyalty',
          description: 'Points and rewards system',
          enabled: true,
          icon: 'star',
        },
        {
          name: 'Email Support',
          description: '24-hour response time',
          enabled: true,
          icon: 'envelope',
        },
      ],
      trialDays: 14,
      popularityRank: 3,
      isPopular: false,
      isRecommended: false,
      isActive: true,
      isPublic: true,
    },
    {
      plan: SubscriptionPlan.PROFESSIONAL,
      name: 'Professional',
      description: 'Perfect for growing restaurants',
      pricing: {
        monthly: 99,
        quarterly: 267, // 10% discount
        yearly: 950, // 20% discount
      },
      currency: 'USD',
      limits: {
        maxBranches: 5,
        maxUsers: 50,
        maxMenuItems: 1000,
        maxOrders: 10000,
        maxTables: 100,
        maxCustomers: 10000,
        aiInsightsEnabled: true,
        advancedReportsEnabled: true,
        multiLocationEnabled: true,
        apiAccessEnabled: true,
        whitelabelEnabled: false,
        customDomainEnabled: false,
        prioritySupportEnabled: true,
      },
      features: [
        {
          name: 'Everything in Basic',
          description: 'All Basic plan features included',
          enabled: true,
          icon: 'check-circle',
        },
        {
          name: 'Multi-Location',
          description: 'Manage up to 5 branches',
          enabled: true,
          icon: 'map-marker-alt',
        },
        {
          name: 'Up to 100 Tables',
          description: 'Support for larger restaurants',
          enabled: true,
          icon: 'table',
        },
        {
          name: 'AI Insights',
          description: 'Predictive analytics and recommendations',
          enabled: true,
          icon: 'brain',
        },
        {
          name: 'API Access',
          description: 'Integrate with third-party systems',
          enabled: true,
          icon: 'plug',
        },
        {
          name: 'Staff Management',
          description: 'Attendance, leaves, and payroll',
          enabled: true,
          icon: 'users',
        },
        {
          name: 'Priority Support',
          description: '12-hour response time',
          enabled: true,
          icon: 'headset',
        },
      ],
      trialDays: 14,
      popularityRank: 1,
      isPopular: true,
      isRecommended: true,
      isActive: true,
      isPublic: true,
    },
    {
      plan: SubscriptionPlan.ENTERPRISE,
      name: 'Enterprise',
      description: 'For large restaurant chains',
      pricing: {
        monthly: 299,
        quarterly: 807, // 10% discount
        yearly: 2870, // 20% discount
      },
      currency: 'USD',
      limits: {
        maxBranches: -1, // Unlimited
        maxUsers: -1, // Unlimited
        maxMenuItems: -1, // Unlimited
        maxOrders: -1, // Unlimited
        maxTables: -1, // Unlimited
        maxCustomers: -1, // Unlimited
        aiInsightsEnabled: true,
        advancedReportsEnabled: true,
        multiLocationEnabled: true,
        apiAccessEnabled: true,
        whitelabelEnabled: true,
        customDomainEnabled: true,
        prioritySupportEnabled: true,
      },
      features: [
        {
          name: 'Everything in Professional',
          description: 'All Professional plan features included',
          enabled: true,
          icon: 'check-circle',
        },
        {
          name: 'Unlimited Locations',
          description: 'Manage unlimited branches',
          enabled: true,
          icon: 'infinity',
        },
        {
          name: 'Unlimited Everything',
          description: 'No limits on users, tables, orders',
          enabled: true,
          icon: 'infinity',
        },
        {
          name: 'White Label',
          description: 'Custom branding and logo',
          enabled: true,
          icon: 'palette',
        },
        {
          name: 'Custom Domain',
          description: 'Use your own domain name',
          enabled: true,
          icon: 'globe',
        },
        {
          name: 'Dedicated Support',
          description: '4-hour response time',
          enabled: true,
          icon: 'headset',
        },
        {
          name: 'Custom Integrations',
          description: 'Tailored API integrations',
          enabled: true,
          icon: 'code',
        },
        {
          name: 'Training & Onboarding',
          description: 'Personalized team training',
          enabled: true,
          icon: 'graduation-cap',
        },
      ],
      trialDays: 30,
      popularityRank: 2,
      isPopular: false,
      isRecommended: false,
      isActive: true,
      isPublic: true,
    },
  ];

  await planModel.insertMany(plans);
  console.log('Successfully seeded subscription plans');
}

