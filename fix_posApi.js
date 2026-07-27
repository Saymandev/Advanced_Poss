const fs = require('fs');
const file = 'frontend/src/lib/api/endpoints/posApi.ts';
let content = fs.readFileSync(file, 'utf8');

// Fix missing comma
content = content.replace("invalidatesTags: ['POS'],\n    }),\ngetWaiterActiveOrdersCount", "invalidatesTags: ['POS'],\n    }),\n    getWaiterActiveOrdersCount");

// Fix duplicate export
content = content.replace("  useUpdateDeliveryStatusMutation,\n} = posApi;", "} = posApi;");

fs.writeFileSync(file, content);
console.log('Fixed syntax errors');
