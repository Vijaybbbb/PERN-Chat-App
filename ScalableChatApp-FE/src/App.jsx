import { useLayoutEffect } from 'react'
import './App.css'
import {Route, RouterProvider, Routes, createBrowserRouter} from 'react-router-dom'
import HomePage from './Pages/HomePage/HomePage'
import ChatPage from './Pages/ChatPage/ChatPage'
import { useSelector } from 'react-redux'

const THEME_VARIABLES = {
  light: {
    '--bg-primary': '#ffffff',
    '--bg-secondary': '#f4f7fb',
    '--text-primary': '#172033',
    '--text-secondary': '#6d7890',
    '--border-color': '#e4eaf2',
    '--app-bg': '#edf3f9',
    '--surface-raised': 'rgba(255, 255, 255, 0.88)',
    '--surface-soft': '#f7f9fc',
    '--accent': '#249bd9',
    '--accent-strong': '#126fa3',
    '--accent-soft': '#e8f6ff',
    '--shadow-sm': '0 4px 18px rgba(31, 52, 79, 0.06)',
    '--shadow-md': '0 14px 40px rgba(31, 52, 79, 0.1)',
  },
  dark: {
    '--bg-primary': '#182232',
    '--bg-secondary': '#202d40',
    '--text-primary': '#f4f7fb',
    '--text-secondary': '#a7b4c7',
    '--border-color': '#314056',
    '--app-bg': '#0d1522',
    '--surface-raised': 'rgba(24, 34, 50, 0.94)',
    '--surface-soft': '#1c293b',
    '--accent': '#55bdf2',
    '--accent-strong': '#8bd7ff',
    '--accent-soft': 'rgba(85, 189, 242, 0.14)',
    '--shadow-sm': '0 4px 18px rgba(0, 0, 0, 0.18)',
    '--shadow-md': '0 18px 45px rgba(0, 0, 0, 0.28)',
  },
}


function App() {
  const { isDarkMode } = useSelector(state => state.darkMode)
  
  useLayoutEffect(() => {
    const root = document.documentElement
    const mode = isDarkMode ? 'dark' : 'light'
    root.setAttribute('data-theme', mode)
    root.style.colorScheme = mode
    Object.entries(THEME_VARIABLES[mode]).forEach(([name, value]) => {
      root.style.setProperty(name, value)
    })
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
