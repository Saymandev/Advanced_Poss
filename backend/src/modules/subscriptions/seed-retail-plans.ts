/**
 * Seed retail subscription plans into the database.
 * Run: cd backend && npx ts-node src/modules/subscriptions/seed-retail-plans.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SubscriptionPlanDocument } from '../subscriptions/schemas/subscription-plan.schema';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const planModel: Model<SubscriptionPlanDocument> = app.get(
    getModelToken('SubscriptionPlan'),
  );

  const retailPlans = [
    {
      name: 'retail_starter',
      displayName: 'Retail Starter',
      description: 'Perfect for small retail stores and boutiques',
      price: 2000,
      currency: 'BDT',
      billingCycle: 'monthly',
      trialPeriod: 168,
      features: {
        pos: true,
        inventory: true,
        crm: true,
        accounting: false,
        aiInsights: false,
        multiBranch: false,
        staff: false,
        hotel: false,
        maxUsers: 3,
        maxBranches: 1,
      },
      limits: {
        storageGB: 10,
        maxMenuItems: 1000,
        maxTables: 0,
        publicOrderingEnabled: false,
        maxPublicBranches: 0,
        whitelabelEnabled: false,
      },
      featureList: [
        'Retail POS with barcode scanning',
        'Inventory & stock management',
        'Customer CRM',
        'Supplier & purchase orders',
        'Single store',
      ],
      isActive: true,
      sortOrder: 5,
      isPopular: false,
    },
    {
      name: 'retail_pro',
      displayName: 'Retail Pro',
      description: 'For growing retail stores and chains',
      price: 5000,
      currency: 'BDT',
      billingCycle: 'monthly',
      trialPeriod: 168,
      features: {
        pos: true,
        inventory: true,
        crm: true,
        accounting: true,
        aiInsights: false,
        multiBranch: true,
        staff: false,
        hotel: false,
        maxUsers: -1,
        maxBranches: -1,
      },
      limits: {
        storageGB: 50,
        maxMenuItems: -1,
        maxTables: 0,
        publicOrderingEnabled: true,
        maxPublicBranches: 3,
        whitelabelEnabled: true,
        customDomainEnabled: true,
      },
      featureList: [
        'Everything in Starter',
        'Multi-store management',
        'Accounting & reports',
        'Public online ordering',
        'Unlimited products & users',
      ],
      isActive: true,
      sortOrder: 6,
      isPopular: true,
    },
  ];

  for (const plan of retailPlans) {
    const existing = await planModel.findOne({ name: plan.name });
    if (existing) {
      console.log(`Skipping "${plan.displayName}" — already exists`);
    } else {
      await planModel.create(plan);
      console.log(`Created "${plan.displayName}"`);
    }
  }

  console.log('Retail plans seeded successfully!');
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
