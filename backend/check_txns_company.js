require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const txns = await mongoose.connection.collection('transactions').find({ companyId: new mongoose.Types.ObjectId('6a37fa7a289b39650e480471') }).sort({ date: -1 }).limit(5).toArray();
  console.log(`Found ${txns.length} recent transactions for company.`);
  
  txns.forEach(t => {
    console.log(`- ${t.transactionNumber}: ${t.type} ${t.amount} (${t.paymentMethodId})`);
  });
  
  process.exit(0);
}
check().catch(console.error);
