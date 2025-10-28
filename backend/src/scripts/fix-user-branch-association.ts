import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BranchesService } from '../modules/branches/branches.service';
import { CompaniesService } from '../modules/companies/companies.service';
import { UsersService } from '../modules/users/users.service';

async function fixUserBranchAssociation() {
  console.log('🔧 Fixing user-branch association...');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  const usersService = app.get(UsersService);
  const companiesService = app.get(CompaniesService);
  const branchesService = app.get(BranchesService);

  try {
    // Find the company
    const company: any = await companiesService.findByEmail('pos@restaurant.com');
    if (!company) {
      console.log('❌ Company not found');
      return;
    }
    console.log(`✅ Company found: ${company.name}`);

    // Find the branch
    const branches: any = await branchesService.findByCompany(company._id.toString());
    const branch = branches[0];
    if (!branch) {
      console.log('❌ Branch not found');
      return;
    }
    console.log(`✅ Branch found: ${branch.name}`);

    // Find the user
    const user: any = await usersService.findByEmail('user@restaurant.com');
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log(`✅ User found: ${user.firstName} ${user.lastName}`);

    // Update user to be associated with the correct branch
    console.log('🔧 Updating user branch association...');
    await usersService.update(user._id.toString(), {
      branchId: branch._id.toString(),
      companyId: company._id.toString(),
    });

    console.log('✅ User branch association updated!');

    // Test the findCompany method again
    console.log('\n🔍 Testing findCompany after fix...');
    const { AuthService } = await import('../modules/auth/auth.service');
    const authService = app.get(AuthService);
    const result = await authService.findCompany('pos@restaurant.com');
    
    if (result.found && result.branches && result.branches[0].availableRoles.length > 0) {
      console.log('✅ Roles now available!');
      console.log(`   Available roles: ${result.branches[0].availableRoles.join(', ')}`);
    } else {
      console.log('❌ Still no roles available');
    }

  } catch (error) {
    console.error('❌ Error fixing user-branch association:', error);
  } finally {
    await app.close();
  }
}

fixUserBranchAssociation()
  .then(() => {
    console.log('✅ User-branch association fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ User-branch association fix failed:', error);
    process.exit(1);
  });
