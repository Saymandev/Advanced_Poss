import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { UserDocument } from '../modules/users/schemas/user.schema';

async function FIXNOW() {
  console.log('🔧 FIXING USERS NOW - DIRECT MODEL ACCESS\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Get User model
    const userModel = app.get(Model<UserDocument>);
    
    // Get all users with demo emails
    const users = await userModel.find({
      $or: [
        { email: /@demo\.com$/ },
        { email: 'user@restaurant.com' },
      ]
    }).exec();
    
    console.log(`Found ${users.length} demo users\n`);
    
    // Get all branches for demo restaurant
    const branchModel = await app.get('BranchModel');
    const branches = await branchModel.find({ 
      companyId: '68ffaa40ac2c3e6c7abb9f2d' 
    }).sort({ createdAt: -1 }).limit(1).exec();
    
    if (branches.length === 0) {
      console.log('❌ No branches found!');
      return;
    }
    
    const branchId = branches[0]._id;
    console.log(`Using branch: ${branches[0].name} (${branchId})\n`);
    
    // Update all demo users to this branch
    const result = await userModel.updateMany(
      { _id: { $in: users.map(u => u._id) } },
      { $set: { branchId: branchId } }
    );
    
    console.log(`Updated ${result.modifiedCount} users\n`);
    
    // Verify
    const branchUsers = await userModel.find({ branchId }).select('-password -pin').exec();
    
    console.log('='.repeat(60));
    console.log(`VERIFICATION: ${branchUsers.length} users in branch\n`);
    
    const roles = [...new Set(branchUsers.map(u => u.role))];
    console.log(`Available roles: ${roles.join(', ')}\n`);
    
    for (const user of branchUsers) {
      console.log(`  ✅ ${user.firstName} ${user.lastName} (${user.role}) - PIN: ${user.pin ? 'SET' : 'NOT SET'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

FIXNOW()
  .then(() => {
    console.log('\n✅ DONE - TRY LOGIN NOW!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

