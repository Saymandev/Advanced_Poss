import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BranchesService } from '../modules/branches/branches.service';
import { CompaniesService } from '../modules/companies/companies.service';
import { UsersService } from '../modules/users/users.service';

async function completelyFixUsers() {
  console.log('🔧 COMPLETE FIX - Using NestJS Services\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const companiesService = app.get(CompaniesService);
  const branchesService = app.get(BranchesService);
  const usersService = app.get(UsersService);

  try {
    // Get the company
    const company = await companiesService.findByEmail('demo@restaurant.com');
    if (!company) {
      console.log('❌ Company not found!');
      return;
    }
    
    const companyId = (company as any)._id.toString();
    console.log(`Company: ${company.name} (${companyId})\n`);

    // Get all branches
    let allBranches = await branchesService.findByCompany(companyId);
    console.log(`Found ${allBranches.length} branches\n`);

    // Use the first branch
    if (allBranches.length === 0) {
      console.log('❌ No branches found!');
      return;
    }

    const branch = allBranches[allBranches.length - 1]; // Get latest
    const branchId = (branch as any)._id.toString();
    console.log(`Using branch: ${branch.name} (${branchId})\n`);

    // Get all users for this company
    const companyUsers = await usersService.findByCompany(companyId);
    console.log(`Found ${companyUsers.length} users in company\n`);

    // Update ALL company users to THIS branch
    let fixed = 0;
    for (const user of companyUsers) {
      try {
        await usersService.update((user as any)._id.toString(), {
          branchId: branchId,
        });
        fixed++;
        console.log(`  ✅ ${user.firstName} ${user.lastName} (${user.role})`);
      } catch (error: any) {
        console.log(`  ❌ ${user.firstName} ${user.lastName} - ${error.message}`);
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
        const pin = (user as any).pin || 'NOT SET';
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

completelyFixUsers()
  .then(() => {
    console.log('\n✅ DONE - REFRESH YOUR LOGIN PAGE NOW!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

