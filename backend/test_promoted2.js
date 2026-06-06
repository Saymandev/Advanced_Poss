const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  const idStr = '6a23c0e2eafb5d569d177d60';
  
  const promotedPOSOrders = await db.collection('posorders')
    .find({ externalOrderId: { $in: [idStr] } })
    .toArray();
    
  console.log("Result:", promotedPOSOrders);
  process.exit(0);
}
run();
