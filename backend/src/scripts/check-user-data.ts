import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BranchesService } from '../modules/branches/branches.service';
import { CompaniesService } from '../modules/companies/companies.service';
import { UsersService } from '../modules/users/users.service';

async function checkUserData() {
  console.log('🔍 Checking user data in database...');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  const usersService = app.get(UsersService);
  const companiesService = app.get(CompaniesService);
  const branchesService = app.get(BranchesService);

  try {
    // Check the user
    console.log('\n👤 Checking user: pos@restaurant.com');
    const user = await usersService.findByEmail('pos@restaurant.com');
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }

    console.log('✅ User found:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Company ID: ${user.companyId}`);
    console.log(`   Branch ID: ${user.branchId}`);
    console.log(`   Is Active: ${user.isActive}`);

    // Check the company
    console.log('\n📊 Checking company...');
    const company: any = await companiesService.findByEmail('pos@restaurant.com');
    if (company) {
      console.log(`✅ Company: ${company.name} (${company._id})`);
    } else {
      console.log('❌ Company not found!');
    }

    // Check the branch
    console.log('\n🏢 Checking branch...');
    const allBranches: any[] = await branchesService.findByCompany(user.companyId.toString());
    const branch = allBranches.find((b: any) => b._id.toString() === user.branchId.toString());
    if (branch) {
      console.log(`✅ Branch: ${branch.name} (${branch._id})`);
      console.log(`   Company ID: ${branch.companyId}`);
    } else {
      console.log('❌ Branch not found!');
    }

    // Check all branches for this company
    console.log('\n🏢 All branches for this company:');
    allBranches.forEach((b: any, index: number) => {
      console.log(`   ${index + 1}. ${b.name} (${b._id})`);
    });

    // Check if user's branch matches any company branch
    const userBranchExists = allBranches.some((b: any) => b._id.toString() === user.branchId.toString());
    console.log(`\n🔗 User's branch exists in company: ${userBranchExists ? '✅ YES' : '❌ NO'}`);

    if (!userBranchExists) {
      console.log('\n⚠️  ISSUE FOUND: User is assigned to a branch that does not belong to their company!');
      console.log('This is likely causing the "No roles available" error.');
    }

  } catch (error) {
    console.error('❌ Error checking user data:', error);
  } finally {
    await app.close();
  }
}

checkUserData()
  .then(() => {
    console.log('✅ User data check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ User data check failed:', error);
    process.exit(1);
  });
