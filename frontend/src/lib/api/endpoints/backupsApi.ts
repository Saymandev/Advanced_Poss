import { apiSlice } from '../apiSlice';

export interface Backup {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'differential';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  size: number;
  filePath?: string;
  description?: string;
  includes: {
    data: boolean;
    files: boolean;
    settings: boolean;
    users: boolean;
    orders: boolean;
    inventory: boolean;
  };
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
  createdBy: string;
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackup?: string;
  nextScheduledBackup?: string;
  storageUsed: number;
  storageLimit: number;
  successRate: number;
}

export interface CreateBackupRequest {
  name: string;
  type: 'full' | 'incremental' | 'differential';
  description?: string;
  includes: {
    data: boolean;
    files: boolean;
    settings: boolean;
    users: boolean;
    orders: boolean;
    inventory: boolean;
  };
}

export const backupsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createBackup: builder.mutation<Backup, CreateBackupRequest>({
      query: (data) => ({
        url: '/backups',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Backup'],
    }),
    getBackups: builder.query<{ backups: Backup[]; total: number }, any>({
      query: (params) => ({
        url: '/backups',
        params,
      }),
      providesTags: ['Backup'],
    }),
    getBackupById: builder.query<Backup, string>({
      query: (id) => `/backups/${id}`,
      providesTags: ['Backup'],
    }),
    restoreBackup: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/backups/${id}/restore`,
        method: 'POST',
      }),
      invalidatesTags: ['Backup', 'Company', 'Branch', 'User', 'Order', 'MenuItem', 'Customer'],
    }),
    downloadBackup: builder.mutation<Blob, string>({
      query: (id) => ({
        url: `/backups/${id}/download`,
        method: 'GET',
        responseHandler: (response: any) => response.blob(),
      }),
      invalidatesTags: ['Backup'],
    }),
    deleteBackup: builder.mutation<void, string>({
      query: (id) => ({
        url: `/backups/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Backup'],
    }),
    getBackupStats: builder.query<BackupStats, void>({
      query: () => '/backups/stats/overview',
      providesTags: ['Backup'],
    }),
    exportData: builder.mutation<Blob, { 
      format: 'json' | 'csv' | 'excel';
      tables: string[];
      dateRange?: { start: string; end: string };
    }>({
      query: (data) => ({
        url: '/backups/export',
        method: 'POST',
        body: data,
        responseHandler: (response: any) => response.blob(),
      }),
      invalidatesTags: ['Backup'],
    }),
    importData: builder.mutation<{ message: string; imported: number }, FormData>({
      query: (formData) => ({
        url: '/backups/import',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Backup', 'Company', 'Branch', 'User', 'Order', 'MenuItem', 'Customer'],
    }),
  }),
});

export const {
  useCreateBackupMutation,
  useGetBackupsQuery,
  useGetBackupByIdQuery,
  useRestoreBackupMutation,
  useDownloadBackupMutation,
  useDeleteBackupMutation,
  useGetBackupStatsQuery,
  useExportDataMutation,
  useImportDataMutation,
} = backupsApi;
