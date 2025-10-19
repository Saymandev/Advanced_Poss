import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';

async function updatePassword() {
  console.log('🔑 Updating user password...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const usersService = app.get(UsersService);
    
    const email = process.argv[2] || 'owner@restaurant.com';
    const newPassword = process.argv[3] || 'Password123!';
    
    const user = await usersService.findByEmail(email);
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    // Update user with new password (UsersService.update will hash it)
    // @ts-ignore - Mongoose virtual property
    await usersService.update(user.id, {
      password: newPassword,  // Pass plain password - update method will hash it
      loginAttempts: 0,
      lockUntil: null,
    } as any);

    console.log(`✅ Successfully updated password for: ${email}`);
    console.log(`   New password: ${newPassword}`);

  } catch (error) {
    console.error('❌ Error updating password:', error);
    throw error;
  } finally {
    await app.close();
  }
}

updatePassword()
  .then(() => {
    console.log('👋 Password update complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Password update failed:', error);
    process.exit(1);
  });

