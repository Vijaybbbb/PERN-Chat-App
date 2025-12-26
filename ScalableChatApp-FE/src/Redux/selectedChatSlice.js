import { createSlice } from "@reduxjs/toolkit";

const selectedChatSlice = createSlice({
  name: 'selectedChat',
  initialState: {
    selectedChat: null,
  },
  reducers: {
    setSelectedChat: (state, action) => {
      state.selectedChat = action.payload;
    },
  },
});

export const { setSelectedChat } = selectedChatSlice.actions;
export default selectedChatSlice.reducer;
