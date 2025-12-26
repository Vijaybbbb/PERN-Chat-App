import { useState } from 'react'
import './App.css'
import {Route, RouterProvider, Routes, createBrowserRouter} from 'react-router-dom'
import HomePage from './Pages/HomePage/HomePage'
import ChatPage from './Pages/ChatPage/ChatPage'


function App() {
  const [count, setCount] = useState(0)
  const router = createBrowserRouter([
    {
      path:'/',
      element:<HomePage/>
    },
    {
      path:'/chats',
      element:<ChatPage/>
    },
    
  
  ])
  return (
    <div className='App'>
      <RouterProvider router={router}>
      </RouterProvider>   
    </div>   
  ) 
}

export default App
