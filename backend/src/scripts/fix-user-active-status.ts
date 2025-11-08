import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { User, UserDocument } from '../modules/users/schemas/user.schema';

async function fixUserActiveStatus() {
  console.log('🔧 Fixing user isActive status...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Wait a bit for modules to initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
    
    // Find all demo users
    const users = await userModel.find({
      $or: [
        { email: /@demo\.com$/ },
        { email: /@pizzapalace\.com$/ },
        { isActive: false }
      ]
    }).exec();
    
    console.log(`Found ${users.length} users to check\n`);
    
    // Update all users to isActive: true
    let updatedCount = 0;
    for (const user of users) {
      if (!user.isActive) {
        user.isActive = true;
        await user.save();
        updatedCount++;
        console.log(`✅ Activated: ${user.email}`);
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} users to isActive: true\n`);
    
    // Verify
    const inactiveUsers = await userModel.find({ 
      $or: [
        { email: /@demo\.com$/ },
        { email: /@pizzapalace\.com$/ }
      ],
      isActive: false 
    }).exec();
    
    if (inactiveUsers.length === 0) {
      console.log('✅ All demo users are now active!\n');
    } else {
      console.log(`⚠️  Still ${inactiveUsers.length} inactive users:\n`);
      inactiveUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.firstName} ${u.lastName})`);
      });
    }
    
    // Show all demo users status
    const demoUsers = await userModel.find({
      $or: [
        { email: /@demo\.com$/ },
        { email: /@pizzapalace\.com$/ }
      ]
    }).exec();
    
    console.log('\n' + '='.repeat(60));
    console.log('Demo Users Status:\n');
    demoUsers.forEach(u => {
      console.log(`  ${u.isActive ? '✅' : '❌'} ${u.email} - isActive: ${u.isActive}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('Stack:', error.stack);
  } finally {
    await app.close();
    process.exit(0);
  }
}

fixUserActiveStatus();

