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
    }, { branchId: string; menuType?: string }>({
      query: ({ branchId, menuType }) => {
        const params = new URLSearchParams();
        if (menuType) params.append('type', menuType);
        return `/public/branches/${branchId}/menu${params.toString() ? `?${params.toString()}` : ''}`;
      },
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          branch: data.branch,
          categories: data.categories || [],
          menuItems: Array.isArray(data.menuItems) ? data.menuItems : (data.menuItems?.menuItems || []),
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
    }, { companySlug: string; branchSlug: string; menuType?: string }>({
      query: ({ companySlug, branchSlug, menuType }) => {
        const params = new URLSearchParams();
        if (menuType && menuType !== 'full') {
          params.append('type', menuType);
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
          menuItems,
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
} = publicApi;

