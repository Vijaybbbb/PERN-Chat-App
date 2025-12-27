import { configureStore, combineReducers } from '@reduxjs/toolkit';
import userDetails from './userSlice';
import selectedChatDetails from './selectedChatSlice'
import chatDetails from './chatsSlice'
import notificationDetails from './notificationSlice'
import darkMode from './darkModeSlice'


const rootReducer = combineReducers({
  userDetails,
  selectedChatDetails,
  chatDetails,
  notificationDetails,
  darkMode
});

export const store = configureStore({
  reducer: rootReducer,
});

