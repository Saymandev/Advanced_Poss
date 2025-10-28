import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CompaniesService } from '../modules/companies/companies.service';

async function checkCompanyData() {
  console.log('🔍 Checking company data in database...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const companiesService = app.get(CompaniesService);

  try {
    // Check all companies
    console.log('\n📊 All companies in database:');
    const allCompanies = await companiesService.findAll({});
    console.log(`Found ${allCompanies.length} companies:`);
    
    allCompanies.forEach((company: any, index: number) => {
      console.log(`   ${index + 1}. ${company.name} - ${company.email} (${company._id})`);
    });

    // Check specifically for pos@restaurant.com
    console.log('\n🔍 Looking for pos@restaurant.com...');
    const posCompany = await companiesService.findByEmail('pos@restaurant.com');
    
    if (posCompany) {
      console.log('✅ Found company with pos@restaurant.com:');
      console.log(`   Name: ${posCompany.name}`);
      console.log(`   Email: ${posCompany.email}`);
      console.log(`   ID: ${(posCompany as any)._id}`);
    } else {
      console.log('❌ No company found with pos@restaurant.com');
      console.log('This is why you get "No restaurant found with this email"');
    }

    // Check for any company with "pos" in the email
    console.log('\n🔍 Looking for any company with "pos" in email...');
    const posCompanies = allCompanies.filter((c: any) => c.email.includes('pos'));
    if (posCompanies.length > 0) {
      console.log('Found companies with "pos" in email:');
      posCompanies.forEach((company: any) => {
        console.log(`   - ${company.name} - ${company.email}`);
      });
    } else {
      console.log('No companies found with "pos" in email');
    }

  } catch (error) {
    console.error('❌ Error checking company data:', error);
  } finally {
    await app.close();
  }
}

checkCompanyData()
  .then(() => {
    console.log('✅ Company data check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Company data check failed:', error);
    process.exit(1);
  });
