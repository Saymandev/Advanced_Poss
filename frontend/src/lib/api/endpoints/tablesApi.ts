import { apiSlice } from '../apiSlice';

export interface Table {
  id: string;
  number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'maintenance';
  location?: string;
  qrCode?: string;
  currentOrderId?: string;
  reservationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTableRequest {
  number: string;
  capacity: number;
  location?: string;
  status?: 'available' | 'occupied' | 'reserved' | 'maintenance';
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
      providesTags: ['Table'],
    }),
    getTableById: builder.query<Table, string>({
      query: (id) => `/tables/${id}`,
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
      invalidatesTags: ['Table'],
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