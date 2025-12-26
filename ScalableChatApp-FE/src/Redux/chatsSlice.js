import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
  name: 'selectedChat',
  initialState: {
    chats: [],
    reloadChat:null
  },
  reducers: {
    setChat: (state, action) => {
      state.chats.push(action.payload)
    },
    reloadChat: (state, action) => {
      state.reloadChat = action.payload
    },
  },
});

export const { setChat } = chatSlice.actions;
export default chatSlice.reducer;
