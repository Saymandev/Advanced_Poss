import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BranchesService } from '../modules/branches/branches.service';
import { UsersService } from '../modules/users/users.service';

async function fixUsersProperly() {
  console.log('🔧 FIXING USERS PROPERLY...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const branchesService = app.get(BranchesService);

  try {
    const mongoose = (await import('mongoose')).default;
    
    // Get the LATEST Main Branch
    const allBranches = await branchesService.findByCompany('68ffaa40ac2c3e6c7abb9f2d');
    console.log(`Found ${allBranches.length} branches`);
    
    // Find the most recent Main Branch
    const mainBranch = allBranches[allBranches.length - 1];
    const branchId = (mainBranch as any)._id.toString();
    console.log(`Using branch: ${mainBranch.name} (${branchId})\n`);

    // Get users for this branch
    const branchUsers = await usersService.findByBranch(branchId);
    console.log(`Current users in branch: ${branchUsers.length}\n`);

    if (branchUsers.length === 0) {
      console.log('ASSIGNING USERS TO BRANCH...\n');
      
      // Get all demo users
      const allUsers = await usersService.findAll({ page: 1, limit: 1000 });
      const demoUsers = allUsers.users.filter((u: any) => 
        u.email.includes('@demo.com') || u.role === 'owner' || u.role === 'manager'
      );
      
      console.log(`Found ${demoUsers.length} demo users to assign\n`);
      
      for (const user of demoUsers) {
        const userId = (user as any)._id.toString();
        try {
          await usersService.update(userId, {
            branchId: branchId,
          });
          console.log(`✅ ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
        } catch (error) {
          console.log(`❌ Failed: ${user.firstName} ${user.lastName}`);
        }
      }
    }

    // Verify
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION');
    console.log('='.repeat(60) + '\n');
    
    const finalUsers = await usersService.findByBranch(branchId);
    console.log(`Branch: ${mainBranch.name}`);
    console.log(`Total users: ${finalUsers.length}`);
    
    if (finalUsers.length > 0) {
      const roles = [...new Set(finalUsers.map(u => u.role))];
      console.log(`Available roles: ${roles.join(', ')}\n`);
      
      for (const user of finalUsers) {
        console.log(`  - ${user.firstName} ${user.lastName} (${user.role}) - PIN: ${user.pin === '1234' ? '1234' : user.pin?.substring(0, 4)}`);
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

fixUsersProperly()
  .then(() => {
    console.log('\n✅ DONE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

