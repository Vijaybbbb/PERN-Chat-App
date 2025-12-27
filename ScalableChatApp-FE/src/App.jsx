import { useState, useEffect } from 'react'
import './App.css'
import {Route, RouterProvider, Routes, createBrowserRouter} from 'react-router-dom'
import HomePage from './Pages/HomePage/HomePage'
import ChatPage from './Pages/ChatPage/ChatPage'
import { useSelector } from 'react-redux'


function App() {
  const [count, setCount] = useState(0)
  const { isDarkMode } = useSelector(state => state.darkMode)
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])
  
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
