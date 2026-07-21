const { MongoClient, ObjectId } = require('mongodb');
const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    
    const item = await db.collection('menuitems').findOne({ _id: new ObjectId('6a3d59f5585cfa47bfe933ce') });
    console.log("Item Branch ID:", item.branchId);
    console.log("Item Company ID:", item.companyId);
    
    const reviews = await db.collection('reviews').find({ 'itemReviews.menuItemId': new ObjectId('6a3d59f5585cfa47bfe933ce') }).toArray();
    reviews.forEach((r, i) => {
      console.log(`\nReview ${i+1}:`);
      console.log(`  Published: ${r.isPublished}`);
      console.log(`  Review Branch ID: ${r.branchId}`);
      console.log(`  Review Company ID: ${r.companyId}`);
      console.log(`  Overall Rating: ${r.overallRating}`);
    });

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}
run();
