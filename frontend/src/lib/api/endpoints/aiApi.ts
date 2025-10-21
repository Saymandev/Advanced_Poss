import { apiSlice } from '../apiSlice';

export interface MenuOptimizationSuggestion {
  id: string;
  itemId: string;
  itemName: string;
  currentPrice: number;
  suggestedPrice: number;
  priceChange: number; // percentage
  demandScore: number; // 1-10
  popularityScore: number; // 1-10
  profitMargin: number; // percentage
  recommendation: 'increase_price' | 'decrease_price' | 'maintain_price' | 'remove_item' | 'add_item';
  reasoning: string;
  confidence: number; // 0-1
  expectedImpact: {
    revenue: number;
    profit: number;
    orders: number;
  };
  createdAt: string;
}

export interface DemandPrediction {
  id: string;
  itemId: string;
  itemName: string;
  predictedDemand: number;
  confidence: number;
  factors: {
    timeOfDay: number;
    dayOfWeek: number;
    season: number;
    events: number;
    trends: number;
  };
  recommendations: string[];
  createdAt: string;
}

export interface CustomerLoyaltyInsight {
  id: string;
  customerId: string;
  customerName: string;
  currentTier: string;
  nextTierProgress: number; // percentage to next tier
  personalizedOffers: Array<{
    id: string;
    type: 'discount' | 'free_item' | 'bonus_points' | 'early_access';
    title: string;
    description: string;
    value: number;
    expiryDate: string;
    conditions?: string[];
  }>;
  recommendations: string[];
  predictedChurn: number; // 0-1 probability
  lifetimeValue: number;
  createdAt: string;
}

export interface SalesForecast {
  id: string;
  branchId: string;
  date: string;
  predictedSales: number;
  predictedOrders: number;
  confidence: number;
  factors: {
    historical: number;
    seasonal: number;
    trending: number;
    external: number;
  };
  recommendedStaffing: {
    managers: number;
    chefs: number;
    waiters: number;
    cashiers: number;
  };
  createdAt: string;
}

export interface QRCodeMenu {
  id: string;
  branchId: string;
  tableNumber?: number;
  menuType: 'full' | 'drinks' | 'food' | 'desserts';
  url: string;
  qrCodeImage: string;
  isActive: boolean;
  scanCount: number;
  lastScanned?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DigitalReceipt {
  id: string;
  orderId: string;
  customerId?: string;
  customerEmail?: string;
  receiptNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  tip?: number;
  total: number;
  paymentMethod: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsBalance?: number;
  personalizedOffers?: Array<{
    title: string;
    description: string;
    code: string;
    expiryDate: string;
  }>;
  createdAt: string;
}

export interface DeliveryIntegration {
  id: string;
  provider: 'uber_eats' | 'doordash' | 'grubhub' | 'postmates' | 'custom';
  apiKey: string;
  webhookUrl?: string;
  isActive: boolean;
  settings: {
    autoAcceptOrders: boolean;
    estimatedDeliveryTime: number; // minutes
    deliveryFee: number;
    minimumOrder: number;
    serviceArea: {
      radius: number; // km
      coordinates: {
        lat: number;
        lng: number;
      };
    };
  };
  lastSync?: string;
  createdAt: string;
  updatedAt: string;
}

export const aiApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // AI Menu Optimization
    getMenuOptimization: builder.query<MenuOptimizationSuggestion[], { branchId?: string; category?: string }>({
      query: (params) => ({
        url: '/ai/menu-optimization',
        params,
      }),
      providesTags: ['AI'],
    }),
    getDemandPredictions: builder.query<DemandPrediction[], { branchId?: string; itemIds?: string[] }>({
      query: (params) => ({
        url: '/ai/demand-predictions',
        params,
      }),
      providesTags: ['AI'],
    }),

    // Customer Loyalty AI
    getCustomerLoyaltyInsights: builder.query<CustomerLoyaltyInsight[], { branchId?: string; customerIds?: string[] }>({
      query: (params) => ({
        url: '/ai/customer-loyalty-insights',
        params,
      }),
      providesTags: ['AI'],
    }),
    getPersonalizedOffers: builder.mutation<{ offers: Array<CustomerLoyaltyInsight['personalizedOffers'][0]> }, { customerId: string; branchId: string }>({
      query: ({ customerId, branchId }) => ({
        url: '/ai/personalized-offers',
        method: 'POST',
        body: { customerId, branchId },
      }),
      invalidatesTags: ['AI'],
    }),

