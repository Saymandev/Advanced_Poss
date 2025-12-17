import { apiSlice } from '../apiSlice';

export interface Booking {
  id: string;
  bookingNumber: string;
  branchId: string;
  roomId: string;
  roomNumber: string;
  guestId?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  guestIdNumber?: string;
  numberOfGuests: number;
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  roomRate: number;
  totalRoomCharges: number;
  additionalCharges?: {
    type: string;
    description: string;
    amount: number;
  }[];
  discount: number;
  tax: number;
  serviceCharge: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  paymentMethod?: string;
  depositAmount?: number;
  balanceAmount?: number;
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  specialRequests?: string;
  arrivalTime?: string;
  lateCheckout?: boolean;
  checkedInAt?: string;
  checkedOutAt?: string;
  checkedInBy?: string;
  checkedOutBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  refundAmount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingRequest {
  branchId: string;
  roomId: string;
  guestId?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  guestIdNumber?: string;
  numberOfGuests: number;
  checkInDate: string;
  checkOutDate: string;
  roomRate: number;
  additionalCharges?: {
    type: string;
    description: string;
    amount: number;
  }[];
  discount?: number;
  taxRate?: number;
  serviceChargeRate?: number;
  specialRequests?: string;
  arrivalTime?: string;
  lateCheckout?: boolean;
  notes?: string;
  paymentStatus?: 'pending' | 'partial' | 'paid';
  paymentMethod?: string;
  depositAmount?: number;
}

export interface UpdateBookingRequest extends Partial<CreateBookingRequest> {
  id: string;
}

export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  checkedIn: number;
  checkedOut: number;
  cancelled: number;
  totalRevenue: number;
  averageBookingValue: number;
  occupancyRate: number;
}

