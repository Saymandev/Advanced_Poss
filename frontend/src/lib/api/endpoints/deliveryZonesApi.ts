import { apiSlice } from '../apiSlice';

export interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  deliveryCharge: number;
  minimumOrderAmount?: number;
  freeDeliveryAbove?: number;
  areas?: string[];
  isActive: boolean;
}

export const deliveryZonesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDeliveryZonesByBranch: builder.query<DeliveryZone[], { branchId: string }>({
      query: ({ branchId }) => `/delivery-zones/branch/${branchId}`,
      transformResponse: (response: any) => {
        const data = response?.data ?? response;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.zones)) return data.zones;
        return [];
      },
    }),

    createDeliveryZone: builder.mutation<DeliveryZone, {
      companyId?: string;
      branchId?: string;
      name: string;
      description?: string;
      deliveryCharge: number;
      minimumOrderAmount?: number;
      freeDeliveryAbove?: number;
    }>({
      query: (body) => ({
        url: '/delivery-zones',
        method: 'POST',
        body,
      }),
    }),

    updateDeliveryZone: builder.mutation<DeliveryZone, {
      id: string;
      data: Partial<{
        name: string;
        description?: string;
        deliveryCharge: number;
        minimumOrderAmount?: number;
        freeDeliveryAbove?: number;
        isActive?: boolean;
      }>;
    }> ({
      query: ({ id, data }) => ({
        url: `/delivery-zones/${id}`,
        method: 'PATCH',
        body: data,
      }),
    }),

    deleteDeliveryZone: builder.mutation<void, string>({
      query: (id) => ({
        url: `/delivery-zones/${id}`,
        method: 'DELETE',
      }),
    }),
  }),
});

export const {
  useGetDeliveryZonesByBranchQuery,
  useCreateDeliveryZoneMutation,
  useUpdateDeliveryZoneMutation,
  useDeleteDeliveryZoneMutation,
} = deliveryZonesApi;


