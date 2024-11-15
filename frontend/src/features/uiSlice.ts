import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  showNavbar: true,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleNavbar: (state) => {
      state.showNavbar = !state.showNavbar;
    },
    setNavbarVisibility: (state, action) => {
      state.showNavbar = action.payload;
    },
  },
});

export const { toggleNavbar, setNavbarVisibility } = uiSlice.actions;
export default uiSlice.reducer;
