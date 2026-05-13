import { apiSlice } from '../apiSlice';
export interface PublicCompany {
  id: string;
  slug: string;
  name: string;
  logo?: string;
  email: string;
  phone: string;
  website?: string;
  address?: any;
  description?: string;
}
export interface PublicBranch {
  id: string;
  slug: string;
  name: string;
  code: string;
  address: any;
  phone?: string;
  email?: string;
  openingHours?: Array<{
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }>;
  isActive: boolean;
}
export interface PublicMenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  images?: string[];
  category?: any;
  isAvailable: boolean;
  preparationTime?: number;
  allergens?: string[];
  ingredients?: any[];
  nutritionalInfo?: {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  variants?: Array<{
    name: string;
    options: Array<{
      name: string;
      priceModifier: number;
    }>;
  }>;
  selections?: Array<{
    name: string;
    type: 'single' | 'multi' | 'optional';
    options: Array<{
      name: string;
      price: number;
    }>;
  }>;
}
export interface PublicCategory {
  id: string;
  name: string;
  description?: string;
}
export interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  deliveryCharge: number;
  minimumOrderAmount?: number;
  freeDeliveryAbove?: number;
  areas?: string[];
  deliveryAreas?: {
    zipCodes?: string[];
    neighborhoods?: string[];
    landmarks?: string[];
  };
  isActive: boolean;
}
export interface PublicRoom {
  id: string;
  roomNumber: string;
  roomType: string;
  floor?: number;
  building?: string;
  maxOccupancy: number;
  beds: {
    single?: number;
    double?: number;
    king?: number;
  };
  amenities: string[];
  basePrice: number;
  size?: string;
  view?: string;
  smokingAllowed: boolean;
  images: string[];
  description?: string;
}
export interface PublicBooking {
  id: string;
  bookingNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  roomRate: number;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  specialRequests?: string;
  createdAt: string;
}
export const publicApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCompanyBySlug: builder.query<PublicCompany, string>({
      query: (slug) => `/public/companies/${slug}`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        // Normalize MongoDB _id to id
        if (data && data._id && !data.id) {
          data.id = data._id.toString();
        }
        return data;
      },
    }),
    getCompanyBranches: builder.query<PublicBranch[], string>({
      query: (companySlug) => `/public/companies/${companySlug}/branches`,
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),
    getBranchBySlug: builder.query<PublicBranch, { companySlug: string; branchSlug: string }>({
      query: ({ companySlug, branchSlug }) => 
        `/public/companies/${companySlug}/branches/${branchSlug}`,
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),
    getBranchMenuById: builder.query<{
      branch?: {
        id: string;
        name: string;
        address?: any;
      };
      categories: PublicCategory[];
      menuItems: PublicMenuItem[];
    }, { branchId: string; menuType?: string; table?: string }>({
      query: ({ branchId, menuType, table }) => {
        const params = new URLSearchParams();
        if (menuType) params.append('type', menuType);
        if (table) params.append('table', table);
        return `/public/branches/${branchId}/menu${params.toString() ? `?${params.toString()}` : ''}`;
      },
      transformResponse: (response: any) => {
        const data = response.data || response;
        const menuItems = Array.isArray(data.menuItems) ? data.menuItems : (data.menuItems?.menuItems || []);
        
        return {
          branch: data.branch,
          categories: data.categories || [],
          menuItems: menuItems.map((item: any) => ({
            ...item,
            nutritionalInfo: item.nutrition || item.nutritionalInfo,
          })),
        };
      },
    }),
    getBranchMenu: builder.query<{
      branch?: {
        id: string;
        name: string;
        address?: any;
      };
      categories: PublicCategory[];
      menuItems: PublicMenuItem[];
    }, { companySlug: string; branchSlug: string; menuType?: string; table?: string }>({
      query: ({ companySlug, branchSlug, menuType, table }) => {
        const params = new URLSearchParams();
        if (menuType && menuType !== 'full') {
          params.append('type', menuType);
        }
        if (table) {
          params.append('table', table);
        }
        return `/public/companies/${companySlug}/branches/${branchSlug}/menu${params.toString() ? `?${params.toString()}` : ''}`;
      },
      transformResponse: (response: any) => {
        const data = response.data || response;
        // Ensure categories is an array
        let categories = [];
        if (Array.isArray(data.categories)) {
          categories = data.categories;
        } else if (data.categories?.categories && Array.isArray(data.categories.categories)) {
          categories = data.categories.categories;
        }
        // Ensure menuItems is an array
        let menuItems = [];
        if (Array.isArray(data.menuItems)) {
          menuItems = data.menuItems;
        } else if (data.menuItems?.menuItems && Array.isArray(data.menuItems.menuItems)) {
          menuItems = data.menuItems.menuItems;
        } else if (Array.isArray(data.menu)) {
          menuItems = data.menu;
        }
        return {
          branch: data.branch,
          categories,
          menuItems: menuItems.map((item: any) => ({
            ...item,
            nutritionalInfo: item.nutrition || item.nutritionalInfo,
          })),
        };
      },
    }),
    getProduct: builder.query<PublicMenuItem, {
      companySlug: string;
      branchSlug: string;
      productId: string;
    }>({
      query: ({ companySlug, branchSlug, productId }) =>
        `/public/companies/${companySlug}/branches/${branchSlug}/products/${productId}`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          ...data,
          nutritionalInfo: data.nutrition || data.nutritionalInfo,
        };
      },
    }),
    createPublicOrder: builder.mutation<any, {
      companySlug: string;
      branchSlug: string;
      orderData: any;
    }>({
      query: ({ companySlug, branchSlug, orderData }) => ({
        url: `/public/companies/${companySlug}/branches/${branchSlug}/orders`,
        method: 'POST',
        body: orderData,
      }),
    }),
    getBranchReviews: builder.query<any[], {
      companySlug: string;
      branchSlug: string;
    }>({
      query: ({ companySlug, branchSlug }) =>
        `/public/companies/${companySlug}/branches/${branchSlug}/reviews`,
      transformResponse: (response: any) => {
        return response.data || [];
      },
    }),
    getCompanyGallery: builder.query<any[], string>({
      query: (companySlug) => `/public/companies/${companySlug}/gallery`,
      transformResponse: (response: any) => {
        return response.data || [];
      },
    }),
    trackOrder: builder.query<any, string>({
      query: (orderId) => `/public/orders/${orderId}/track`,
      transformResponse: (response: any) => {
        return response.data || response;
      },
    }),
    getBranchZones: builder.query<DeliveryZone[], {
      companySlug: string;
      branchSlug: string;
    }>({
      query: ({ companySlug, branchSlug }) =>
        `/public/companies/${companySlug}/branches/${branchSlug}/delivery-zones`,
      transformResponse: (response: any) => {
        return response.data || [];
      },
    }),
    findDeliveryZone: builder.mutation<DeliveryZone | null, {
      companySlug: string;
      branchSlug: string;
      address: { zipCode?: string; city?: string; street?: string };
    }>({
      query: ({ companySlug, branchSlug, address }) => ({
        url: `/public/companies/${companySlug}/branches/${branchSlug}/find-zone`,
        method: 'POST',
        body: address,
      }),
      transformResponse: (response: any) => {
        return response.data || null;
      },
    }),
    submitContactForm: builder.mutation<{ success: boolean; message: string }, {
      companySlug: string;
      name: string;
      email: string;
      phone?: string;
      subject: string;
      message: string;
    }>({
      query: ({ companySlug, ...formData }) => ({
        url: `/public/companies/${companySlug}/contact`,
        method: 'POST',
        body: formData,
      }),
    }),
    submitGeneralContactForm: builder.mutation<{ success: boolean; message: string }, {
      name: string;
      email: string;
      phone?: string;
      subject: string;
      message: string;
    }>({
      query: (formData) => ({
        url: '/public/contact',
        method: 'POST',
        body: formData,
      }),
    }),
    // ========== Hotel/Room Public Endpoints ==========
    getBranchRooms: builder.query<PublicRoom[], {
      companySlug: string;
      branchSlug: string;
      checkInDate?: string;
      checkOutDate?: string;
    }>({
      query: ({ companySlug, branchSlug, checkInDate, checkOutDate }) => {
        const params = new URLSearchParams();
        if (checkInDate) params.append('checkInDate', checkInDate);
        if (checkOutDate) params.append('checkOutDate', checkOutDate);
        return `/public/companies/${companySlug}/branches/${branchSlug}/rooms${params.toString() ? `?${params.toString()}` : ''}`;
      },
      transformResponse: (response: any) => {
        // After decryption, response.data is { success: true, data: [...] }
        // So we need to extract response.data.data (the array)
        if (response && response.data) {
          if (Array.isArray(response.data)) {
            return response.data;
          } else if (response.data.data && Array.isArray(response.data.data)) {
            return response.data.data;
          } else if (response.data.success && response.data.data) {
            return response.data.data;
          }
        }
        console.warn('[getBranchRooms] No valid data found, returning empty array');
        return [];
      },
    }),
    getRoomDetails: builder.query<PublicRoom, {
      companySlug: string;
      branchSlug: string;
      roomId: string;
    }>({
      query: ({ companySlug, branchSlug, roomId }) =>
        `/public/companies/${companySlug}/branches/${branchSlug}/rooms/${roomId}`,
      transformResponse: (response: any) => {
        return response.data;
      },
    }),
    checkRoomAvailability: builder.query<{
      checkInDate: string;
      checkOutDate: string;
      availableRooms: PublicRoom[];
      count: number;
    }, {
      companySlug: string;
      branchSlug: string;
      checkInDate: string;
      checkOutDate: string;
    }>({
      query: ({ companySlug, branchSlug, checkInDate, checkOutDate }) =>
        `/public/companies/${companySlug}/branches/${branchSlug}/rooms/available?checkInDate=${checkInDate}&checkOutDate=${checkOutDate}`,
      transformResponse: (response: any) => {
        return response.data;
      },
    }),
    createPublicBooking: builder.mutation<PublicBooking, {
      companySlug: string;
      branchSlug: string;
      bookingData: {
        roomId: string;
        guestName: string;
        guestEmail: string;
        guestPhone: string;
        checkInDate: string;
        checkOutDate: string;
        roomRate: number;
        numberOfGuests?: number;
        specialRequests?: string;
      };
    }>({
      query: ({ companySlug, branchSlug, bookingData }) => ({
        url: `/public/companies/${companySlug}/branches/${branchSlug}/bookings`,
        method: 'POST',
        body: bookingData,
      }),
      transformResponse: (response: any) => {
        return response.data;
      },
    }),
    getBookingDetails: builder.query<PublicBooking, {
      companySlug: string;
      branchSlug: string;
      bookingId: string;
    }>({
      query: ({ companySlug, branchSlug, bookingId }) =>
        `/public/companies/${companySlug}/branches/${branchSlug}/bookings/${bookingId}`,
      transformResponse: (response: any) => {
        return response.data;
      },
    }),
  }),
});
export const {
  useGetCompanyBySlugQuery,
  useGetCompanyBranchesQuery,
  useGetBranchBySlugQuery,
  useGetBranchMenuByIdQuery,
  useGetBranchMenuQuery,
  useGetProductQuery,
  useCreatePublicOrderMutation,
  useGetBranchReviewsQuery,
  useGetCompanyGalleryQuery,
  useTrackOrderQuery,
  useGetBranchZonesQuery,
  useFindDeliveryZoneMutation,
  useSubmitContactFormMutation,
  useSubmitGeneralContactFormMutation,
  // Hotel/Room queries
  useGetBranchRoomsQuery,
  useGetRoomDetailsQuery,
  useCheckRoomAvailabilityQuery,
  useCreatePublicBookingMutation,
  useGetBookingDetailsQuery,
} = publicApi;
