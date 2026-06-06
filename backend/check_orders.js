const mongoose = require('mongoose');
require('dotenv').config();
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const orders = await db.collection('orders').find({}).sort({createdAt: -1}).limit(5).toArray();
  const posOrders = await db.collection('posorders').find({}).sort({createdAt: -1}).limit(5).toArray();
  console.log('Orders:', orders.map(o => ({id: o._id, num: o.orderNumber, source: o.orderSource, createdAt: o.createdAt})));
  console.log('POS Orders:', posOrders.map(o => ({id: o._id, num: o.orderNumber, external: o.externalOrderId, createdAt: o.createdAt})));
  process.exit(0);
}
run();
