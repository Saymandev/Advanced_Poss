const fs = require('fs');
const file = 'frontend/src/lib/api/endpoints/posApi.ts';
let content = fs.readFileSync(file, 'utf8');

const mutationsToAdd = `
    // Assign driver
    assignDriver: builder.mutation<any, { orderId: string; driverId: string }>({
      query: ({ orderId, driverId }) => ({
        url: \`/pos/orders/\${orderId}/assign-driver\`,
        method: 'POST',
        body: { driverId },
      }),
      invalidatesTags: ['POS'],
    }),

    // Update delivery status
    updateDeliveryStatus: builder.mutation<any, { orderId: string; status: string }>({
      query: ({ orderId, status }) => ({
        url: \`/pos/orders/\${orderId}/delivery-status\`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['POS'],
    }),
`;

// Insert after updateRiderInfo
const insertPos1 = content.indexOf('getWaiterActiveOrdersCount');
content = content.slice(0, insertPos1) + mutationsToAdd + content.slice(insertPos1);

// Add to exports
const exportPos = content.indexOf('} = posApi;');
const exportsToAdd = `  useAssignDriverMutation,
  useUpdateDeliveryStatusMutation,
`;
content = content.slice(0, exportPos) + exportsToAdd + content.slice(exportPos);

fs.writeFileSync(file, content);
console.log('posApi patched with assignDriver');
