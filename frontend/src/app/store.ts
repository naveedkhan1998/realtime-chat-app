// store.ts

import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { baseApi } from "@/services/baseApi";
import authReducer from "@/features/authSlice";
import errorReducer from "@/features/errorSlice";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer, // Use the base API reducer
    auth: authReducer,
    error: errorReducer,
    // Add other reducers here
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }).concat(baseApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
