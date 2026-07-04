import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { WorkspaceType, BoardType, ItemType, ColumnType } from '@/types/workspace';
import type { RootState } from '../index';
import { clearCredentials } from '../slices/authSlice';
import { API_BASE_URL } from '@/config';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_BASE_URL}/api`,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Intercept 401 responses — expired or invalid token → clear credentials → triggers redirect to /login
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    api.dispatch(clearCredentials());
  }
  return result;
};

export const backendApi = createApi({
  reducerPath: 'backendApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Workspace', 'Board', 'Item', 'Activity', 'Notification', 'Milestone', 'Label', 'SavedView'],
  endpoints: (builder) => ({
    // WORKSPACES
    getWorkspaces: builder.query<{ workspaces: WorkspaceType[] }, void>({
      query: () => '/workspaces',
      providesTags: ['Workspace'],
    }),
    createWorkspace: builder.mutation<WorkspaceType, Partial<WorkspaceType>>({
      query: (body) => ({
        url: '/workspaces',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Workspace', 'Activity'],
    }),
    updateWorkspace: builder.mutation<WorkspaceType, { id: string; body: Partial<WorkspaceType> }>({
      query: ({ id, body }) => ({
        url: `/workspaces/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Workspace', 'Activity'],
    }),
    deleteWorkspace: builder.mutation<void, string>({
      query: (id) => ({
        url: `/workspaces/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Workspace', 'Activity'],
    }),

    // BOARDS
    getBoards: builder.query<{ boards: BoardType[] }, string>({
      query: (workspaceId) => `/boards?workspaceId=${workspaceId}`,
      providesTags: ['Board'],
    }),
    getBoard: builder.query<{ board: BoardType }, string>({
      query: (boardId) => `/boards/${boardId}`,
      providesTags: ['Board'],
    }),
    createBoard: builder.mutation<BoardType, { workspaceId: string; name: string }>({
      query: (body) => ({
        url: '/boards',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Board', 'Activity'],
    }),
    updateBoard: builder.mutation<{ board: BoardType }, { id: string; body: { name?: string; columns?: ColumnType[] } }>({
      query: ({ id, body }) => ({
        url: `/boards/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Board', 'Activity'],
    }),
    deleteBoard: builder.mutation<void, string>({
      query: (id) => ({
        url: `/boards/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Board', 'Activity'],
    }),
    inviteBoardMember: builder.mutation<void, { boardId: string; email: string; role: string }>({
      query: ({ boardId, email, role }) => ({
        url: `/boards/${boardId}/invite`,
        method: 'POST',
        body: { email, role },
      }),
      invalidatesTags: ['Board', 'Activity'],
    }),

    // ITEMS (TASKS/BUGS/etc.)
    getBoardItems: builder.query<{ items: ItemType[] }, string>({
      query: (boardId) => `/boards/${boardId}/items`,
      providesTags: ['Item'],
    }),
    getWorkspaceItems: builder.query<{ success: boolean; items: ItemType[] }, string>({
      query: (workspaceId) => `/items?workspaceId=${workspaceId}`,
      providesTags: ['Item'],
    }),
    createItem: builder.mutation<{ item: ItemType }, { boardId: string; body: { title: string; columnId: string; type: string; priority: string; assignee?: string; startDate?: string | null; dueDate?: string | null; description?: string } }>({
      query: ({ boardId, body }) => ({
        url: `/boards/${boardId}/items`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Item', 'Activity'],
    }),
    updateItem: builder.mutation<{ item: ItemType }, { id: string; body: Partial<ItemType> }>({
      query: ({ id, body }) => ({
        url: `/items/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Item', 'Activity'],
    }),
    deleteItem: builder.mutation<void, string>({
      query: (id) => ({
        url: `/items/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Item', 'Activity'],
    }),
    // SINGLE ITEM FETCH
    getItem: builder.query<{ item: ItemType }, string>({
      query: (id) => `/items/${id}`,
      providesTags: ['Item'],
    }),

    // ACTIVITY FEED / AUDIT SYSTEM
    getWorkspaceActivity: builder.query<{ success: boolean; total: number; page: number; limit: number; totalPages: number; activities: any[] }, { workspaceId: string; page?: number; limit?: number }>({
      query: ({ workspaceId, page = 1, limit = 20 }) => `/activity/workspace/${workspaceId}?page=${page}&limit=${limit}`,
      providesTags: ['Activity'],
    }),
    getTaskHistory: builder.query<{ success: boolean; count: number; activities: any[] }, string>({
      query: (taskId) => `/activity/task/${taskId}`,
      providesTags: ['Activity'],
    }),
    getUserContributions: builder.query<{ success: boolean; totalContributions: number; dailyActivity: any[] }, string>({
      query: (userId) => `/activity/user/${userId}/contributions`,
      providesTags: ['Activity'],
    }),
    getUserActivity: builder.query<{ success: boolean; total: number; page: number; limit: number; totalPages: number; activities: any[] }, { userId: string; date?: string; page?: number; limit?: number }>({
      query: ({ userId, date, page = 1, limit = 50 }) => {
        const url = `/activity/user/${userId}?page=${page}&limit=${limit}${date ? `&date=${date}` : ''}`;
        return url;
      },
      providesTags: ['Activity'],
    }),
    getWorkspaceMembers: builder.query<{ members: any[]; invitations: any[] }, string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/members`,
      providesTags: ['Workspace'],
    }),
    getUserProfile: builder.query<{ success: boolean; user: any }, string>({
      query: (userId) => `/users/${userId}/profile`,
    }),

    // NOTIFICATIONS
    getNotifications: builder.query<{ notifications: any[]; count: number; page: number; totalPages: number }, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 15 }) => `/notifications?page=${page}&limit=${limit}`,
      providesTags: ['Notification'],
    }),
    getUnreadCount: builder.query<{ count: number }, void>({
      query: () => '/notifications/unread-count',
      providesTags: ['Notification'],
    }),
    markAsRead: builder.mutation<{ success: boolean; notification: any }, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    markAllAsRead: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),
    deleteNotification: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Notification'],
    }),

    // ANNOUNCEMENTS
    createAnnouncement: builder.mutation<{ success: boolean; announcement: any }, { title: string; message: string; workspaceId: string }>({
      query: (body) => ({
        url: '/announcements',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Notification'],
    }),

    // USER NOTIFICATION PREFERENCES
    getPreferences: builder.query<{ success: boolean; preference: any }, void>({
      query: () => '/notifications/preferences',
      providesTags: ['Notification'],
    }),
    updatePreferences: builder.mutation<{ success: boolean; preference: any }, Partial<{ emailMentions: boolean; emailAssignments: boolean; emailReminders: boolean; emailAnnouncements: boolean; pushEnabled: boolean; soundEnabled: boolean }>>({
      query: (body) => ({
        url: '/notifications/preferences',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Notification'],
    }),

    // MILESTONES
    getMilestones: builder.query<{ success: boolean; milestones: any[] }, string>({
      query: (workspaceId) => `/milestones?workspaceId=${workspaceId}`,
      providesTags: ['Milestone'],
    }),
    getMilestone: builder.query<{ success: boolean; milestone: any }, string>({
      query: (id) => `/milestones/${id}`,
      providesTags: ['Milestone'],
    }),
    createMilestone: builder.mutation<{ success: boolean; milestone: any }, any>({
      query: (body) => ({
        url: '/milestones',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Milestone', 'Activity'],
    }),
    updateMilestone: builder.mutation<{ success: boolean; milestone: any }, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/milestones/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Milestone', 'Activity'],
    }),
    deleteMilestone: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/milestones/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Milestone', 'Activity', 'Item'],
    }),
    getMilestoneAnalytics: builder.query<{ success: boolean; milestone: string; stats: any; tasks: any[]; workload: any }, string>({
      query: (id) => `/milestones/${id}/analytics`,
      providesTags: ['Milestone', 'Item'],
    }),

    // LABELS
    getLabels: builder.query<{ success: boolean; labels: any[] }, string>({
      query: (workspaceId) => `/labels?workspaceId=${workspaceId}`,
      providesTags: ['Label'],
    }),
    createLabel: builder.mutation<{ success: boolean; label: any }, any>({
      query: (body) => ({
        url: '/labels',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Label'],
    }),
    updateLabel: builder.mutation<{ success: boolean; label: any }, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/labels/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Label', 'Item'],
    }),
    deleteLabel: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/labels/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Label', 'Item'],
    }),

    // SAVED VIEWS
    getSavedViews: builder.query<{ success: boolean; views: any[] }, string>({
      query: (workspaceId) => `/saved-views?workspaceId=${workspaceId}`,
      providesTags: ['SavedView'],
    }),
    createSavedView: builder.mutation<{ success: boolean; view: any }, any>({
      query: (body) => ({
        url: '/saved-views',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SavedView'],
    }),
    updateSavedView: builder.mutation<{ success: boolean; view: any }, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/saved-views/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['SavedView'],
    }),
    deleteSavedView: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({
        url: `/saved-views/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SavedView'],
    }),

    getDashboardAnalytics: builder.query<any, string>({
      query: (workspaceId) => `/analytics/dashboard?workspaceId=${workspaceId}`,
      providesTags: ['Item', 'Milestone', 'Label'],
    }),
    getWorkspaceOverview: builder.query<{
      success: boolean;
      totalBoards: number;
      totalTasks: number;
      completedTasks: number;
      workspaceProgress: number;
      activeMilestones: number;
      totalLabels: number;
      totalMembers: number;
      recentActivityCount: number;
    }, { workspaceId: string; timeframe?: string }>({
      query: ({ workspaceId, timeframe }) =>
        `/analytics/overview?workspaceId=${workspaceId}${timeframe ? `&timeframe=${timeframe}` : ""}`,
      providesTags: ['Item', 'Board', 'Milestone', 'Label', 'Activity'],
    }),

    // GLOBAL SEARCH
    globalSearch: builder.query<{
      success: boolean;
      results: {
        workspaces: any[];
        boards: any[];
        tasks: any[];
        subtasks: any[];
        users: any[];
        analytics: any[];
      };
      totalCount: number;
    }, { query: string; workspaceId?: string; limit?: number; page?: number }>({
      query: ({ query, workspaceId, limit = 5, page = 1 }) =>
        `/search?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}${workspaceId ? `&workspaceId=${workspaceId}` : ''}`,
    }),
  }),
});

export const {
  useGetWorkspacesQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useGetBoardsQuery,
  useGetBoardQuery,
  useCreateBoardMutation,
  useUpdateBoardMutation,
  useDeleteBoardMutation,
  useInviteBoardMemberMutation,
  useGetBoardItemsQuery,
  useCreateItemMutation,
  useUpdateItemMutation,
  useDeleteItemMutation,
  useGetWorkspaceActivityQuery,
  useGetTaskHistoryQuery,
  useGetUserContributionsQuery,
  useGetUserActivityQuery,
  useGetWorkspaceMembersQuery,
  useGetUserProfileQuery,
  useGetItemQuery,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useCreateAnnouncementMutation,
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
  useGetMilestonesQuery,
  useGetMilestoneQuery,
  useCreateMilestoneMutation,
  useUpdateMilestoneMutation,
  useDeleteMilestoneMutation,
  useGetMilestoneAnalyticsQuery,
  useGetLabelsQuery,
  useCreateLabelMutation,
  useUpdateLabelMutation,
  useDeleteLabelMutation,
  useGetSavedViewsQuery,
  useCreateSavedViewMutation,
  useUpdateSavedViewMutation,
  useDeleteSavedViewMutation,
  useGetDashboardAnalyticsQuery,
  useGetWorkspaceOverviewQuery,
  useGetWorkspaceItemsQuery,
  useGlobalSearchQuery,
} = backendApi;

