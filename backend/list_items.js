const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    const items = await db.collection('menuitems').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    for (const item of items) {
      console.log(`Name: "${item.name}", Track: ${item.trackInventory}, Ings: ${item.ingredients ? item.ingredients.length : 0}`);
      if (item.name.toLowerCase().includes('pack')) {
        console.log("-> Ingredients:", JSON.stringify(item.ingredients));
      }
    }
  } finally {
    await client.close();
  }
}
run();
