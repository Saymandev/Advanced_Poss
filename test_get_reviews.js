const { MongoClient, ObjectId } = require('mongodb');
const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    
    const menuItemId = '6a3d59f5585cfa47bfe933ce';
    const branchId = '6a37fa7a289b39650e480485';
    const companyId = '6a37fa7a289b39650e480471';

    const query = {
      'itemReviews.menuItemId': new ObjectId(menuItemId),
      isPublished: true
    };
    query.branchId = new ObjectId(branchId);
    query.companyId = new ObjectId(companyId);

    const reviews = await db.collection('reviews').find(query).toArray();
    console.log(`Found ${reviews.length} reviews matching query`);

    const extractedReviews = [];
    reviews.forEach((review) => {
      if (review.itemReviews && Array.isArray(review.itemReviews)) {
        const itemReview = review.itemReviews.find((ir) => {
          const itemId = ir.menuItemId?.toString() || String(ir.menuItemId);
          console.log(`Comparing ${itemId} to ${menuItemId}. Match: ${itemId === menuItemId}`);
          return itemId === menuItemId;
        });

        if (itemReview) {
          extractedReviews.push(itemReview);
        }
      }
    });

    console.log(`Extracted reviews: ${extractedReviews.length}`);
    
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.close();
  }
}
run();
