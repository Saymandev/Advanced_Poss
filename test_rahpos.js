const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    const comp = await db.collection('companies').findOne({ slug: 'rahpos' });
    console.log("Company by slug 'rahpos':", comp ? comp._id : 'NOT FOUND');
  } catch(e) {
    console.error(e);
  } finally {
    client.close();
  }
}
run();
