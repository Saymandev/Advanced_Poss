import { apiSlice } from '../apiSlice';

export interface Table {
  id: string;
  number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'needs_cleaning';
  location?: string;
  qrCode?: string;
  currentOrderId?: string;
  reservationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTableRequest {
  branchId: string;
  tableNumber: string;
  capacity: number;
  location?: string;
}

export interface UpdateTableRequest extends Partial<CreateTableRequest> {
  id: string;
}

export interface Reservation {
  id: string;
  tableId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationTime: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReservationRequest {
  tableId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  partySize: number;
  reservationTime: string;
  specialRequests?: string;
}

export const tablesApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTables: builder.query<{ tables: Table[]; total: number }, any>({
      query: (params) => ({
        url: '/tables',
        params,
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        let items = [];

        // Handle array response
        if (Array.isArray(data)) {
          items = data;
        } else if (data.tables) {
          items = data.tables;
        } else if (data.items) {
          items = data.items;
        }

        return {
          tables: items.map((table: any) => ({
            id: table._id || table.id,
            number: table.tableNumber || table.number || '',
            tableNumber: table.tableNumber || table.number || '',
            capacity: table.capacity || 0,
            status: table.status || 'available',
            location: table.location,
            qrCode: table.qrCode,
            currentOrderId: table.currentOrderId,
            reservationId: table.reservationId,
            createdAt: table.createdAt || new Date().toISOString(),
            updatedAt: table.updatedAt || new Date().toISOString(),
          })) as Table[],
          total: data.total || items.length,
        };
      },
      providesTags: (result) =>
        result?.tables
          ? [...result.tables.map(({ id }) => ({ type: 'Table' as const, id })), 'Table']
          : ['Table'],
    }),
    getTableById: builder.query<Table, string>({
      query: (id) => `/tables/${id}`,
      transformResponse: (response: any) => {
        const table = response.data || response;
        return {
          id: table._id || table.id,
          number: table.tableNumber || table.number || '',
          tableNumber: table.tableNumber || table.number || '',
          capacity: table.capacity || 0,
          status: table.status || 'available',
          location: table.location,
          qrCode: table.qrCode,
          currentOrderId: table.currentOrderId,
          reservationId: table.reservationId,
          createdAt: table.createdAt || new Date().toISOString(),
          updatedAt: table.updatedAt || new Date().toISOString(),
        } as Table;
      },
      providesTags: ['Table'],
    }),
    createTable: builder.mutation<Table, CreateTableRequest>({
      query: (data) => ({
        url: '/tables',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Table'],
    }),
    updateTable: builder.mutation<Table, UpdateTableRequest>({
      query: ({ id, ...data }) => ({
        url: `/tables/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Table'],
    }),
    deleteTable: builder.mutation<void, string>({
      query: (id) => ({
        url: `/tables/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Table'],
    }),
    updateTableStatus: builder.mutation<Table, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/tables/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Table', id },
        { type: 'Table', id: 'LIST' },
        'Table', // Invalidate all table queries
        'POS', // Also invalidate POS queries that use tables
      ],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Force refetch of POS tables
          dispatch(
            tablesApi.util.invalidateTags(['Table', 'POS'])
          );
        } catch {
          // Handle error
        }
      },
    }),
    generateQRCode: builder.mutation<{ qrCode: string }, string>({
      query: (id) => ({
        url: `/tables/${id}/qr-code`,
        method: 'POST',
      }),
      invalidatesTags: ['Table'],
    }),
    getReservations: builder.query<{ reservations: Reservation[]; total: number }, any>({
      query: (params) => ({
        url: '/reservations',
        params,
      }),
      providesTags: ['Reservation'],
    }),
    createReservation: builder.mutation<Reservation, CreateReservationRequest>({
      query: (data) => ({
        url: '/reservations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Reservation', 'Table'],
    }),
    updateReservation: builder.mutation<Reservation, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/reservations/${id}`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: ['Reservation', 'Table'],
    }),
  }),
});

export const {
  useGetTablesQuery,
  useGetTableByIdQuery,
  useCreateTableMutation,
  useUpdateTableMutation,
  useDeleteTableMutation,
  useUpdateTableStatusMutation,
  useGenerateQRCodeMutation,
  useGetReservationsQuery,
  useCreateReservationMutation,
  useUpdateReservationMutation,
} = tablesApi;