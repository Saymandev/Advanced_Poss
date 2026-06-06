const fs = require('fs');
const file = 'backend/src/modules/public/public.service.ts';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const insertLineIndex = lines.findIndex(l => l.includes('let trackingUrl = null;'));

if (insertLineIndex !== -1) {
  const replacement = `
      // Merge real-time POS data if order was promoted
      if (orderId) {
        try {
          const posOrder = await this.orderModel.db.collection('posorders').findOne({ externalOrderId: orderId.toString() });
          if (posOrder) {
            order.status = posOrder.status === 'paid' ? 'completed' : posOrder.status;
            order.paymentStatus = posOrder.paymentStatus || order.paymentStatus;
            
            if (posOrder.paidAmount !== undefined) order.paidAmount = posOrder.paidAmount;
            if (posOrder.remainingAmount !== undefined) order.remainingAmount = posOrder.remainingAmount;

            if (posOrder.items && Array.isArray(posOrder.items) && order.items && Array.isArray(order.items)) {
              order.items = order.items.map((publicItem) => {
                const posItem = posOrder.items.find((pi) => 
                  pi.menuItemId?.toString() === publicItem.menuItemId?._id?.toString() ||
                  pi.menuItemId?.toString() === publicItem.menuItemId?.toString() ||
                  pi.name === publicItem.name
                );
                if (posItem) {
                  return { ...publicItem, status: posItem.status || publicItem.status };
                }
                return publicItem;
              });
            }
          }
        } catch (mergeError) {
          console.error('Failed to merge POS order data for public tracking:', mergeError);
        }
      }
`;
  lines.splice(insertLineIndex, 0, replacement);
  fs.writeFileSync(file, lines.join('\n'));
  console.log("Patched successfully!");
} else {
  console.log("Target not found!");
}
