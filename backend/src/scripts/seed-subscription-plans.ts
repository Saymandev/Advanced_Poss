import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SubscriptionPlansService } from '../modules/subscriptions/subscription-plans.service';

async function seedSubscriptionPlans() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const subscriptionPlansService = app.get(SubscriptionPlansService);

  try {
    console.log('🌱 Seeding subscription plans...\n');

    // Check if plans already exist
    const existingPlans = await (subscriptionPlansService as any).subscriptionPlanModel.countDocuments();
    
    if (existingPlans > 0) {
      console.log(`⚠️  Found ${existingPlans} existing plans. Updating them...\n`);
      // Delete existing plans to reinitialize
      await (subscriptionPlansService as any).subscriptionPlanModel.deleteMany({});
    }

    const plans = [
      {
        name: 'basic',
        displayName: 'MONTHLY',
        description: 'Perfect for small restaurants getting started',
        price: 1000, // ৳1,000/month
        currency: 'BDT',
        billingCycle: 'monthly',
        trialPeriod: 168, // 7 days in hours
        features: {
          pos: true,
          inventory: true,
          crm: true,
          accounting: true,
          aiInsights: false,
          multiBranch: false,
          maxUsers: 5,
          maxBranches: 1,
        },
        stripePriceId: 'price_basic_monthly',
        isActive: true,
        sortOrder: 1,
        featureList: [
          'Unlimited orders & access accounts',
          'Realtime restaurant sales status',
          'Stock, Inventory & Accounting',
          'Customer Loyalty & Discount',
          'Daily SMS & Email sales report',
          'Mobile, Tablet and any OS friendly',
          'Cloud data backup & security',
        ],
      },
      {
        name: 'premium',
        displayName: 'MONTHLY PREMIUM',
        description: 'Advanced features for growing businesses',
        price: 2000, // ৳2,000/month
        currency: 'BDT',
        billingCycle: 'monthly',
        trialPeriod: 168, // 7 days in hours
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
        stripePriceId: 'price_premium_monthly',
        isActive: true,
        sortOrder: 2,
        featureList: [
          'Everything from Monthly Basic',
          'Unlimited orders & access accounts',
          'Realtime restaurant sales status',
          'Stock, Inventory & Accounting',
          'Customer Loyalty & Discount',
          'Daily SMS & Email sales report',
          'Kitchen & Customer Display System',
          'Mobile, Tablet and any OS friendly',
          'Cloud data backup & security',
          'AI Insight and analytics',
          'Online Ordering',
          'Table Touch QR Ordering',
          'Customer Feedback System',
          'Target SMS marketing',
          'Priority 24/7 Call & Agent Support',
        ],
      },
    ];

    await (subscriptionPlansService as any).subscriptionPlanModel.insertMany(plans);

    console.log('✅ Subscription plans created successfully!\n');
    
    // Display created plans
    const createdPlans = await (subscriptionPlansService as any).subscriptionPlanModel.find({});
    createdPlans.forEach((plan: any) => {
      console.log(`📦 ${plan.displayName} (${plan.name})`);
      console.log(`   Price: ${plan.currency} ${plan.price.toLocaleString()}/${plan.billingCycle}`);
      console.log(`   Trial: ${plan.trialPeriod / 24} days`);
      console.log(`   Features: POS=${plan.features.pos}, Inventory=${plan.features.inventory}, CRM=${plan.features.crm}, AI=${plan.features.aiInsights}, Multi-Branch=${plan.features.multiBranch}`);
      console.log(`   Max Users: ${plan.features.maxUsers === -1 ? 'Unlimited' : plan.features.maxUsers}, Max Branches: ${plan.features.maxBranches === -1 ? 'Unlimited' : plan.features.maxBranches}`);
      console.log(`   Popular: ${plan.isPopular ? 'Yes' : 'No'}\n`);
    });

    console.log('✅ Demo subscription plans seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding subscription plans:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seedSubscriptionPlans()
  .then(() => {
    console.log('\n🎉 Script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });

