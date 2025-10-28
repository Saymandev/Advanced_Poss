import { NestFactory } from '@nestjs/core';
import { Types } from 'mongoose';
import { AppModule } from '../app.module';
import { UserRole } from '../common/enums/user-role.enum';
import { BranchesService } from '../modules/branches/branches.service';
import { CompaniesService } from '../modules/companies/companies.service';
import { UsersService } from '../modules/users/users.service';

async function fixAuthFlow() {
  console.log('🔧 Fixing authentication flow...');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  const usersService = app.get(UsersService);
  const companiesService = app.get(CompaniesService);
  const branchesService = app.get(BranchesService);

  try {
    // 1. Create/find company with pos@restaurant.com email
    console.log('📊 Setting up company...');
    let company: any = await companiesService.findByEmail('pos@restaurant.com');
    
    if (!company) {
      company = await companiesService.create({
        name: 'Restaurant POS Demo',
        email: 'pos@restaurant.com', // This is the company email
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
    }

    if (company && company.toObject) {
      company = company.toObject();
    }
    console.log(`✅ Company: ${company.name} (${company._id})`);

    // 2. Create branch for this company
    console.log('🏢 Setting up branch...');
    let branches: any = await branchesService.findByCompany(company._id.toString());
    let branch: any = branches[0];
    
    if (!branch) {
      branch = await branchesService.create({
        companyId: company._id.toString(),
        name: 'Main Restaurant',
        address: {
          street: '123 Restaurant Street',
          city: 'Demo City',
          state: 'DC',
          country: 'Demo Country',
          zipCode: '12345',
        },
        phone: '+1234567890',
        email: 'main@restaurant.com',
      });
    }

    if (branch && branch.toObject) {
      branch = branch.toObject();
    }
    console.log(`✅ Branch: ${branch.name} (${branch._id})`);

    // 3. Delete any existing user with pos@restaurant.com (this should be company email, not user email)
    console.log('👤 Cleaning up existing users...');
    const existingUser = await usersService.findByEmail('pos@restaurant.com');
    if (existingUser) {
      await usersService.remove(existingUser._id.toString());
      console.log('✅ Removed existing user with company email');
    }

    // 4. Create user with different email (user email, not company email)
    console.log('👤 Creating user with proper email...');
    const userData = {
      firstName: 'POS',
      lastName: 'User',
      email: 'user@restaurant.com', // User email (different from company email)
      password: 'password123',
      role: UserRole.OWNER,
      companyId: company._id.toString(),
      branchId: branch._id.toString(),
      pin: '1234',
      phone: '+1234567890',
      isActive: true,
    };

    const newUser = await usersService.create(userData);
    console.log(`✅ User created: ${newUser.firstName} ${newUser.lastName}`);
    console.log(`   User Email: ${newUser.email}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   PIN: ${newUser.pin}`);

    console.log('\n🎉 Authentication flow fixed!');
    console.log('\n🔑 Correct Login Process:');
    console.log('   1. Enter company email: pos@restaurant.com');
    console.log('   2. Select branch: Main Restaurant');
    console.log('   3. Select role: Owner');
    console.log('   4. Enter PIN: 1234');
    
    console.log('\n📱 Now the flow should work:');
    console.log('   - Company email: pos@restaurant.com');
    console.log('   - Branch: Main Restaurant');
    console.log('   - Role: Owner');
    console.log('   - PIN: 1234');

  } catch (error) {
    console.error('❌ Error fixing auth flow:', error);
  } finally {
    await app.close();
  }
}

fixAuthFlow()
  .then(() => {
    console.log('✅ Auth flow fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Auth flow fix failed:', error);
    process.exit(1);
  });
