const { MongoClient, ObjectId } = require('mongodb');
const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    const reviews = await db.collection('reviews').find({ 'itemReviews.menuItemId': new ObjectId('6a3d59f5585cfa47bfe933ce') }).toArray();
    
    const itemReview = reviews[0].itemReviews[0];
    console.log("menuItemId type:", typeof itemReview.menuItemId);
    console.log("Is ObjectId?", itemReview.menuItemId instanceof ObjectId);
    console.log("toString:", itemReview.menuItemId.toString());
  } catch(e) {
    console.error(e);
  } finally {
    client.close();
  }
}
run();
