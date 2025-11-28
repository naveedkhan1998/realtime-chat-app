/**
 * Notification Settings Slice - Manages user notification preferences.
 *
 * Features:
 * - Sound notifications (play a sound on new messages)
 * - Desktop notifications (browser push notifications)
 * - Settings persist to localStorage per user (keyed by user ID)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';

// ==================== Types ====================

interface NotificationSettingsState {
  soundEnabled: boolean;
  desktopEnabled: boolean;
  desktopPermission: NotificationPermission | 'unsupported';
  currentUserId: number | null; // Track which user's settings are loaded
}

// ==================== Helper Functions ====================

// Get the storage key for a specific user
const getStorageKey = (key: string, userId: number | null): string => {
  if (userId) {
    return `user_${userId}_${key}`;
  }
  return key; // Fallback for when user ID isn't available yet
};

const getSoundEnabled = (userId: number | null): boolean => {
  const stored = localStorage.getItem(getStorageKey('notificationSoundEnabled', userId));
  return stored !== 'false'; // Default to true
};

const getDesktopEnabled = (userId: number | null): boolean => {
  const stored = localStorage.getItem(getStorageKey('desktopNotificationsEnabled', userId));
  if (stored === null) {
    // If no preference stored, default to true if permission is already granted
    return (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    );
  }
  return stored === 'true';
};

const getDesktopPermission = (): NotificationPermission | 'unsupported' => {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
};

// ==================== Initial State ====================

// Initial state uses defaults - will be loaded per user when they log in
const initialState: NotificationSettingsState = {
  soundEnabled: true,
  desktopEnabled: false,
  desktopPermission: getDesktopPermission(),
  currentUserId: null,
};

// ==================== Slice ====================

const notificationSettingsSlice = createSlice({
  name: 'notificationSettings',
  initialState,
  reducers: {
    // Load settings for a specific user (call on login)
    loadUserSettings(state, action: PayloadAction<number>) {
      const userId = action.payload;
      state.currentUserId = userId;
      state.soundEnabled = getSoundEnabled(userId);
      state.desktopEnabled = getDesktopEnabled(userId);
      state.desktopPermission = getDesktopPermission();
    },

    // Clear settings on logout (reset to defaults)
    clearUserSettings(state) {
      state.currentUserId = null;
      state.soundEnabled = true;
      state.desktopEnabled = false;
      state.desktopPermission = getDesktopPermission();
    },

    setSoundEnabled(state, action: PayloadAction<boolean>) {
      state.soundEnabled = action.payload;
      localStorage.setItem(
        getStorageKey('notificationSoundEnabled', state.currentUserId),
        String(action.payload)
      );
    },

    setDesktopEnabled(state, action: PayloadAction<boolean>) {
      state.desktopEnabled = action.payload;
      localStorage.setItem(
        getStorageKey('desktopNotificationsEnabled', state.currentUserId),
        String(action.payload)
      );
    },

    setDesktopPermission(
      state,
      action: PayloadAction<NotificationPermission | 'unsupported'>
    ) {
      state.desktopPermission = action.payload;
      // If permission is denied, also disable desktop notifications
      if (action.payload === 'denied') {
        state.desktopEnabled = false;
        localStorage.setItem(
          getStorageKey('desktopNotificationsEnabled', state.currentUserId),
          'false'
        );
      }
    },

    // Initialize from browser state (useful after permission request)
    refreshDesktopPermission(state) {
      state.desktopPermission = getDesktopPermission();
    },
  },
});

// ==================== Selectors ====================

export const selectNotificationSettings = (state: RootState) =>
  state.notificationSettings;

export const selectSoundEnabled = (state: RootState) =>
  state.notificationSettings.soundEnabled;

export const selectDesktopEnabled = (state: RootState) =>
  state.notificationSettings.desktopEnabled;

export const selectDesktopPermission = (state: RootState) =>
  state.notificationSettings.desktopPermission;

// Computed selector: Can we actually show desktop notifications?
export const selectCanShowDesktopNotifications = (state: RootState) => {
  const { desktopEnabled, desktopPermission } = state.notificationSettings;
  return desktopEnabled && desktopPermission === 'granted';
};

// ==================== Exports ====================

export const {
  loadUserSettings,
  clearUserSettings,
  setSoundEnabled,
  setDesktopEnabled,
  setDesktopPermission,
  refreshDesktopPermission,
} = notificationSettingsSlice.actions;

export default notificationSettingsSlice.reducer;
