import { apiSlice } from '../apiSlice';

export interface GalleryImage {
  _id?: string;
  id?: string;
  url: string;
  publicId?: string;
  caption?: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateGalleryImageRequest {
  file: File;
  caption?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateGalleryImageRequest {
  id: string;
  caption?: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ReorderGalleryImagesRequest {
  imageIds: string[];
}

export const galleryApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGalleryImages: builder.query<GalleryImage[], { isActive?: boolean } | void>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params && typeof params === 'object' && params.isActive !== undefined) {
          searchParams.append('isActive', String(params.isActive));
        }
        return `/gallery${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      },
      providesTags: ['Gallery'],
      transformResponse: (response: any) => {
        const data = Array.isArray(response) ? response : (response?.data || []);
        return data.map((item: any) => ({
          _id: item._id || item.id,
          id: item._id || item.id,
          url: item.url,
          publicId: item.publicId,
          caption: item.caption,
          description: item.description,
          displayOrder: item.displayOrder || 0,
          isActive: item.isActive !== undefined ? item.isActive : true,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
      },
    }),

    uploadGalleryImage: builder.mutation<GalleryImage, CreateGalleryImageRequest>({
      query: ({ file, caption, description, displayOrder, isActive }) => {
        const formData = new FormData();
        formData.append('file', file);
        if (caption) formData.append('caption', caption);
        if (description) formData.append('description', description);
        if (displayOrder !== undefined) formData.append('displayOrder', String(displayOrder));
        if (isActive !== undefined) formData.append('isActive', String(isActive));

        return {
          url: '/gallery',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Gallery'],
    }),

    updateGalleryImage: builder.mutation<GalleryImage, UpdateGalleryImageRequest>({
      query: ({ id, ...updates }) => ({
        url: `/gallery/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: ['Gallery'],
    }),

    deleteGalleryImage: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/gallery/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Gallery'],
    }),

    reorderGalleryImages: builder.mutation<{ success: boolean; message: string }, ReorderGalleryImagesRequest>({
      query: ({ imageIds }) => ({
        url: '/gallery/reorder',
        method: 'POST',
        body: { imageIds },
      }),
      invalidatesTags: ['Gallery'],
    }),
  }),
});

export const {
  useGetGalleryImagesQuery,
  useUploadGalleryImageMutation,
  useUpdateGalleryImageMutation,
  useDeleteGalleryImageMutation,
  useReorderGalleryImagesMutation,
} = galleryApi;

