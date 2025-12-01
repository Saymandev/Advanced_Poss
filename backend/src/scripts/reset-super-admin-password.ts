import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../common/enums/user-role.enum';
import { ConfigService } from '@nestjs/config';
import { PasswordUtil } from '../common/utils/password.util';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../modules/users/schemas/user.schema';

async function resetSuperAdminPassword() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const configService = app.get(ConfigService);
  const userModel = app.get<Model<User>>(getModelToken(User.name));

  const superAdminConfig = configService.get('superAdmin');
  const email = superAdminConfig.email || 'admin@restaurantpos.com';
  const password = superAdminConfig.password || 'Admin@123456';
  const firstName = superAdminConfig.firstName || 'Super';
  const lastName = superAdminConfig.lastName || 'Admin';

  try {
    // Find super admin by email
    let superAdmin = await usersService.findByEmail(email);
    
    if (!superAdmin) {
      // Try to find any super admin
      superAdmin = await userModel.findOne({ role: UserRole.SUPER_ADMIN }).exec() as any;
      
      if (!superAdmin) {
        console.log('❌ No super admin found. Creating new one...');
        
        // Create new super admin
        const hashedPassword = await PasswordUtil.hash(password);
        superAdmin = new userModel({
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          firstName,
          lastName,
          role: UserRole.SUPER_ADMIN,
          isActive: true,
          isEmailVerified: true,
          companyId: null,
          branchId: null,
        });
        await superAdmin.save();
        
        console.log('✅ Super Admin created successfully!');
        console.log('\n📋 Credentials:');
        console.log(`📧 Email: ${superAdmin.email}`);
        console.log(`🔑 Password: ${password}`);
        console.log('\n🔗 Login at: http://localhost:3000/auth/super-admin');
        await app.close();
        return;
      } else {
        console.log(`⚠️  Super Admin exists with different email: ${superAdmin.email}`);
        console.log('   Resetting password for this account...');
      }
    } else if (superAdmin.role !== UserRole.SUPER_ADMIN) {
      console.log(`⚠️  User with email ${email} exists but is not a super admin.`);
      console.log(`   Current role: ${superAdmin.role}`);
      console.log('   Updating role to super_admin and resetting password...');
      
      // Update role to super admin
      await userModel.findByIdAndUpdate(superAdmin.id, {
        role: UserRole.SUPER_ADMIN,
        companyId: null,
        branchId: null,
      }).exec();
    }

    // Reset password
    console.log(`\n🔄 Resetting password for: ${superAdmin.email}`);
    const hashedPassword = await PasswordUtil.hash(password);
    
    await userModel.findByIdAndUpdate(superAdmin.id, {
      password: hashedPassword,
      isActive: true,
      isEmailVerified: true,
      loginAttempts: 0,
      lockUntil: null,
    }).exec();

    console.log('✅ Password reset successfully!');
    console.log('\n📋 Updated Credentials:');
    console.log(`📧 Email: ${superAdmin.email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name: ${superAdmin.firstName} ${superAdmin.lastName}`);
    console.log(`🎭 Role: ${UserRole.SUPER_ADMIN}`);
    console.log('\n🔗 Login at: http://localhost:3000/auth/super-admin');
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('❌ Error resetting super admin password:', error.message);
    console.error('Full error:', error);
  } finally {
    await app.close();
  }
}

resetSuperAdminPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

