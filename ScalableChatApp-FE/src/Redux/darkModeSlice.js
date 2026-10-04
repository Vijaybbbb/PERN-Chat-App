import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  // Dark mode is the product default; the toolbar toggle can still switch
  // the current session back to the light palette.
  isDarkMode: true
}

export const darkModeSlice = createSlice({
  name: 'darkMode',
  initialState,
  reducers: {
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode
    }
  }
})

export const { toggleDarkMode } = darkModeSlice.actions
export default darkModeSlice.reducer
