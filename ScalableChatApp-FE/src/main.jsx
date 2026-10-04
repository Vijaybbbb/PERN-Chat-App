import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { Provider } from 'react-redux'
import { store } from './Redux/store.js'

const theme = extendTheme({
  fonts: {
    heading: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  colors: {
    brand: {
      50: '#eef9ff', 100: '#d8f1ff', 200: '#b8e5ff', 300: '#89d5ff',
      400: '#52bdf5', 500: '#249bd9', 600: '#147db7', 700: '#126491',
      800: '#145477', 900: '#164664',
    },
  },
  styles: {
    global: {
      'html, body, #root': { minHeight: '100%' },
      body: { bg: 'var(--app-bg)', color: 'var(--text-primary)' },
    },
  },
  components: {
    Button: {
      baseStyle: { borderRadius: '12px', fontWeight: 700, transition: 'all 160ms ease' },
      defaultProps: { colorScheme: 'brand' },
    },
    Input: { defaultProps: { focusBorderColor: 'brand.400' } },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(

  <ChakraProvider theme={theme}>
    <Provider store={store}>

        <App />
   
    </Provider>
  </ChakraProvider> 

)

