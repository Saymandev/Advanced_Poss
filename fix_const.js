const fs = require('fs');
const file = 'frontend/src/components/public/templates/ecommerce/item/EcommerceItemTemplate.tsx';
let code = fs.readFileSync(file, 'utf8');
code = code.replace('let parsed = saved ? JSON.parse(saved) : [];', 'const parsed = saved ? JSON.parse(saved) : [];');
fs.writeFileSync(file, code);
