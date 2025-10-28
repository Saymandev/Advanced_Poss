import { NestFactory } from '@nestjs/core';
import { Types } from 'mongoose';
import { AppModule } from '../app.module';

async function directDbUpdate() {
  console.log('🔧 DIRECT DB UPDATE - Bypassing Service Layer\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const mongoose = (await import('mongoose')).default;
    
    // Wait for connection
    for (let i = 0; i < 30; i++) {
      if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
        console.log('✅ DB Connected');
        break;
      }
      console.log(`Waiting for DB... (${i + 1}/30)`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!mongoose.connection.db) {
      console.log('❌ No DB after 15 seconds');
      return;
    }
    
    const userCollection = mongoose.connection.db.collection('users');
    const allUsers = await userCollection.find({}).toArray();
    
    console.log(`Found ${allUsers.length} users\n`);
    
    // Demo IDs
    const companyId = new Types.ObjectId('68ffaa40ac2c3e6c7abb9f2d');
    const branchId = new Types.ObjectId('68ffab545bd81c57e63ce322');
    
    // Update ALL users
    const result = await userCollection.updateMany(
      {},
      { 
        $set: { 
          companyId: companyId,
          branchId: branchId
        } 
      }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users\n`);
    
    // Verify
    const branchUsers = await userCollection.find({ branchId }).toArray();
    
    console.log('='.repeat(60));
    console.log(`VERIFICATION: ${branchUsers.length} users in branch\n`);
    
    if (branchUsers.length > 0) {
      const roles = [...new Set(branchUsers.map(u => u.role))];
      console.log(`Available roles: ${roles.join(', ')}\n`);
      
      for (const user of branchUsers) {
        console.log(`  ✅ ${user.firstName} ${user.lastName} (${user.role})`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await app.close();
  }
}

directDbUpdate()
  .then(() => {
    console.log('\n✅ DONE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

