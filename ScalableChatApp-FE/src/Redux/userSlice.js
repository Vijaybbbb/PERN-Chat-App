import { createSlice } from "@reduxjs/toolkit";

const loginSlice = createSlice({
       name:'user',
       initialState:{
              userId:null,
              userName:null,
              pic:null,

       },
       reducers:{
              storeUser:(state,action)=>{
                   state.userId = action.payload.id
                   state.userName = action.payload.name
                   state.pic = action.payload.pic
              },
             
       }
})
 
export const {storeUser} = loginSlice.actions
export default loginSlice.reducer