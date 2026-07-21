const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    const branches = await db.collection('branches').find({ slug: 'dhaka' }).toArray();
    console.log(`Found ${branches.length} branches with slug 'dhaka'`);
    branches.forEach(b => console.log(`Company ID: ${b.companyId}, Branch ID: ${b._id}`));
  } catch(e) {
    console.error(e);
  } finally {
    client.close();
  }
}
run();
