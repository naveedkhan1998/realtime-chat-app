// store.ts

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { baseApi } from '@/services/baseApi';
import authReducer from '@/features/authSlice';
import errorReducer from '@/features/errorSlice';
import themeReducer from '@/features/themeSlice';
import uiReducer from '@/features/uiSlice';
import unifiedChatReducer from '@/features/unifiedChatSlice';
import notificationSettingsReducer from '@/features/notificationSettingsSlice';

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer, // Use the base API reducer
    auth: authReducer,
    error: errorReducer,
    theme: themeReducer,
    unifiedChat: unifiedChatReducer,
    ui: uiReducer,
    notificationSettings: notificationSettingsReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({ serializableCheck: false }).concat(
      baseApi.middleware
    ),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
