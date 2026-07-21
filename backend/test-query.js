const mongoose = require('mongoose');
const uri = 'mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const workPeriodId = '6a4b59e9c1befe0084a849cb';
  
  const exchangeRefunds = await db.collection('transactions').find({
    workPeriodId: new mongoose.Types.ObjectId(workPeriodId),
    category: 'REFUND',
    description: { $regex: /Exchange balance refund/i }
  }).toArray();
  
  console.log('Found:', exchangeRefunds.length);
  const total = exchangeRefunds.reduce((sum, trx) => sum + Number(trx.amount || 0), 0);
  console.log('Total:', total);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
