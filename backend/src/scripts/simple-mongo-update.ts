import { MongoClient, ObjectId } from 'mongodb';

async function simpleMongoUpdate() {
  console.log('🔧 SIMPLE MONGO UPDATE\n');

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant_pos';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ DB Connected\n');
    
    const db = client.db();
    const userCollection = db.collection('users');
    
    // Get all users
    const allUsers = await userCollection.find({}).toArray();
    console.log(`Found ${allUsers.length} users\n`);
    
    // Demo IDs
    const companyId = new ObjectId('68ffaa40ac2c3e6c7abb9f2d');
    const branchId = new ObjectId('68ffab545bd81c57e63ce322');
    
    console.log(`Setting companyId: ${companyId.toString()}`);
    console.log(`Setting branchId: ${branchId.toString()}\n`);
    
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
    } else {
      console.log('❌ NO USERS IN BRANCH!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

simpleMongoUpdate()
  .then(() => {
    console.log('\n✅ DONE - REFRESH LOGIN PAGE!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