export const bookingsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBookings: builder.query<{ bookings: Booking[]; total: number }, any>({
      query: (params) => ({
        url: '/bookings',
        params,
      }),
      transformResponse: (response: any) => {
        // Backend returns array directly, but NestJS might wrap it in { data: [...] }
        // RTK Query might also wrap it, so we need to check multiple levels
        const data = response?.data || response;
        let items = [];
        
        // Check if response is already an array
        if (Array.isArray(response)) {
          items = response;
        }
        // Check if response has a data property (NestJS wrapper)
        else if (response.data) {
          if (Array.isArray(response.data)) {
            items = response.data;
          } else if (response.data.bookings && Array.isArray(response.data.bookings)) {
            items = response.data.bookings;
          } else if (response.data.items && Array.isArray(response.data.items)) {
            items = response.data.items;
          }
        }
        // Check if response has bookings property directly
        else if (response.bookings && Array.isArray(response.bookings)) {
          items = response.bookings;
        }
        // Check if response has items property
        else if (response.items && Array.isArray(response.items)) {
          items = response.items;
        }
        

        return {
          bookings: items.map((booking: any) => {
            // Handle roomNumber - it might be directly on booking or populated from roomId
            let roomNumber = booking.roomNumber || '';
            if (!roomNumber && booking.roomId) {
              if (typeof booking.roomId === 'object' && booking.roomId.roomNumber) {
                roomNumber = booking.roomId.roomNumber;
              }
            }
            
            return {
              id: booking._id || booking.id,
              bookingNumber: booking.bookingNumber || '',
              branchId: booking.branchId?._id || booking.branchId || '',
              roomId: booking.roomId?._id || booking.roomId || '',
              roomNumber: roomNumber,
              guestId: booking.guestId?._id || booking.guestId,
              guestName: booking.guestName || '',
              guestEmail: booking.guestEmail,
              guestPhone: booking.guestPhone || '',
              guestIdNumber: booking.guestIdNumber,
              numberOfGuests: booking.numberOfGuests || 1,
              checkInDate: booking.checkInDate || '',
              checkOutDate: booking.checkOutDate || '',
              numberOfNights: booking.numberOfNights || 0,
              roomRate: booking.roomRate || 0,
              totalRoomCharges: booking.totalRoomCharges || 0,
              additionalCharges: booking.additionalCharges || [],
              discount: booking.discount || 0,
              tax: booking.tax || 0,
              serviceCharge: booking.serviceCharge || 0,
              totalAmount: booking.totalAmount || 0,
              paymentStatus: booking.paymentStatus || 'pending',
              paymentMethod: booking.paymentMethod,
              depositAmount: booking.depositAmount,
              balanceAmount: booking.balanceAmount,
              status: booking.status || 'pending',
              specialRequests: booking.specialRequests,
              arrivalTime: booking.arrivalTime,
              lateCheckout: booking.lateCheckout || false,
              checkedInAt: booking.checkedInAt,
              checkedOutAt: booking.checkedOutAt,
              checkedInBy: booking.checkedInBy?._id || booking.checkedInBy,
              checkedOutBy: booking.checkedOutBy?._id || booking.checkedOutBy,
              cancelledAt: booking.cancelledAt,
              cancellationReason: booking.cancellationReason,
              refundAmount: booking.refundAmount,
              notes: booking.notes,
              createdAt: booking.createdAt || new Date().toISOString(),
              updatedAt: booking.updatedAt || new Date().toISOString(),
            } as Booking;
          }),
          total: data.total || items.length,
        };
      },
      providesTags: (result) =>
        result?.bookings
          ? [...result.bookings.map(({ id }) => ({ type: 'Booking' as const, id })), 'Booking']
          : ['Booking'],
    }),
    getBookingById: builder.query<Booking, string>({
      query: (id) => `/bookings/${id}`,
      transformResponse: (response: any) => {
        const booking = response.data || response;
        return {
          id: booking._id || booking.id,
          bookingNumber: booking.bookingNumber || '',
          branchId: booking.branchId?._id || booking.branchId || '',
          roomId: booking.roomId?._id || booking.roomId || '',
          roomNumber: booking.roomNumber || '',
          guestId: booking.guestId?._id || booking.guestId,
          guestName: booking.guestName || '',
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone || '',
          guestIdNumber: booking.guestIdNumber,
          numberOfGuests: booking.numberOfGuests || 1,
          checkInDate: booking.checkInDate || '',
          checkOutDate: booking.checkOutDate || '',
          numberOfNights: booking.numberOfNights || 0,
          roomRate: booking.roomRate || 0,
          totalRoomCharges: booking.totalRoomCharges || 0,
          additionalCharges: booking.additionalCharges || [],
          discount: booking.discount || 0,
          tax: booking.tax || 0,
          serviceCharge: booking.serviceCharge || 0,
          totalAmount: booking.totalAmount || 0,
          paymentStatus: booking.paymentStatus || 'pending',
          paymentMethod: booking.paymentMethod,
          depositAmount: booking.depositAmount,
          balanceAmount: booking.balanceAmount,
          status: booking.status || 'pending',
          specialRequests: booking.specialRequests,
          arrivalTime: booking.arrivalTime,
          lateCheckout: booking.lateCheckout || false,
          checkedInAt: booking.checkedInAt,
          checkedOutAt: booking.checkedOutAt,
          checkedInBy: booking.checkedInBy?._id || booking.checkedInBy,
          checkedOutBy: booking.checkedOutBy?._id || booking.checkedOutBy,
          cancelledAt: booking.cancelledAt,
          cancellationReason: booking.cancellationReason,
          refundAmount: booking.refundAmount,
          notes: booking.notes,
          createdAt: booking.createdAt || new Date().toISOString(),
          updatedAt: booking.updatedAt || new Date().toISOString(),
        } as Booking;
      },
      providesTags: ['Booking'],
    }),
    getBookingsByBranch: builder.query<Booking[], string>({
      query: (branchId) => `/bookings/branch/${branchId}`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        const items = Array.isArray(data) ? data : [];
        return items.map((booking: any) => ({
          id: booking._id || booking.id,
          bookingNumber: booking.bookingNumber || '',
          branchId: booking.branchId?._id || booking.branchId || '',
          roomId: booking.roomId?._id || booking.roomId || '',
          roomNumber: booking.roomNumber || '',
          guestId: booking.guestId?._id || booking.guestId,
          guestName: booking.guestName || '',
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone || '',
          guestIdNumber: booking.guestIdNumber,
          numberOfGuests: booking.numberOfGuests || 1,
          checkInDate: booking.checkInDate || '',
          checkOutDate: booking.checkOutDate || '',
          numberOfNights: booking.numberOfNights || 0,
          roomRate: booking.roomRate || 0,
          totalRoomCharges: booking.totalRoomCharges || 0,
          additionalCharges: booking.additionalCharges || [],
          discount: booking.discount || 0,
          tax: booking.tax || 0,
          serviceCharge: booking.serviceCharge || 0,
          totalAmount: booking.totalAmount || 0,
          paymentStatus: booking.paymentStatus || 'pending',
          paymentMethod: booking.paymentMethod,
          depositAmount: booking.depositAmount,
          balanceAmount: booking.balanceAmount,
          status: booking.status || 'pending',
          specialRequests: booking.specialRequests,
          arrivalTime: booking.arrivalTime,
          lateCheckout: booking.lateCheckout || false,
          checkedInAt: booking.checkedInAt,
          checkedOutAt: booking.checkedOutAt,
          checkedInBy: booking.checkedInBy?._id || booking.checkedInBy,
          checkedOutBy: booking.checkedOutBy?._id || booking.checkedOutBy,
          cancelledAt: booking.cancelledAt,
          cancellationReason: booking.cancellationReason,
          refundAmount: booking.refundAmount,
          notes: booking.notes,
          createdAt: booking.createdAt || new Date().toISOString(),
          updatedAt: booking.updatedAt || new Date().toISOString(),
        })) as Booking[];
      },
      providesTags: ['Booking'],
    }),
    getBookingStats: builder.query<BookingStats, { branchId: string; startDate?: string; endDate?: string }>({
      query: ({ branchId, startDate, endDate }) => ({
        url: `/bookings/branch/${branchId}/stats`,
        params: {
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        },
      }),
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          total: data.total || 0,
          pending: data.pending || 0,
          confirmed: data.confirmed || 0,
          checkedIn: data.checkedIn || 0,
          checkedOut: data.checkedOut || 0,
          cancelled: data.cancelled || 0,
          totalRevenue: data.totalRevenue || 0,
          averageBookingValue: data.averageBookingValue || 0,
          occupancyRate: data.occupancyRate || 0,
        } as BookingStats;
      },
      providesTags: ['Booking'],
    }),
    checkRoomAvailability: builder.query<boolean, { roomId: string; checkInDate: string; checkOutDate: string }>({
      query: ({ roomId, checkInDate, checkOutDate }) => ({
        url: `/bookings/availability/${roomId}`,
        params: { checkInDate, checkOutDate },
      }),
      transformResponse: (response: any) => {
        return response.data !== false && response !== false;
      },
    }),
    createBooking: builder.mutation<Booking, CreateBookingRequest>({
      query: (data) => ({
        url: '/bookings',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Booking', 'Room'],
    }),
    updateBooking: builder.mutation<Booking, UpdateBookingRequest>({
      query: ({ id, ...data }) => ({
        url: `/bookings/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Booking', 'Room'],
    }),
    checkIn: builder.mutation<Booking, { id: string; notes?: string }>({
      query: ({ id, ...data }) => ({
        url: `/bookings/${id}/check-in`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Booking', 'Room'],
    }),
    checkOut: builder.mutation<Booking, { id: string; notes?: string; additionalCharges?: number }>({
      query: ({ id, ...data }) => ({
        url: `/bookings/${id}/check-out`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Booking', 'Room'],
    }),
    cancelBooking: builder.mutation<Booking, { id: string; reason?: string; refundAmount?: number }>({
      query: ({ id, ...data }) => ({
        url: `/bookings/${id}/cancel`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Booking', 'Room'],
    }),
  }),
});

export const {
  useGetBookingsQuery,
  useGetBookingByIdQuery,
  useGetBookingsByBranchQuery,
  useGetBookingStatsQuery,
  useCheckRoomAvailabilityQuery,
  useCreateBookingMutation,
  useUpdateBookingMutation,
  useCheckInMutation,
  useCheckOutMutation,
  useCancelBookingMutation,
} = bookingsApi;

