import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BranchesService } from '../modules/branches/branches.service';
import { CompaniesService } from '../modules/companies/companies.service';
import { UsersService } from '../modules/users/users.service';

async function checkCompanyBranchPosData() {
  console.log('🔍 Checking companies with branches, roles, and POS orders...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const companiesService = app.get(CompaniesService);
  const branchesService = app.get(BranchesService);
  const usersService = app.get(UsersService);

  try {
    // Get all companies
    const allCompanies = await companiesService.findAll({});
    console.log(`📊 Found ${allCompanies.length} companies in database\n`);

    let companiesWithValidData = [];

    for (const company of allCompanies) {
      console.log(`\n🏢 Company: ${company.name} (${(company as any)._id})`);
      console.log(`   Email: ${company.email}`);
      console.log(`   Phone: ${company.phone || 'N/A'}`);

      // Get branches for this company
      const branches = await branchesService.findByCompany((company as any)._id.toString());
      console.log(`   📍 Branches: ${branches.length}`);

      if (branches.length === 0) {
        console.log('   ⚠️  No branches found');
        continue;
      }

      // Check each branch
      for (const branch of branches) {
        const branchId = (branch as any)._id?.toString();
        
        if (!branchId) {
          console.log(`\n      ⚠️  Branch has no valid ID: ${branch.name}`);
          continue;
        }
        
        console.log(`\n      🏢 Branch: ${branch.name} (${branchId})`);
        console.log(`         Status: ${branch.isActive ? '✅ Active' : '❌ Inactive'}`);

        // Get users for this branch
        let branchUsers = [];
        try {
          // Validate that branchId is a valid ObjectId
          if (branchId && branchId.length === 24) {
            branchUsers = await usersService.findByBranch(branchId);
          } else {
            console.log(`         ⚠️  Invalid branch ID: ${branchId}`);
          }
        } catch (error) {
          console.log(`         ⚠️  Error fetching users: ${error.message}`);
        }
        console.log(`         👥 Users: ${branchUsers.length}`);

        if (branchUsers.length === 0) {
          console.log('         ⚠️  No users found');
          continue;
        }

        // Display users with their roles
        const rolesByUser = {};
        branchUsers.forEach((user: any) => {
          rolesByUser[user.role] = (rolesByUser[user.role] || 0) + 1;
          console.log(`            - ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
        });

        // Check for POS orders
        console.log(`\n      📦 Checking for POS orders...`);
        try {
          // We need to check if there's a POS orders collection
          const mongoose = (await import('mongoose')).default;
          const orderCount = await mongoose.connection.db
            .collection('posorders')
            .countDocuments({ branchId: (branch as any)._id });

          console.log(`         🛒 POS Orders found: ${orderCount}`);

          if (orderCount > 0) {
            companiesWithValidData.push({
              company: company.name,
              companyId: (company as any)._id,
              branch: branch.name,
              branchId: branchId,
              users: branchUsers.length,
              roles: Object.keys(rolesByUser),
              posOrders: orderCount,
            });
          }
        } catch (error) {
          console.log(`         ⚠️  Could not check POS orders: ${error.message}`);
        }
      }
    }

    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ Companies with valid data (branches + users + roles + POS orders): ${companiesWithValidData.length}`);

    if (companiesWithValidData.length > 0) {
      console.log('\n🎯 Companies with complete data:');
      companiesWithValidData.forEach((data, index) => {
        console.log(`\n${index + 1}. ${data.company}`);
        console.log(`   Branch: ${data.branch}`);
        console.log(`   Users: ${data.users}`);
        console.log(`   Roles: ${data.roles.join(', ')}`);
        console.log(`   POS Orders: ${data.posOrders}`);
      });
    } else {
      console.log('\n⚠️  No companies found with complete data (branches + users + roles + POS orders)');
    }

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await app.close();
  }
}

checkCompanyBranchPosData()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

