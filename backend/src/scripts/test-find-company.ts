import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../modules/auth/auth.service';

async function testFindCompany() {
  console.log('🔍 Testing findCompany method...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  try {
    // Test finding company by email
    console.log('Testing findCompany with pos@restaurant.com...');
    const result = await authService.findCompany('pos@restaurant.com');
    
    console.log('Result:', JSON.stringify(result, null, 2));
    
    if (result.found) {
      console.log('✅ Company found successfully!');
      console.log(`   Company: ${result.companyName}`);
      console.log(`   Branches: ${result.branches?.length || 0}`);
    } else {
      console.log('❌ Company not found:', result.message);
    }

  } catch (error) {
    console.error('❌ Error testing findCompany:', error);
  } finally {
    await app.close();
  }
}

testFindCompany()
  .then(() => {
    console.log('✅ FindCompany test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ FindCompany test failed:', error);
    process.exit(1);
  });
