const fs = require('fs');
const file = 'backend/src/modules/pos/pos.service.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("driverName: driver.name || `${(driver as any).firstName || ''} ${(driver as any).lastName || ''}`.trim(),", "driverName: (driver as any).name || `${(driver as any).firstName || ''} ${(driver as any).lastName || ''}`.trim(),");
content = content.replace("name: driver.name || `${(driver as any).firstName || ''} ${(driver as any).lastName || ''}`.trim(),", "name: (driver as any).name || `${(driver as any).firstName || ''} ${(driver as any).lastName || ''}`.trim(),");

fs.writeFileSync(file, content);
console.log('posService patched');
