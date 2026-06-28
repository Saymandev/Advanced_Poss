require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const txns = await mongoose.connection.collection('transactions').find({ createdAt: { $gte: today } }).toArray();
  console.log(`Found ${txns.length} transactions today.`);
  
  if (txns.length > 0) {
    console.log('Sample transaction:', txns[0]);
  }
  
  const orders = await mongoose.connection.collection('posorders').find({ createdAt: { $gte: today } }).toArray();
  console.log(`Found ${orders.length} POS orders today.`);
  
  if (orders.length > 0) {
    console.log('Sample POS order:', orders[0]);
  }
  
  process.exit(0);
}
check().catch(console.error);
