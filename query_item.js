const { MongoClient, ObjectId } = require('mongodb');
const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    
    // Find item
    const item1 = await db.collection('menuitems').findOne({ _id: new ObjectId('6a3d553674bfc686dac8a91c') });
    console.log("Item 1 (6a3d5536...):", item1 ? item1.name : 'Not Found');

    const item2 = await db.collection('menuitems').findOne({ _id: new ObjectId('6a3d59f5585cfa47bfe933ce') });
    console.log("Item 2 (6a3d59f5...):", item2 ? item2.name : 'Not Found');

    // Check reviews for item2
    const reviews = await db.collection('reviews').find({ 'itemReviews.menuItemId': new ObjectId('6a3d59f5585cfa47bfe933ce') }).toArray();
    console.log(`\nReviews for Item 2 (${item2 ? item2.name : 'Unknown'}): ${reviews.length}`);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}
run();
