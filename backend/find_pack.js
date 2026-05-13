const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    const items = await db.collection('menuitems').find({ name: /pack/i }).toArray();
    for (const item of items) {
      console.log(`Name: "${item.name}", Track: ${item.trackInventory}, Ings: ${item.ingredients ? item.ingredients.length : 0}`);
    }
    
    // Also, list all items with more than 1 ingredient to see their trackInventory
    console.log("--- Items with >1 ingredients ---");
    const multiIngItems = await db.collection('menuitems').find({ "ingredients.1": { $exists: true } }).limit(5).toArray();
    for (const item of multiIngItems) {
      console.log(`Name: "${item.name}", Track: ${item.trackInventory}, Ings: ${item.ingredients.length}`);
    }
  } finally {
    await client.close();
  }
}
run();
