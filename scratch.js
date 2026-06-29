const { MongoClient } = require('mongodb');

async function check() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('raha_pos');
  
  const ownerRoles = await db.collection('rolepermissions').find({ role: 'owner' }).toArray();
  const withoutAi = ownerRoles.filter(r => !r.features?.includes('ai-shift-analysis'));
  
  console.log(`Total owners: ${ownerRoles.length}`);
  console.log(`Owners without ai-shift-analysis: ${withoutAi.length}`);
  
  if (withoutAi.length > 0) {
    console.log('Sample without AI:', withoutAi[0]._id, withoutAi[0].companyId);
  }
  
  await client.close();
}
check().catch(console.error);
