import mongoose from 'mongoose';

async function main() {
  await mongoose.connect('mongodb://localhost:27017/advanced_pos');
  
  const WorkPeriod = mongoose.model('WorkPeriod', new mongoose.Schema({}, { strict: false }));
  const Transaction = mongoose.model('Transaction', new mongoose.Schema({}, { strict: false }));
  const Payment = mongoose.model('POSPayment', new mongoose.Schema({}, { strict: false }));
  
  // Get latest work period
  const wp = await WorkPeriod.findOne().sort({ createdAt: -1 }).lean();
  console.log('Latest Work Period:', wp._id);
  
  const txns = await Transaction.find({ workPeriodId: wp._id }).lean();
  console.log('Transactions for WP:', txns.length);
  console.log(txns.map((t: any) => ({ id: t._id, cat: t.category, amt: t.amount, type: t.type })));
  
  const payments = await Payment.find().sort({ createdAt: -1 }).limit(10).lean();
  console.log('Latest 10 POSPayments:');
  console.log(payments.map((p: any) => ({ id: p._id, amt: p.amount, method: p.method, status: p.status })));
  
  await mongoose.disconnect();
}
main().catch(console.error);
