const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log("Connected to MongoDB.");
    const db = client.db('Advanced_Poss');
    
    // Find reviews
    const reviews = await db.collection('reviews').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    
    if (reviews.length === 0) {
      console.log("No reviews found in the database.");
    } else {
      console.log(`Found ${reviews.length} recent reviews:`);
      reviews.forEach((review, index) => {
        console.log(`\n--- Review ${index + 1} ---`);
        console.log(`Customer: ${review.customerName || 'Anonymous'}`);
        console.log(`Overall Rating: ${review.overallRating}`);
        console.log(`Published: ${review.isPublished}`);
        console.log(`Created: ${review.createdAt}`);
        console.log(`Items Reviewed:`);
        if (review.itemReviews && review.itemReviews.length > 0) {
          review.itemReviews.forEach(item => {
            console.log(`  - Item Name: ${item.menuItemName}`);
            console.log(`    Item ID: ${item.menuItemId}`);
            console.log(`    Rating: ${item.rating}`);
            console.log(`    Comment: ${item.comment || 'No comment'}`);
          });
        } else {
          console.log(`  (No specific items reviewed)`);
        }
      });
    }
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  } finally {
    await client.close();
  }
}
run();
