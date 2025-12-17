import { apiSlice } from '../apiSlice';

export interface Room {
  id: string;
  roomNumber: string;
  roomType: 'single' | 'double' | 'suite' | 'deluxe' | 'presidential';
  floor?: number;
  building?: string;
  description?: string;
  maxOccupancy: number;
  beds?: {
    single: number;
    double: number;
    king: number;
  };
  amenities: string[];
  basePrice: number;
  seasonalPricing?: {
    startDate: string;
    endDate: string;
    price: number;
  }[];
  status: 'available' | 'occupied' | 'reserved' | 'maintenance' | 'out_of_order';
  currentBookingId?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  size?: number;
  view?: string;
  smokingAllowed: boolean;
  images: string[];
  qrCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoomRequest {
  branchId: string;
  roomNumber: string;
  roomType: 'single' | 'double' | 'suite' | 'deluxe' | 'presidential';
  floor?: number;
  building?: string;
  description?: string;
  maxOccupancy: number;
  beds?: {
    single: number;
    double: number;
    king: number;
  };
  amenities?: string[];
  basePrice: number;
  seasonalPricing?: {
    startDate: string;
    endDate: string;
    price: number;
  }[];
  size?: number;
  view?: string;
  smokingAllowed?: boolean;
  images?: string[];
}

export interface UpdateRoomRequest extends Partial<CreateRoomRequest> {
  id: string;
}

export interface RoomStats {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  outOfOrder: number;
  occupancyRate: number;
}

export const roomsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getRooms: builder.query<{ rooms: Room[]; total: number }, any>({
      query: (params) => ({
        url: '/rooms',
        params,
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        let items = [];

        if (Array.isArray(data)) {
          items = data;
        } else if (data.rooms) {
          items = data.rooms;
        } else if (data.items) {
          items = data.items;
        }

        return {
          rooms: items.map((room: any) => ({
            id: room._id || room.id,
            roomNumber: room.roomNumber || '',
            roomType: room.roomType || 'double',
            floor: room.floor,
            building: room.building,
            maxOccupancy: room.maxOccupancy || 1,
            beds: room.beds || { single: 0, double: 0, king: 0 },
            amenities: room.amenities || [],
            basePrice: room.basePrice || 0,
            seasonalPricing: room.seasonalPricing || [],
            status: room.status || 'available',
            currentBookingId: room.currentBookingId,
            checkedInAt: room.checkedInAt,
            checkedOutAt: room.checkedOutAt,
            size: room.size,
            view: room.view,
            smokingAllowed: room.smokingAllowed || false,
            images: room.images || [],
            qrCode: room.qrCode,
            isActive: room.isActive !== false,
            createdAt: room.createdAt || new Date().toISOString(),
            updatedAt: room.updatedAt || new Date().toISOString(),
          })) as Room[],
          total: data.total || items.length,
        };
      },
      providesTags: (result) =>
        result?.rooms
          ? [...result.rooms.map(({ id }) => ({ type: 'Room' as const, id })), 'Room']
          : ['Room'],
    }),
    getRoomById: builder.query<Room, string>({
      query: (id) => `/rooms/${id}`,
      transformResponse: (response: any) => {
        const room = response.data || response;
        return {
          id: room._id || room.id,
          roomNumber: room.roomNumber || '',
          roomType: room.roomType || 'double',
          floor: room.floor,
          building: room.building,
          maxOccupancy: room.maxOccupancy || 1,
          beds: room.beds || { single: 0, double: 0, king: 0 },
          amenities: room.amenities || [],
          basePrice: room.basePrice || 0,
          seasonalPricing: room.seasonalPricing || [],
          status: room.status || 'available',
          currentBookingId: room.currentBookingId,
          checkedInAt: room.checkedInAt,
          checkedOutAt: room.checkedOutAt,
          size: room.size,
          view: room.view,
          smokingAllowed: room.smokingAllowed || false,
          images: room.images || [],
          qrCode: room.qrCode,
          isActive: room.isActive !== false,
          createdAt: room.createdAt || new Date().toISOString(),
          updatedAt: room.updatedAt || new Date().toISOString(),
        } as Room;
      },
      providesTags: ['Room'],
    }),
    getRoomsByBranch: builder.query<Room[], string>({
      query: (branchId) => `/rooms/branch/${branchId}`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        const items = Array.isArray(data) ? data : data.rooms || [];
        return items.map((room: any) => ({
          id: room._id || room.id,
          roomNumber: room.roomNumber || '',
          roomType: room.roomType || 'double',
          floor: room.floor,
          building: room.building,
          maxOccupancy: room.maxOccupancy || 1,
          beds: room.beds || { single: 0, double: 0, king: 0 },
          amenities: room.amenities || [],
          basePrice: room.basePrice || 0,
          seasonalPricing: room.seasonalPricing || [],
          status: room.status || 'available',
          currentBookingId: room.currentBookingId,
          checkedInAt: room.checkedInAt,
          checkedOutAt: room.checkedOutAt,
          size: room.size,
          view: room.view,
          smokingAllowed: room.smokingAllowed || false,
          images: room.images || [],
          qrCode: room.qrCode,
          isActive: room.isActive !== false,
          createdAt: room.createdAt || new Date().toISOString(),
          updatedAt: room.updatedAt || new Date().toISOString(),
        })) as Room[];
      },
      providesTags: ['Room'],
    }),
    getAvailableRooms: builder.query<Room[], { branchId: string; checkInDate?: string; checkOutDate?: string }>({
      query: ({ branchId, checkInDate, checkOutDate }) => ({
        url: `/rooms/branch/${branchId}/available`,
        params: {
          ...(checkInDate && { checkInDate }),
          ...(checkOutDate && { checkOutDate }),
        },
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        const items = Array.isArray(data) ? data : [];
        return items.map((room: any) => ({
          id: room._id || room.id,
          roomNumber: room.roomNumber || '',
          roomType: room.roomType || 'double',
          floor: room.floor,
          building: room.building,
          maxOccupancy: room.maxOccupancy || 1,
          beds: room.beds || { single: 0, double: 0, king: 0 },
          amenities: room.amenities || [],
          basePrice: room.basePrice || 0,
          seasonalPricing: room.seasonalPricing || [],
          status: room.status || 'available',
          currentBookingId: room.currentBookingId,
          checkedInAt: room.checkedInAt,
          checkedOutAt: room.checkedOutAt,
          size: room.size,
          view: room.view,
          smokingAllowed: room.smokingAllowed || false,
          images: room.images || [],
          qrCode: room.qrCode,
          isActive: room.isActive !== false,
          createdAt: room.createdAt || new Date().toISOString(),
          updatedAt: room.updatedAt || new Date().toISOString(),
        })) as Room[];
      },
      providesTags: ['Room'],
    }),
    getRoomStats: builder.query<RoomStats, string>({
      query: (branchId) => `/rooms/branch/${branchId}/stats`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          total: data.total || 0,
          available: data.available || 0,
          occupied: data.occupied || 0,
          reserved: data.reserved || 0,
          maintenance: data.maintenance || 0,
          outOfOrder: data.outOfOrder || 0,
          occupancyRate: data.occupancyRate || 0,
        } as RoomStats;
      },
      providesTags: ['Room'],
    }),
    createRoom: builder.mutation<Room, CreateRoomRequest>({
      query: (data) => ({
        url: '/rooms',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Room'],
    }),
    bulkCreateRooms: builder.mutation<Room[], { branchId: string; count: number; prefix?: string; startNumber?: number }>({
      query: (data) => ({
        url: '/rooms/bulk',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Room'],
    }),
    updateRoom: builder.mutation<Room, UpdateRoomRequest>({
      query: ({ id, ...data }) => ({
        url: `/rooms/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Room'],
    }),
    updateRoomStatus: builder.mutation<Room, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/rooms/${id}/status`,
        method: 'PATCH',
        body: { status },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Room', id },
        'Room',
        'Booking',
      ],
    }),
    deleteRoom: builder.mutation<void, string>({
      query: (id) => ({
        url: `/rooms/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Room'],
    }),
  }),
});

export const {
  useGetRoomsQuery,
  useGetRoomByIdQuery,
  useGetRoomsByBranchQuery,
  useGetAvailableRoomsQuery,
  useGetRoomStatsQuery,
  useCreateRoomMutation,
  useBulkCreateRoomsMutation,
  useUpdateRoomMutation,
  useUpdateRoomStatusMutation,
  useDeleteRoomMutation,
} = roomsApi;

