const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    const result = await db.collection('menuitems').updateMany(
      { "ingredients.0": { $exists: true } },
      { $set: { trackInventory: true } }
    );
    console.log(`Updated ${result.modifiedCount} items to trackInventory: true`);
  } finally {
    await client.close();
  }
}
run();
