const { MongoClient, ObjectId } = require('mongodb');

async function check() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    
    const company = await db.collection('companies').findOne({ _id: new ObjectId('6a37fa7a289b39650e480471') });
    console.log('Company:', company ? company.name : 'Unknown');
    
    const branch = await db.collection('branches').findOne({ _id: new ObjectId('6a37fa7a289b39650e480485') });
    console.log('Branch:', branch ? branch.name : 'Unknown');
    
  } finally {
    await client.close();
  }
}
check().catch(console.error);
