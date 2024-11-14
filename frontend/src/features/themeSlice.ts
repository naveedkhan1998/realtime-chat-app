import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ThemeState {
  theme: "light" | "dark";
}

const initialState: ThemeState = {
  theme: "light",
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setThemeRedux: (state, action: PayloadAction<"light" | "dark">) => {
      state.theme = action.payload;
    },
  },
});

export const { setThemeRedux } = themeSlice.actions;
export default themeSlice.reducer;
