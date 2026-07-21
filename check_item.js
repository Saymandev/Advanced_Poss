const { MongoClient, ObjectId } = require('mongodb');
const uri = "mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('Advanced_Poss');
    const item = await db.collection('menuitems').findOne({ _id: new ObjectId('6a3d59f5585cfa47bfe933ce') });
    console.log(item);
  } catch(e) {
    console.error(e);
  } finally {
    client.close();
  }
}
run();
