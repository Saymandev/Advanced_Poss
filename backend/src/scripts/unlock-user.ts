import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';

async function unlockUser() {
  console.log('🔓 Unlocking user account...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const usersService = app.get(UsersService);
    
    const email = process.argv[2] || 'owner@restaurant.com';
    
    const user = await usersService.findByEmail(email);
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    // Reset login attempts and unlock
    // @ts-ignore - Mongoose virtual property
    await usersService.update(user.id, {
      loginAttempts: 0,
      lockUntil: null,
    } as any);

    console.log(`✅ Successfully unlocked: ${email}`);
    console.log('You can now login!');

  } catch (error) {
    console.error('❌ Error unlocking user:', error);
    throw error;
  } finally {
    await app.close();
  }
}

unlockUser()
  .then(() => {
    console.log('👋 Unlock complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Unlock failed:', error);
    process.exit(1);
  });

