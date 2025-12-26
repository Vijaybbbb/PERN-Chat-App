import { Box, Container,Text,TabList, Tab, TabPanels, TabPanel, Tabs, Button, HStack } from '@chakra-ui/react'
import React from 'react'
import Login from '../../Componets/Login/Login'
import Signup from '../../Componets/Signup/Signup'

const HomePage = () => {
  
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
        bg={'white'}
        w={'100%'}
        m={'40px 0 15px 0 '}
        borderRadius={'lg'}
        borderWidth={'1px'}
        >
        <HStack justify="space-between" w="100%">
          <Box flex={1}></Box>
          <Text fontSize={'4xl'} fontStyle={'Work sans'} color={'black'}>Chat Line</Text>
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

      <Box bg={'white'} p={4} borderRadius={'lg'} borderWidth={'1px'} w={'100%'}>
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
