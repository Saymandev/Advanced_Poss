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

export const publicApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCompanyBySlug: builder.query<PublicCompany, string>({
      query: (slug) => `/public/companies/${slug}`,
      transformResponse: (response: any) => {
        return response.data || response;
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
    
    getBranchMenu: builder.query<{
      categories: PublicCategory[];
      menuItems: PublicMenuItem[];
    }, { companySlug: string; branchSlug: string }>({
      query: ({ companySlug, branchSlug }) =>
        `/public/companies/${companySlug}/branches/${branchSlug}/menu`,
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          categories: data.categories || [],
          menuItems: data.menuItems || data.menu || [],
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
        return response.data || response;
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
  }),
});

export const {
  useGetCompanyBySlugQuery,
  useGetCompanyBranchesQuery,
  useGetBranchBySlugQuery,
  useGetBranchMenuQuery,
  useGetProductQuery,
  useCreatePublicOrderMutation,
  useGetBranchReviewsQuery,
  useGetCompanyGalleryQuery,
  useTrackOrderQuery,
  useGetBranchZonesQuery,
  useFindDeliveryZoneMutation,
} = publicApi;

