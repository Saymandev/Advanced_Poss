import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BranchesService } from '../modules/branches/branches.service';
import { UsersService } from '../modules/users/users.service';

async function fixUserBranchUsers() {
  console.log('🔧 Fixing users association with branches...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const branchesService = app.get(BranchesService);

  try {
    // Get all users
    const allUsers = await usersService.findAll({ page: 1, limit: 1000 });
    console.log(`📊 Found ${allUsers.users.length} total users\n`);

    // Get all branches for demo restaurant
    const branches = await branchesService.findByCompany('68ffaa40ac2c3e6c7abb9f2d'); // Demo Restaurant company ID
    console.log(`🏢 Found ${branches.length} branches\n`);

    for (const branch of branches) {
      console.log(`\n📍 Checking branch: ${branch.name}`);
      const branchId = (branch as any)._id.toString();
      
      // Get users for this branch
      const branchUsers = await usersService.findByBranch(branchId);
      console.log(`   Users in branch: ${branchUsers.length}`);

      if (branchUsers.length === 0) {
        console.log(`   ⚠️  No users found in this branch!`);
        
        // Find users without a branch or with wrong branch
        const usersToFix = allUsers.users.filter((user: any) => {
          const userBranchId = user.branchId?.toString();
          return !userBranchId || userBranchId !== branchId;
        });

        console.log(`   Found ${usersToFix.length} users to potentially assign to this branch`);
        
        // Assign first few users to this branch
        if (usersToFix.length > 0) {
          console.log(`   Assigning users to branch...`);
          for (let i = 0; i < Math.min(5, usersToFix.length); i++) {
            const user = usersToFix[i];
            try {
              await usersService.update((user as any)._id.toString(), {
                branchId: branchId,
              });
              console.log(`   ✅ Assigned: ${user.firstName} ${user.lastName} (${user.role})`);
            } catch (error) {
              console.log(`   ❌ Failed to assign: ${user.firstName} ${user.lastName}`);
            }
          }
        }
      } else {
        console.log(`   Users in this branch:`);
        branchUsers.forEach((user: any) => {
          console.log(`      - ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
        });
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ FIX COMPLETE');
    console.log('='.repeat(80));
    
    // Verify again
    for (const branch of branches) {
      const branchId = (branch as any)._id.toString();
      const branchUsers = await usersService.findByBranch(branchId);
      console.log(`\n📍 ${branch.name}: ${branchUsers.length} users`);
      if (branchUsers.length > 0) {
        console.log(`   Roles available: ${[...new Set(branchUsers.map(u => u.role))].join(', ')}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

fixUserBranchUsers()
  .then(() => {
    console.log('\n✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

