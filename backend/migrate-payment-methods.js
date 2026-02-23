const mongoose = require('mongoose');

const PaymentMethodSchema = new mongoose.Schema({
  name: String,
  code: String,
  type: String,
  companyId: mongoose.Schema.Types.ObjectId,
  currentBalance: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  sortOrder: Number,
});

async function migrate() {
  const uri = 'mongodb+srv://Advanced_Poss:Advanced_Poss@cluster0.9c6dj6z.mongodb.net/Advanced_Poss?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(uri);

  const PM = mongoose.model('PaymentMethod', PaymentMethodSchema, 'paymentmethods');
  const Company = mongoose.model('Company', new mongoose.Schema({}, { strict: false }), 'companies');

  const companies = await Company.find({}).select('_id name').lean();
  console.log('Companies found:', companies.length);

  const defaultMethods = [
    { name: 'Cash', code: 'cash', type: 'cash', sortOrder: 1 },
    { name: 'Bkash', code: 'bkash', type: 'mobile_wallet', sortOrder: 2 },
    { name: 'Nagad', code: 'nagad', type: 'mobile_wallet', sortOrder: 3 },
    { name: 'Card', code: 'card', type: 'card', sortOrder: 4 },
  ];

  for (const company of companies) {
    console.log('\nSeeding for company:', company.name, company._id.toString());
    for (const method of defaultMethods) {
      const exists = await PM.findOne({ code: method.code, companyId: company._id });
      if (!exists) {
        await PM.create({ ...method, companyId: company._id, currentBalance: 0, isActive: true });
        console.log('  ✅ Created:', method.code);
      } else {
        console.log('  ℹ️  Already exists:', method.code, '(balance:', exists.currentBalance, ')');
      }
    }
  }

  console.log('\n✅ Migration done!');
  await mongoose.connection.close();
}

migrate().catch(console.error);
