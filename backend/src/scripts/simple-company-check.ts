import { NestFactory } from '@nestjs/core';
import { Types } from 'mongoose';
import { AppModule } from '../app.module';
import { CompaniesService } from '../modules/companies/companies.service';

async function simpleCompanyCheck() {
  console.log('🔍 Simple company check...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const companiesService = app.get(CompaniesService);

  try {
    // Check specifically for pos@restaurant.com
    console.log('🔍 Looking for pos@restaurant.com...');
    const posCompany = await companiesService.findByEmail('pos@restaurant.com');
    
    if (posCompany) {
      console.log('✅ Found company with pos@restaurant.com:');
      console.log(`   Name: ${posCompany.name}`);
      console.log(`   Email: ${posCompany.email}`);
      console.log(`   ID: ${(posCompany as any)._id}`);
    } else {
      console.log('❌ No company found with pos@restaurant.com');
      console.log('This is why you get "No restaurant found with this email"');
      
      // Let's create the company now
      console.log('\n🔧 Creating company with pos@restaurant.com...');
      const newCompany = await companiesService.create({
        name: 'Restaurant POS Demo',
        email: 'pos@restaurant.com',
        phone: '+1234567890',
        address: {
          street: '123 Restaurant Street',
          city: 'Demo City',
          state: 'DC',
          country: 'Demo Country',
          zipCode: '12345',
        },
        website: 'https://restaurant-pos.com',
        ownerId: new Types.ObjectId().toString(),
        subscriptionPlan: 'premium',
      });
      
      console.log('✅ Company created successfully!');
      console.log(`   Name: ${newCompany.name}`);
      console.log(`   Email: ${newCompany.email}`);
      console.log(`   ID: ${(newCompany as any)._id}`);
    }

  } catch (error) {
    console.error('❌ Error checking company:', error);
  } finally {
    await app.close();
  }
}

simpleCompanyCheck()
  .then(() => {
    console.log('✅ Company check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Company check failed:', error);
    process.exit(1);
  });
