const fs = require('fs');
let c = fs.readFileSync('frontend/src/lib/api/endpoints/posApi.ts', 'utf8');

const newStr = `    getDeliveryOrders: builder.query<{ orders: DeliveryOrder[], total: number, page: number, totalPages: number }, { deliveryStatus?: string; assignedDriverId?: string; search?: string; date?: string; page?: number; limit?: number }>({
      query: (params) => ({
        url: '/pos/delivery-orders',
        params,
      }),
      providesTags: ['POS'],
      transformResponse: (response: any) => {
        const data = response.data || response;
        if (data && data.orders !== undefined) {
          return {
            ...data,
            orders: data.orders.map((order: any) => ({
              ...order,
              id: order._id || order.id,
            }))
          };
        }
        let orders = [];
        if (Array.isArray(data)) {
          orders = data;
        } else if (Array.isArray(data?.orders)) {
          orders = data.orders;
        }
        return {
          orders: orders.map((order: any) => ({
            ...order,
            id: order._id || order.id,
          })),
          total: orders.length,
          page: 1,
          totalPages: 1
        };
      },
    }),`;

// We find the start index of "getDeliveryOrders: builder.query<DeliveryOrder[],"
const startIdx = c.indexOf("getDeliveryOrders: builder.query<DeliveryOrder[],");
if (startIdx === -1) {
  console.log("Could not find start");
  process.exit(1);
}

// We find the end index of the function by looking for assignDeliveryDriver
const endIdx = c.indexOf("    // Assign driver to delivery order");
if (endIdx === -1) {
  console.log("Could not find end");
  process.exit(1);
}

const before = c.substring(0, startIdx);
const after = c.substring(endIdx);

fs.writeFileSync('frontend/src/lib/api/endpoints/posApi.ts', before + newStr + '\n\n' + after);
console.log("Success");
