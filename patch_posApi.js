const fs = require('fs');
const file = 'frontend/src/lib/api/endpoints/posApi.ts';
let content = fs.readFileSync(file, 'utf8');

const mutationsToAdd = `
    // Update rider location (live tracking)
    updateRiderLocation: builder.mutation<any, { orderId: string; lat: number; lng: number; heading?: number; speed?: number }>({
      query: ({ orderId, ...body }) => ({
        url: \`/pos/orders/\${orderId}/rider-location\`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['POS'],
    }),

    // Update rider info
    updateRiderInfo: builder.mutation<any, { orderId: string; name?: string; phone?: string; vehicleType?: string; vehicleNumber?: string; riderId?: string }>({
      query: ({ orderId, ...body }) => ({
        url: \`/pos/orders/\${orderId}/rider-info\`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['POS'],
    }),

    // Set delivery locations
    setDeliveryLocations: builder.mutation<any, { 
      orderId: string; 
      pickupLocation?: { lat: number; lng: number; address: string };
      dropoffLocation?: { lat: number; lng: number; address: string };
      estimatedDeliveryMinutes?: number;
    }>({
      query: ({ orderId, ...body }) => ({
        url: \`/pos/orders/\${orderId}/delivery-locations\`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['POS'],
    }),

`;

// Insert after updateDeliveryStatus
const insertPos1 = content.indexOf('getWaiterActiveOrdersCount');
content = content.slice(0, insertPos1) + mutationsToAdd + content.slice(insertPos1);

// Add to exports
const exportPos = content.indexOf('} = posApi;');
const exportsToAdd = `  useUpdateRiderLocationMutation,
  useUpdateRiderInfoMutation,
  useSetDeliveryLocationsMutation,
`;
content = content.slice(0, exportPos) + exportsToAdd + content.slice(exportPos);

fs.writeFileSync(file, content);
console.log('posApi patched');
