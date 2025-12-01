import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { UserRole } from '../common/enums/user-role.enum';
import { PasswordUtil } from '../common/utils/password.util';
import { User } from '../modules/users/schemas/user.schema';
import { UsersService } from '../modules/users/users.service';

async function createSuperAdmin() {
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
    // Check if super admin already exists with this email
    const existingAdminByEmail = await usersService.findByEmail(email);
    
    if (existingAdminByEmail && existingAdminByEmail.role === UserRole.SUPER_ADMIN) {
      console.log('✅ Super Admin already exists!');
      console.log(`📧 Email: ${email}`);
      console.log(`👤 Name: ${existingAdminByEmail.firstName} ${existingAdminByEmail.lastName}`);
      console.log('\n⚠️  If you forgot the password, you can reset it or change it in the database.');
      await app.close();
      return;
    }

    // Check if any super admin exists
    const existingSuperAdmin = await userModel.findOne({ role: UserRole.SUPER_ADMIN }).exec();
    if (existingSuperAdmin) {
      console.log('⚠️  A Super Admin already exists with a different email!');
      console.log(`📧 Email: ${existingSuperAdmin.email}`);
      console.log(`👤 Name: ${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`);
      console.log('\nIf you want to create another super admin or use a different email,');
      console.log('you can modify the database directly or use the email above.');
      await app.close();
      return;
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hash(password);

    // Create super admin user directly in database (bypass company checks)
    const superAdmin = new userModel({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      firstName,
      lastName,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      isEmailVerified: true,
      // Super admin doesn't need companyId or branchId
      companyId: null,
      branchId: null,
    });

    await superAdmin.save();

    console.log('✅ Super Admin created successfully!');
    console.log('\n📋 Credentials:');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`👤 Name: ${firstName} ${lastName}`);
    console.log(`🎭 Role: ${UserRole.SUPER_ADMIN}`);
    console.log('\n🔗 Login at: http://localhost:3000/auth/super-admin');
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!');

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    console.error('Full error:', error);
    if (error.code === 11000) {
      console.log('\n⚠️  User with this email already exists.');
      console.log('   If you want to make them a super admin, update the role in the database.');
    }
  } finally {
    await app.close();
  }
}

createSuperAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

