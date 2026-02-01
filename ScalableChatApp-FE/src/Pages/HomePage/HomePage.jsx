import { Box, Container,Text,TabList, Tab, TabPanels, TabPanel, Tabs, Button, HStack } from '@chakra-ui/react'
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Login from '../../Componets/Login/Login'
import Signup from '../../Componets/Signup/Signup'
import DarkModeToggle from '../../Componets/DarkModeToggle/DarkModeToggle'
import { isAuthenticated } from '../../utils/auth'

const HomePage = () => {
  const { isDarkMode } = useSelector(state => state.darkMode)
  const { userId } = useSelector(state => state.userDetails)
  const navigate = useNavigate()
  
  useEffect(() => {
    // Check if user is already authenticated
    if (userId || isAuthenticated()) {
      navigate('/chats')
    }
  }, [userId, navigate])
  
  const openAdminPanel = () => {
    window.open('http://localhost:4005/admin', '_blank');
  };

  return (

    <Container maxWidth={'xl'} centerContent>

      <Box
        d='flex'
        justifyContent='center'
        textAlign={'center'}
        p={3} 
        bg={isDarkMode ? 'var(--bg-primary)' : 'white'}
        color={isDarkMode ? 'var(--text-primary)' : 'black'}
        w={'100%'}
        m={'40px 0 15px 0 '}
        borderRadius={'lg'}
        borderWidth={'1px'}
        borderColor={isDarkMode ? 'var(--border-color)' : 'gray.200'}
        >
        <HStack justify="space-between" w="100%">
          <Box flex={1} display="flex" justifyContent="flex-start">
            <DarkModeToggle />
          </Box>
          <Text fontSize={'4xl'} fontStyle={'Work sans'}>Chat Line</Text>
          <Box flex={1} display="flex" justifyContent="flex-end">
            <Button 
              size="sm" 
              colorScheme="red" 
              variant="outline"
              onClick={openAdminPanel}
            >
              Admin
            </Button>
          </Box>
        </HStack>
      </Box>

      <Box 
        bg={isDarkMode ? 'var(--bg-primary)' : 'white'} 
        color={isDarkMode ? 'var(--text-primary)' : 'black'}
        p={4} 
        borderRadius={'lg'} 
        borderWidth={'1px'} 
        borderColor={isDarkMode ? 'var(--border-color)' : 'gray.200'}
        w={'100%'}
      >
        <Tabs variant='soft-rounded' >
          <TabList>
            <Tab width={'50%'}>Login</Tab>
            <Tab width={'50%'}>Sign up</Tab>
          </TabList>
          <TabPanels>

            <TabPanel>
                      <Login/>  
            </TabPanel>


            <TabPanel>
                       <Signup/>
            </TabPanel>


          </TabPanels>
        </Tabs>

      </Box>

    </Container>

  )
}

export default HomePage
