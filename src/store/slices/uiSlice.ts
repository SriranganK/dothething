import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type TabType = 'workspaces';

export type ViewType =
  | { type: 'dashboard' }
  | { type: 'board'; boardId: string }
  | { type: 'workspace-profile' }
  | { type: 'user-profile'; userId?: string }
  | { type: 'milestones' }
  | { type: 'milestone-details'; milestoneId: string }
  | { type: 'labels' }
  | { type: 'timeline' }
  | { type: 'my-tasks' }
  | { type: 'calendar' };

interface UIState {
  activeTab: TabType;
  activeView: ViewType;
  showCreateModal: boolean;
  showBoardCreateModal: boolean;
  showSettingsModal: boolean;
  settingsName: string;
  settingsTheme: 'light' | 'dark' | 'auto';
  autoMode: 'time' | 'system';
  lightStartHour: number;
  darkStartHour: number;
  notifyEmail: boolean;
  activeWorkspaceId: string | null;
}

const getStoredWorkspaceId = () => {
  try {
    return localStorage.getItem('activeWorkspaceId');
  } catch {
    return null;
  }
};

const getStoredTheme = (): 'light' | 'dark' | 'auto' => {
  try {
    return (localStorage.getItem('theme') as any) || 'light';
  } catch {
    return 'light';
  }
};

const getStoredAutoMode = (): 'time' | 'system' => {
  try {
    return (localStorage.getItem('autoMode') as any) || 'time';
  } catch {
    return 'time';
  }
};

const getStoredLightStart = (): number => {
  try {
    const val = localStorage.getItem('lightStartHour');
    return val ? parseInt(val, 10) : 6;
  } catch {
    return 6;
  }
};

const getStoredDarkStart = (): number => {
  try {
    const val = localStorage.getItem('darkStartHour');
    return val ? parseInt(val, 10) : 18;
  } catch {
    return 18;
  }
};

const initialState: UIState = {
  activeTab: 'workspaces',
  activeView: { type: 'dashboard' },
  showCreateModal: false,
  showBoardCreateModal: false,
  showSettingsModal: false,
  settingsName: '',
  settingsTheme: getStoredTheme(),
  autoMode: getStoredAutoMode(),
  lightStartHour: getStoredLightStart(),
  darkStartHour: getStoredDarkStart(),
  notifyEmail: true,
  activeWorkspaceId: getStoredWorkspaceId(),
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<TabType>) {
      state.activeTab = action.payload;
    },
    setActiveView(state, action: PayloadAction<ViewType>) {
      state.activeView = action.payload;
    },
    setShowCreateModal(state, action: PayloadAction<boolean>) {
      state.showCreateModal = action.payload;
    },
    setShowBoardCreateModal(state, action: PayloadAction<boolean>) {
      state.showBoardCreateModal = action.payload;
    },
    setShowSettingsModal(state, action: PayloadAction<boolean>) {
      state.showSettingsModal = action.payload;
    },
    setActiveWorkspaceId(state, action: PayloadAction<string | null>) {
      state.activeWorkspaceId = action.payload;
      try {
        if (action.payload) {
          localStorage.setItem('activeWorkspaceId', action.payload);
        } else {
          localStorage.removeItem('activeWorkspaceId');
        }
      } catch (err) {
        console.error('Failed to update activeWorkspaceId in localStorage:', err);
      }
    },
    updateSettings(
      state,
      action: PayloadAction<{
        name?: string;
        theme?: 'light' | 'dark' | 'auto';
        autoMode?: 'time' | 'system';
        lightStartHour?: number;
        darkStartHour?: number;
        notifyEmail?: boolean;
      }>
    ) {
      if (action.payload.name !== undefined) state.settingsName = action.payload.name;
      if (action.payload.theme !== undefined) {
        state.settingsTheme = action.payload.theme;
        try {
          localStorage.setItem('theme', action.payload.theme);
        } catch (e) {
          console.error(e);
        }
      }
      if (action.payload.autoMode !== undefined) {
        state.autoMode = action.payload.autoMode;
        try {
          localStorage.setItem('autoMode', action.payload.autoMode);
        } catch (e) {
          console.error(e);
        }
      }
      if (action.payload.lightStartHour !== undefined) {
        state.lightStartHour = action.payload.lightStartHour;
        try {
          localStorage.setItem('lightStartHour', String(action.payload.lightStartHour));
        } catch (e) {
          console.error(e);
        }
      }
      if (action.payload.darkStartHour !== undefined) {
        state.darkStartHour = action.payload.darkStartHour;
        try {
          localStorage.setItem('darkStartHour', String(action.payload.darkStartHour));
        } catch (e) {
          console.error(e);
        }
      }
      if (action.payload.notifyEmail !== undefined) state.notifyEmail = action.payload.notifyEmail;
    },
  },
});

export const {
  setActiveTab,
  setActiveView,
  setShowCreateModal,
  setShowBoardCreateModal,
  setShowSettingsModal,
  setActiveWorkspaceId,
  updateSettings,
} = uiSlice.actions;

export default uiSlice.reducer;
