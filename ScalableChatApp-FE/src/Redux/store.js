import { configureStore, combineReducers } from '@reduxjs/toolkit';
import userDetails from './userSlice';
import selectedChatDetails from './selectedChatSlice'
import chatDetails from './chatsSlice'
import notificationDetails from './notificationSlice'


const rootReducer = combineReducers({
  userDetails,
  selectedChatDetails,
  chatDetails,
  notificationDetails
});

export const store = configureStore({
  reducer: rootReducer,
});

