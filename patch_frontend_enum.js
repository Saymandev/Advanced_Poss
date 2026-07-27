const fs = require('fs');
const file = 'frontend/src/lib/enums/user-role.enum.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "  CASHIER = 'cashier',\n}",
  "  CASHIER = 'cashier',\n  DRIVER = 'driver',\n}"
);

content = content.replace(
  "  [UserRole.CASHIER]: 'Cashier',\n};",
  "  [UserRole.CASHIER]: 'Cashier',\n  [UserRole.DRIVER]: 'Driver',\n};"
);

content = content.replace(
  "  [UserRole.CASHIER]: 'Point of sale and payment processing',\n};",
  "  [UserRole.CASHIER]: 'Point of sale and payment processing',\n  [UserRole.DRIVER]: 'Delivery and order transportation',\n};"
);

fs.writeFileSync(file, content);
console.log('Frontend enum updated');
