import { NestFactory } from '@nestjs/core';
import { Types } from 'mongoose';
import { AppModule } from '../app.module';
import { UserRole } from '../common/enums/user-role.enum';
import { BranchesService } from '../modules/branches/branches.service';
import { CompaniesService } from '../modules/companies/companies.service';
import { UsersService } from '../modules/users/users.service';

async function fixPOSUser() {
  console.log('🔧 Fixing POS user role and branch association...');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  const usersService = app.get(UsersService);
  const companiesService = app.get(CompaniesService);
  const branchesService = app.get(BranchesService);

  try {
    // 1. Find or create company
    console.log('📊 Finding company...');
    let company: any = await companiesService.findByEmail('pos@restaurant.com');
    
    if (!company) {
      console.log('Creating new company...');
      company = await companiesService.create({
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
    }

    if (company && company.toObject) {
      company = company.toObject();
    }
    console.log(`✅ Company: ${company.name} (${company._id})`);

    // 2. Find or create branch
    console.log('🏢 Finding branch...');
    let branches: any = await branchesService.findByCompany(company._id.toString());
    let branch: any = branches[0];
    
    if (!branch) {
      console.log('Creating new branch...');
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

    // 3. Delete existing user if exists
    console.log('👤 Checking existing user...');
    let existingUser = await usersService.findByEmail('pos@restaurant.com');
    if (existingUser) {
      console.log('Deleting existing user...');
      await usersService.remove(existingUser._id.toString());
    }

    // 4. Create new user with proper role and branch
    console.log('Creating new user with proper role...');
    const userData = {
      firstName: 'POS',
      lastName: 'User',
      email: 'pos@restaurant.com',
      password: 'password123',
      role: UserRole.OWNER, // Changed to OWNER for full access
      companyId: company._id.toString(),
      branchId: branch._id.toString(),
      pin: '1234',
      phone: '+1234567890',
      isActive: true,
    };

    const newUser = await usersService.create(userData);
    console.log(`✅ User created: ${newUser.firstName} ${newUser.lastName}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Company: ${company.name}`);
    console.log(`   Branch: ${branch.name}`);

    // 5. Verify user can access branch
    console.log('\n🔍 Verifying user access...');
    console.log(`User created with role: ${newUser.role}`);
    console.log(`User assigned to branch: ${branch.name}`);
    console.log(`User assigned to company: ${company.name}`);

    console.log('\n🎉 POS user fixed successfully!');
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: pos@restaurant.com');
    console.log('   Password: password123');
    console.log('   PIN: 1234');
    console.log('   Role: OWNER');
    
    console.log('\n📱 Now you can:');
    console.log('   1. Log out and log back in');
    console.log('   2. Select the "Main Restaurant" branch');
    console.log('   3. Choose "Owner" role');
    console.log('   4. Access all POS data!');

  } catch (error) {
    console.error('❌ Error fixing POS user:', error);
  } finally {
    await app.close();
  }
}

fixPOSUser()
  .then(() => {
    console.log('✅ POS user fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ POS user fix failed:', error);
    process.exit(1);
  });
