import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BranchesService } from '../modules/branches/branches.service';
import { UsersService } from '../modules/users/users.service';

async function verifyUsers() {
  console.log('🔍 VERIFYING USERS IN BRANCH...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const branchesService = app.get(BranchesService);

  try {
    // Get the latest branch
    const companyId = '68ffaa40ac2c3e6c7abb9f2d';
    const branches = await branchesService.findByCompany(companyId);
    const latestBranch = branches[branches.length - 1];
    const branchId = (latestBranch as any)._id.toString();
    
    console.log(`📊 Company: Demo Restaurant`);
    console.log(`🏢 Branch: ${latestBranch.name} (${branchId})\n`);
    
    // Get users in this branch
    const branchUsers = await usersService.findByBranch(branchId);
    
    console.log(`✅ Found ${branchUsers.length} users in branch\n`);
    
    if (branchUsers.length > 0) {
      const roles = [...new Set(branchUsers.map(u => u.role))];
      console.log(`Available roles: ${roles.join(', ')}\n`);
      
      for (const user of branchUsers) {
        console.log(`  ✅ ${user.firstName} ${user.lastName} (${user.role}) - PIN: ${user.pin ? 'SET' : 'NOT SET'}`);
      }
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ LOGIN FLOW READY!');
      console.log('='.repeat(60));
      console.log('\n📧 Step 1: Enter company email: demo@restaurant.com');
      console.log(`🏢 Step 2: Select branch: ${latestBranch.name}`);
      console.log(`👤 Step 3: Select a role: ${roles.join(', ')}`);
      console.log('🔐 Step 4: Enter PIN');
      console.log('\n✅ All users are properly associated with the branch!');
    } else {
      console.log('❌ NO USERS IN BRANCH!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

verifyUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

