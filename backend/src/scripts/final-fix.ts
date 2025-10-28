import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function finalFix() {
  console.log('🔧 FINAL FIX - Using Mongoose Connection\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const mongoose = (await import('mongoose')).default;
    
    // Wait for connection to be ready
    console.log('Waiting for connection...');
    
    // Wait longer for connection
    for (let i = 0; i < 10; i++) {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Check connection state
    console.log(`Connection state: ${mongoose.connection.readyState}`);
    
    // Get db
    const db = mongoose.connection.db;
    if (!db) {
      console.log('❌ Database connection not ready!');
      return;
    }
    
    const branchCollection = db.collection('branches');
    const allBranches = await branchCollection.find({ companyId: '68ffaa40ac2c3e6c7abb9f2d' }).toArray();
    
    allBranches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (allBranches.length === 0) {
      console.log('❌ No branches found!');
      return;
    }
    
    const branchId = allBranches[0]._id; // Get the LATEST branch
    console.log(`Using branch: ${allBranches[0].name}\n`);
    
    // Get all demo users
    const userCollection = db.collection('users');
    const users = await userCollection.find({
      $or: [
        { email: { $regex: /@demo\.com$/ } },
        { email: 'user@restaurant.com' },
      ]
    }).toArray();
    
    console.log(`Found ${users.length} demo users\n`);
    
    // Update all users to this branch
    const userIds = users.map(u => u._id);
    const result = await userCollection.updateMany(
      { _id: { $in: userIds } },
      { $set: { branchId: branchId } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users to branch\n`);
    
    // Verify
    const branchUsers = await userCollection.find({ branchId: branchId }).toArray();
    
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

finalFix()
  .then(() => {
    console.log('\n✅ DONE - REFRESH THE LOGIN PAGE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

