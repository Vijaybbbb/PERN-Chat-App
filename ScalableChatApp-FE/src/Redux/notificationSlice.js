import { createSlice } from "@reduxjs/toolkit";

const notificationSlice = createSlice({
       name:'user',
       initialState:{
              notification:[],

       },
       reducers:{
              setNotification:(state,action)=>{
                     state.notification = action.payload
              },
              removeNotification(state, action) {
                     const notificationId = action.payload; // Extract the ID for clarity
                     state.notification = state.notification.filter(
                       (notification) => notification.id !== notificationId
                     ); // Use filter for efficient removal based on ID
              },
             
       }
})
 
export const {setNotification,removeNotification} = notificationSlice.actions
export default notificationSlice.reducer