const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    const item = await db.collection('menuitems').findOne({ name: /MoJo Complet/i });
    if (!item) {
      console.log("Item 'MoJo Complet' not found.");
      return;
    }
    console.log("Found item:", item.name);
    console.log("Track Inventory:", item.trackInventory);
    console.log("Ingredients:", JSON.stringify(item.ingredients, null, 2));
    
    for (const ing of item.ingredients) {
      const ingDoc = await db.collection('ingredients').findOne({ _id: ing.ingredientId });
      console.log("Ingredient detail:", ingDoc ? ingDoc.name + " - Stock: " + ingDoc.currentStock : "Not found");
    }
    
    console.log("Variants:", JSON.stringify(item.variants, null, 2));
    console.log("Selections:", JSON.stringify(item.selections, null, 2));
  } finally {
    await client.close();
  }
}
run();
