const { MongoClient } = require('mongodb');
async function run() {
  const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    // Find recent orders
    const recentOrders = await db.collection('posorders').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    for (const order of recentOrders) {
      console.log(`Order ${order.orderNumber} at ${order.createdAt}`);
      for (const item of order.items) {
        if (item.name === "MoJo Complet" || item.name.includes("MoJo")) {
          console.log(`  -> Sold: ${item.name} (qty: ${item.quantity})`);
        }
      }
    }
    
    // Check ingredient usage in these orders
  } finally {
    await client.close();
  }
}
run();
