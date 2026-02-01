import { createSlice } from "@reduxjs/toolkit";

const loginSlice = createSlice({
       name:'user',
       initialState:{
              userId:null,
              userName:null,
              pic:null,
              email:null,
              accessToken:null,

       },
       reducers:{
              storeUser:(state,action)=>{
                   state.userId = action.payload.id
                   state.userName = action.payload.name
                   state.pic = action.payload.pic
                   state.email = action.payload.email
                   state.accessToken = action.payload.accessToken
              },
              updateAccessToken:(state,action)=>{
                   state.accessToken = action.payload
              },
              clearUser:(state)=>{
                   state.userId = null
                   state.userName = null
                   state.pic = null
                   state.email = null
                   state.accessToken = null
              }
       }
})
 
export const {storeUser, updateAccessToken, clearUser} = loginSlice.actions
export default loginSlice.reducer