    // Predictive Analytics
    getSalesForecast: builder.query<SalesForecast[], { branchId?: string; startDate?: string; endDate?: string }>({
      query: (params) => ({
        url: '/ai/sales-forecast',
        params,
      }),
      providesTags: ['AI'],
    }),
    getStaffingOptimization: builder.query<{ recommendations: SalesForecast['recommendedStaffing']; reasoning: string[] }, { branchId: string; date: string }>({
      query: ({ branchId, date }) => ({
        url: '/ai/staffing-optimization',
        params: { branchId, date },
      }),
      providesTags: ['AI'],
    }),

    // QR Code Menus
    getQRCodes: builder.query<QRCodeMenu[], { branchId?: string; tableNumber?: number }>({
      query: (params) => ({
        url: '/qr-codes',
        params,
      }),
      providesTags: ['QRCode'],
    }),
    generateQRCode: builder.mutation<QRCodeMenu, { branchId: string; tableNumber?: number; menuType: QRCodeMenu['menuType'] }>({
      query: (data) => ({
        url: '/qr-codes/generate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['QRCode'],
    }),
    updateQRCode: builder.mutation<QRCodeMenu, { id: string; data: Partial<QRCodeMenu> }>({
      query: ({ id, data }) => ({
        url: `/qr-codes/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['QRCode'],
    }),
    deleteQRCode: builder.mutation<void, string>({
      query: (id) => ({
        url: `/qr-codes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['QRCode'],
    }),

    // Digital Receipts
    generateDigitalReceipt: builder.mutation<DigitalReceipt, { orderId: string; customerEmail?: string }>({
      query: (data) => ({
        url: '/digital-receipts/generate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['DigitalReceipt'],
    }),
    getDigitalReceipts: builder.query<DigitalReceipt[], { branchId?: string; customerId?: string; startDate?: string; endDate?: string }>({
      query: (params) => ({
        url: '/digital-receipts',
        params,
      }),
      providesTags: ['DigitalReceipt'],
    }),
    emailDigitalReceipt: builder.mutation<{ success: boolean; messageId?: string }, { receiptId: string; email: string }>({
      query: ({ receiptId, email }) => ({
        url: `/digital-receipts/${receiptId}/email`,
        method: 'POST',
        body: { email },
      }),
      invalidatesTags: ['DigitalReceipt'],
    }),

    // Delivery Integration
    getDeliveryIntegrations: builder.query<DeliveryIntegration[], { branchId?: string }>({
      query: (params) => ({
        url: '/delivery-integrations',
        params,
      }),
      providesTags: ['DeliveryIntegration'],
    }),
    createDeliveryIntegration: builder.mutation<DeliveryIntegration, Omit<DeliveryIntegration, 'id' | 'createdAt' | 'updatedAt'>>({
      query: (data) => ({
        url: '/delivery-integrations',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['DeliveryIntegration'],
    }),
    updateDeliveryIntegration: builder.mutation<DeliveryIntegration, { id: string; data: Partial<DeliveryIntegration> }>({
      query: ({ id, data }) => ({
        url: `/delivery-integrations/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['DeliveryIntegration'],
    }),
    deleteDeliveryIntegration: builder.mutation<void, string>({
      query: (id) => ({
        url: `/delivery-integrations/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['DeliveryIntegration'],
    }),
    syncDeliveryOrders: builder.mutation<{ synced: number; errors: string[] }, { integrationId: string }>({
      query: ({ integrationId }) => ({
        url: `/delivery-integrations/${integrationId}/sync`,
        method: 'POST',
      }),
      invalidatesTags: ['DeliveryIntegration'],
    }),
  }),
});

export const {
  useGetMenuOptimizationQuery,
  useGetDemandPredictionsQuery,
  useGetCustomerLoyaltyInsightsQuery,
  useGetPersonalizedOffersMutation,
  useGetSalesForecastQuery,
  useGetStaffingOptimizationQuery,
  useGetQRCodesQuery,
  useGenerateQRCodeMutation,
  useUpdateQRCodeMutation,
  useDeleteQRCodeMutation,
  useGenerateDigitalReceiptMutation,
  useGetDigitalReceiptsQuery,
  useEmailDigitalReceiptMutation,
  useGetDeliveryIntegrationsQuery,
  useCreateDeliveryIntegrationMutation,
  useUpdateDeliveryIntegrationMutation,
  useDeleteDeliveryIntegrationMutation,
  useSyncDeliveryOrdersMutation,
} = aiApi;