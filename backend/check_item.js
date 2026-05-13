const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    const item = await db.collection('menuitems').findOne({ name: /compact pack/i });
    if (!item) {
      console.log("Item 'compact pack' not found.");
      return;
    }
    console.log("Found item:", item.name);
    console.log("Track Inventory:", item.trackInventory);
    console.log("Ingredients array:", JSON.stringify(item.ingredients, null, 2));
    
    // Check if ingredient IDs are actually ObjectIds
    for (const ing of item.ingredients) {
      console.log("Ingredient ID type:", typeof ing.ingredientId, "isBuffer?", Buffer.isBuffer(ing.ingredientId), "isObjectId?", typeof ing.ingredientId === 'object' && ing.ingredientId._bsontype === 'ObjectID');
      const ingDoc = await db.collection('ingredients').findOne({ _id: ing.ingredientId });
      console.log("Found ingredient:", ingDoc ? ingDoc.name + " (stock: " + ingDoc.currentStock + ")" : "NULL");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
