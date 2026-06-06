const mongoose = require('mongoose');
require('dotenv').config();
const { POSOrderSchema } = require('./src/modules/pos/schemas/pos-order.schema');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const POSOrderModel = mongoose.model('POSOrder', POSOrderSchema);
  
  // Use the ID of the public order we saw earlier
  const idStr = '6a23c0e2eafb5d569d177d60';
  
  const promotedPOSOrders = await POSOrderModel
    .find({ externalOrderId: { $in: [idStr] } })
    .select('externalOrderId')
    .lean()
    .exec();
    
  console.log("Result:", promotedPOSOrders);
  process.exit(0);
}
run();
