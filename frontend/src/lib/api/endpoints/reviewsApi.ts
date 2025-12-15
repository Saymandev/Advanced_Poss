import { apiSlice } from '../apiSlice';

export interface Review {
  id: string;
  orderId: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  waiterId?: string;
  waiterRating?: number;
  foodRating: number;
  ambianceRating?: number;
  overallRating: number;
  comment?: string;
  itemReviews?: Array<{
    menuItemId: string;
    menuItemName: string;
    rating: number;
    comment?: string;
  }>;
  createdAt: string;
}

export interface CreateReviewRequest {
  orderId: string;
  customerName?: string;
  customerEmail?: string;
  waiterRating?: number;
  foodRating: number;
  ambianceRating?: number;
  overallRating: number;
  comment?: string;
  itemReviews?: Array<{
    menuItemId: string;
    menuItemName: string;
    rating: number;
    comment?: string;
  }>;
}

export const reviewsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createReview: builder.mutation<Review, CreateReviewRequest>({
      query: (data) => ({
        url: '/reviews',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => {
        const review = response.data || response;
        
        // Properly extract waiterId - handle populated ObjectId objects
        let waiterId: string | undefined = undefined;
        if (review.waiterId) {
          if (typeof review.waiterId === 'string') {
            waiterId = review.waiterId;
          } else if (review.waiterId._id) {
            waiterId = review.waiterId._id.toString();
          } else if (review.waiterId.id) {
            waiterId = review.waiterId.id.toString();
          } else if (typeof review.waiterId.toString === 'function' && review.waiterId.toString() !== '[object Object]') {
            waiterId = review.waiterId.toString();
          }
        }
        
        return {
          id: review._id || review.id,
          orderId: review.orderId?._id?.toString() || review.orderId?.toString() || review.orderId,
          customerId: review.customerId?._id?.toString() || review.customerId?.toString() || review.customerId,
          customerName: review.customerName,
          customerEmail: review.customerEmail,
          waiterId: waiterId,
          waiterRating: review.waiterRating,
          foodRating: review.foodRating,
          ambianceRating: review.ambianceRating,
          overallRating: review.overallRating,
          comment: review.comment,
          itemReviews: review.itemReviews,
          createdAt: review.createdAt,
        };
      },
    }),

    getReviewByOrder: builder.query<Review | null, string>({
      query: (orderId) => `/reviews/order/${orderId}`,
      transformResponse: (response: any) => {
        // Backend returns review directly or null, not wrapped in data
        const review = response?.data || response;
        if (!review || !review._id) return null;
        
        // Properly extract waiterId - handle populated ObjectId objects
        // Backend populates waiterId with user data: { _id: ObjectId, firstName: string, lastName: string }
        let waiterId: string | undefined = undefined;
        if (review.waiterId) {
          if (typeof review.waiterId === 'string') {
            waiterId = review.waiterId;
          } else if (review.waiterId._id) {
            // Handle populated ObjectId - _id is an ObjectId object
            waiterId = typeof review.waiterId._id === 'string' 
              ? review.waiterId._id 
              : review.waiterId._id.toString();
          } else if (review.waiterId.id) {
            waiterId = typeof review.waiterId.id === 'string'
              ? review.waiterId.id
              : review.waiterId.id.toString();
          } else {
            // Last resort: try to get string representation if it's an ObjectId
            try {
              const idStr = String(review.waiterId);
              if (idStr && idStr !== '[object Object]' && idStr.length > 10) {
                waiterId = idStr;
              }
            } catch (e) {
              console.warn('Failed to extract waiterId from review:', review.waiterId, e);
            }
          }
        }
        
        return {
          id: review._id || review.id,
          orderId: review.orderId?._id?.toString() || review.orderId?.toString() || review.orderId,
          customerId: review.customerId?._id?.toString() || review.customerId?.toString() || review.customerId,
          customerName: review.customerName,
          customerEmail: review.customerEmail,
          waiterId: waiterId,
          waiterRating: review.waiterRating,
          foodRating: review.foodRating,
          ambianceRating: review.ambianceRating,
          overallRating: review.overallRating,
          comment: review.comment,
          itemReviews: review.itemReviews,
          createdAt: review.createdAt,
        };
      },
    }),

    getReviews: builder.query<Review[], { branchId?: string; companyId?: string }>({
      query: ({ branchId, companyId }) => {
        const params = new URLSearchParams();
        if (branchId) params.append('branchId', branchId);
        if (companyId) params.append('companyId', companyId);
        return `/reviews${params.toString() ? `?${params.toString()}` : ''}`;
      },
      transformResponse: (response: any) => {
        const reviews = response.data || response || [];
        return reviews.map((review: any) => {
          // Properly extract waiterId - handle populated ObjectId objects
          // Backend populates waiterId with user data: { _id: ObjectId, firstName: string, lastName: string }
          let waiterId: string | undefined = undefined;
          if (review.waiterId) {
            if (typeof review.waiterId === 'string') {
              waiterId = review.waiterId;
            } else if (review.waiterId._id) {
              // Handle populated ObjectId - _id is an ObjectId object
              waiterId = typeof review.waiterId._id === 'string' 
                ? review.waiterId._id 
                : review.waiterId._id.toString();
            } else if (review.waiterId.id) {
              waiterId = typeof review.waiterId.id === 'string'
                ? review.waiterId.id
                : review.waiterId.id.toString();
            } else {
              // Last resort: try to get string representation if it's an ObjectId
              try {
                const idStr = String(review.waiterId);
                if (idStr && idStr !== '[object Object]' && idStr.length > 10) {
                  waiterId = idStr;
                }
              } catch (e) {
                console.warn('Failed to extract waiterId from review:', review.waiterId, e);
              }
            }
          }
          
          return {
            id: review._id || review.id,
            orderId: review.orderId?._id?.toString() || review.orderId?.toString() || review.orderId,
            customerId: review.customerId?._id?.toString() || review.customerId?.toString() || review.customerId,
            customerName: review.customerName,
            customerEmail: review.customerEmail,
            waiterId: waiterId,
            waiterRating: review.waiterRating,
            foodRating: review.foodRating,
            ambianceRating: review.ambianceRating,
            overallRating: review.overallRating,
            comment: review.comment,
            itemReviews: review.itemReviews,
            createdAt: review.createdAt,
          };
        });
      },
    }),

    getMenuItemRating: builder.query<{ averageRating: number; totalReviews: number }, { menuItemId: string; branchId?: string; companyId?: string }>({
      query: ({ menuItemId, branchId, companyId }) => {
        const params = new URLSearchParams();
        if (branchId) params.append('branchId', branchId);
        if (companyId) params.append('companyId', companyId);
        return `/reviews/menu-item/${menuItemId}/rating${params.toString() ? `?${params.toString()}` : ''}`;
      },
      transformResponse: (response: any) => {
        const data = response.data || response;
        return {
          averageRating: data.averageRating || 0,
          totalReviews: data.totalReviews || 0,
        };
      },
    }),

    getMenuItemsRatings: builder.mutation<Record<string, { averageRating: number; totalReviews: number }>, { menuItemIds: string[]; branchId?: string; companyId?: string }>({
      query: ({ menuItemIds, branchId, companyId }) => {
        const params = new URLSearchParams();
        if (branchId) params.append('branchId', branchId);
        if (companyId) params.append('companyId', companyId);
        return {
          url: `/reviews/menu-items/ratings${params.toString() ? `?${params.toString()}` : ''}`,
          method: 'POST',
          body: { menuItemIds },
        };
      },
      transformResponse: (response: any) => {
        return response.data || response || {};
      },
    }),
  }),
  overrideExisting: true,
});

export const {
  useCreateReviewMutation,
  useGetReviewByOrderQuery,
  useGetReviewsQuery,
  useGetMenuItemRatingQuery,
  useGetMenuItemsRatingsMutation,
} = reviewsApi;

