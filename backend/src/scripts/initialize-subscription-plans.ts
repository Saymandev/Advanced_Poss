import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SubscriptionPlansService } from '../modules/subscriptions/subscription-plans.service';

async function initializeSubscriptionPlans() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const subscriptionPlansService = app.get(SubscriptionPlansService);

  try {
    console.log('🚀 Initializing subscription plans...');
    
    await subscriptionPlansService.initializeDefaultPlans();
    
    console.log('✅ Subscription plans initialized successfully!');
    console.log('📋 Available plans:');
    
    const plans = await subscriptionPlansService.findAll();
    plans.forEach(plan => {
      console.log(`   - ${plan.displayName}: ৳${plan.price}/${plan.billingCycle} (${plan.trialPeriod}h trial)`);
    });
    
  } catch (error) {
    console.error('❌ Error initializing subscription plans:', error);
  } finally {
    await app.close();
  }
}

initializeSubscriptionPlans();
