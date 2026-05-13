const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    const items = await db.collection('menuitems').find({ "variants.0": { $exists: true } }).limit(2).toArray();
    console.log(`Found ${items.length} items with variants`);
    if (items.length > 0) {
      console.log(JSON.stringify(items[0].variants, null, 2));
    }
    const selections = await db.collection('menuitems').find({ "selections.0": { $exists: true } }).limit(2).toArray();
    console.log(`Found ${selections.length} items with selections`);
  } finally {
    await client.close();
  }
}
run();
