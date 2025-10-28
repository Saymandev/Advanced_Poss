import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function directMongooseFix() {
  console.log('🔧 Direct Mongoose Fix - No Service Layer\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const mongoose = (await import('mongoose')).default;
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get latest Main Branch
    const branches = await mongoose.connection.db
      .collection('branches')
      .find({ companyId: '68ffaa40ac2c3e6c7abb9f2d' })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    
    if (branches.length === 0) {
      console.log('❌ No branches found!');
      return;
    }
    
    const branchId = branches[0]._id.toString();
    console.log(`Using branch: ${branches[0].name} (${branchId})\n`);
    
    // Get demo users
    const users = await mongoose.connection.db
      .collection('users')
      .find({
        $or: [
          { email: /@demo\.com$/ },
          { email: 'user@restaurant.com' },
          { email: /@pizzapalace\.com$/ }
        ]
      })
      .toArray();
    
    console.log(`Found ${users.length} demo users\n`);
    
    // Update all users to this branch
    const userObjIds = users.map(u => u._id);
    const { ObjectId } = mongoose.Types;
    const result = await mongoose.connection.db
      .collection('users')
      .updateMany(
        { _id: { $in: userObjIds } },
        { $set: { branchId: new ObjectId(branchId) } }
      );
    
    console.log(`Updated ${result.modifiedCount} users\n`);
    
    // Verify
    const branchUsers = await mongoose.connection.db
      .collection('users')
      .find({ branchId: new ObjectId(branchId) })
      .toArray();
    
    console.log('='.repeat(60));
    console.log(`VERIFICATION: ${branchUsers.length} users in branch\n`);
    
    const roles = [...new Set(branchUsers.map(u => u.role))];
    console.log(`Available roles: ${roles.join(', ')}\n`);
    
    for (const user of branchUsers) {
      console.log(`  ✅ ${user.firstName} ${user.lastName} (${user.role})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

directMongooseFix()
  .then(() => {
    console.log('\n✅ DONE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

