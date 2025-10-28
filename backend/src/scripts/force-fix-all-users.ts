import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';

async function forceFixAllUsers() {
  console.log('🔧 FORCE FIX ALL USERS...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    // Get ALL users
    const allUsers = await usersService.findAll({ page: 1, limit: 1000 });
    console.log(`Total users in database: ${allUsers.users.length}\n`);
    
    // Demo restaurant IDs
    const companyId = '68ffaa40ac2c3e6c7abb9f2d';
    const branchId = '68ffab545bd81c57e63ce322';
    
    console.log(`Setting Company ID: ${companyId}`);
    console.log(`Setting Branch ID: ${branchId}\n`);
    
    let fixed = 0;
    for (const user of allUsers.users) {
      const userId = (user as any)._id.toString();
      
      // Update user with correct companyId and branchId
      try {
        await usersService.update(userId, {
          companyId: companyId,
          branchId: branchId,
        });
        console.log(`✅ ${user.firstName} ${user.lastName} (${user.role})`);
        fixed++;
      } catch (error: any) {
        console.log(`❌ ${user.firstName} ${user.lastName} - ${error.message}`);
      }
    }
    
    console.log(`\n✅ Fixed ${fixed} users\n`);
    
    // Verify
    const branchUsers = await usersService.findByBranch(branchId);
    console.log('='.repeat(60));
    console.log(`VERIFICATION: ${branchUsers.length} users in branch\n`);
    
    if (branchUsers.length > 0) {
      const roles = [...new Set(branchUsers.map(u => u.role))];
      console.log(`Available roles: ${roles.join(', ')}\n`);
      
      for (const user of branchUsers) {
        console.log(`  ✅ ${user.firstName} ${user.lastName} (${user.role})`);
      }
    } else {
      console.log('❌ NO USERS IN BRANCH!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

forceFixAllUsers()
  .then(() => {
    console.log('\n✅ DONE - REFRESH LOGIN PAGE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

