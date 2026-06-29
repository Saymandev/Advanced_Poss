const { MongoClient } = require('mongodb');

async function updateRoles() {
  const uri = 'mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0';
  console.log('Connecting to MongoDB Cloud...');
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    const rolePermissionsCol = db.collection('rolepermissions');
    
    // Find all owner and manager roles
    const rolesToUpdate = await rolePermissionsCol.find({
      role: { $in: ['owner', 'manager'] }
    }).toArray();
    
    console.log(`Found ${rolesToUpdate.length} owner/manager roles.`);
    
    let updatedCount = 0;
    
    for (const rp of rolesToUpdate) {
      if (!rp.features) rp.features = [];
      
      let needsUpdate = false;
      
      // Ensure they have ai-shift-analysis
      if (!rp.features.includes('ai-shift-analysis')) {
        rp.features.push('ai-shift-analysis');
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await rolePermissionsCol.updateOne(
          { _id: rp._id },
          { $set: { features: rp.features } }
        );
        updatedCount++;
      }
    }
    
    console.log(`Successfully added ai-shift-analysis to ${updatedCount} roles!`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

updateRoles();
