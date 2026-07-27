const fs = require('fs');
const file = 'frontend/src/utils/getRoleDashboard.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "    [UserRole.CASHIER.toLowerCase()]: '/dashboard/pos', // Cashiers use POS for payments\n  };",
  "    [UserRole.CASHIER.toLowerCase()]: '/dashboard/pos', // Cashiers use POS for payments\n    [UserRole.DRIVER.toLowerCase()]: '/dashboard/rider', // Drivers use Rider App\n  };"
);

fs.writeFileSync(file, content);
console.log('getRoleDashboard updated');
